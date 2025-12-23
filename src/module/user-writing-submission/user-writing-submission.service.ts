import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserWritingSubmissionDto } from './dto/create-user-writing-submission.dto';
import { UpdateUserWritingSubmissionDto } from './dto/update-user-writing-submission.dto';
import { DatabaseService } from 'src/database/database.service';
import { GoogleGenAI } from '@google/genai';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

type CorrectionDetail = {
  mistake: string;
  correct: string;
  explanation: string;
  type: string; //Loại lỗi
};

type AIFeedbackResult = {
  score: number;
  task_response: string;
  coherence_and_cohesion: string;
  lexical_resource: string;
  grammatical_range_and_accuracy: string;
  general_feedback: string;
  detailed_corrections: CorrectionDetail[];
};

@Injectable()
export class UserWritingSubmissionService {
  constructor(
    private readonly databaseService: DatabaseService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly configService: ConfigService,
  ) { }

  private getAIInstance(): GoogleGenAI {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      console.error('GEMINI_API_KEY is missing');
      throw new BadRequestException('AI API key is not configured');
    }
    return new GoogleGenAI({ apiKey });
  }

  //Tạo submission + gọi AI chấm điểm
  async createUserWritingSubmission(
    idTestResult: string,
    createUserWritingSubmissionDto: CreateUserWritingSubmissionDto,
  ) {
    const { idUser, idWritingTask, submission_text } =
      createUserWritingSubmissionDto;

    const [user, writingTask, testRestult] = await Promise.all([
      this.databaseService.user.findUnique({ where: { idUser } }),
      this.databaseService.writingTask.findUnique({ where: { idWritingTask }, include: { test: true } }),
    ]);

    if (!user) throw new NotFoundException('User not found');
    if (!writingTask) throw new NotFoundException('Writing task not found');
    if (!testRestult) throw new NotFoundException('Test result not found');

    let aiResult: AIFeedbackResult;

    if (writingTask.image) {
      aiResult = await this.evaluateWriting(
        submission_text,
        writingTask.title,
        writingTask.image,
      );
    } else {
      aiResult = await this.evaluateWriting(submission_text, writingTask.title);
    }

    const data = await this.databaseService.$transaction(async (tx) => {
      const testResult = await tx.userTestResult.create({
        data: {
          idUser,
          idTest: writingTask.test.idTest,
          band_score: aiResult.score,
          level: writingTask.test.level,
          status: 'FINISHED',
        }
      })

      const submission = await tx.userWritingSubmission.create({
        data: {
          idUser,
          idWritingTask,
          idTestResult: testResult.idTestResult,
          submission_text,
          status: 'GRADED',
        },
      });

      const feedback = await tx.feedback.create({
        data: {
          idWritingSubmission: submission.idWritingSubmission,
          taskResponse: aiResult.task_response,
          coherenceAndCohesion: aiResult.coherence_and_cohesion,
          lexicalResource: aiResult.lexical_resource,
          grammaticalRangeAndAccuracy: aiResult.grammatical_range_and_accuracy,
          generalFeedback: aiResult.general_feedback,
          detailedCorrections: aiResult.detailed_corrections ?? [],
        },
      });

      return { ...submission, feedback };
    });

    return {
      submissionId: data.idWritingSubmission,
      score: aiResult.score,
      submission_text: data.submission_text,
      feedback: data.feedback,
      status: 200,
    };
  }

  // HÀM CHẤM BÀI BẰNG GEMINI
  async evaluateWriting(
    submissionText: string,
    writingPrompt: string,
    imageUrl?: string,
  ): Promise<AIFeedbackResult> {
    const cacheKey = `writing-feedback:${submissionText.trim()}:${writingPrompt.trim()}:${imageUrl ?? 'no-image'}`;
    const cachedData = await this.cacheManager.get<AIFeedbackResult>(cacheKey);

    if (cachedData) {
      console.log('Cache HIT!');
      return cachedData;
    }

    const prompt = this.buildPrompt(submissionText, writingPrompt, !!imageUrl);
    const ai = this.getAIInstance();

    try {
      const parts: any[] = [{ text: prompt }];

      if (imageUrl) {
        const imagePart = await this.fileToGenerativePart(imageUrl);
        if (imagePart) parts.push(imagePart);
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts,
          },
        ],
      });

      const rawText = response.text?.trim() ?? '';
      const clean = rawText
        .replace(/```json/i, '')
        .replace(/```/g, '')
        .trim();

      let parsed: AIFeedbackResult;
      try {
        parsed = JSON.parse(clean);
      } catch (err) {
        console.error('JSON parse error from Gemini:', err);
        throw new BadRequestException('Invalid AI response format');
      }

      // Lưu vào cache 1 giờ
      await this.cacheManager.set(cacheKey, parsed, 3600);
      return parsed;
    } catch (error) {
      console.error('AI evaluation failed:', error);
      throw new BadRequestException('AI evaluation failed.');
    }
  }

  private async fileToGenerativePart(url: string) {
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const b64 = Buffer.from(response.data).toString('base64');
      const mimeType = response.headers['content-type'] || 'image/jpeg';

      return {
        inlineData: {
          data: b64,
          mimeType,
        },
      };
    } catch (error) {
      console.error('Failed to fetch image from URL:', url);
      return null;
    }
  }

  // Lấy toàn bộ submissions theo user
  async findAllByIdUser(idUser: string) {
    const submissions = await this.databaseService.userWritingSubmission.findMany({
      where: { idUser },
      orderBy: { submitted_at: 'desc' },
      include: {
        writingTask: {
          select: { title: true, task_type: true }
        },
        userTestResults: {
          select: {
            band_score: true,
            idTest: true
          }
        },
        feedback: {
          orderBy: { gradedAt: 'desc' },
          take: 1,
          select: { generalFeedback: true }
        },
      },
    });

    const data = submissions.map(sub => ({
      idWritingSubmission: sub.idWritingSubmission,
      taskTitle: sub.writingTask?.title,
      submittedAt: sub.submitted_at,
      status: sub.status,
      bandScore: sub.userTestResults?.band_score ?? 0, // <--- ĐÃ SỬA
      generalFeedback: sub.feedback[0]?.generalFeedback
    }));

    return {
      message: 'User writing submissions retrieved successfully',
      data,
      status: 200,
    };
  }

  async findOne(idWritingSubmission: string) {
    const submission = await this.databaseService.userWritingSubmission.findUnique({
      where: { idWritingSubmission },
      include: {
        writingTask: true,
        user: { select: { idUser: true, nameUser: true, avatar: true } },
        feedback: { orderBy: { gradedAt: 'desc' } },
        userTestResults: {
          select: { band_score: true }
        }
      },
    });

    if (!submission) throw new BadRequestException('Submission not found');

    return {
      message: 'Details retrieved successfully',
      data: {
        ...submission,
        band_score: submission.userTestResults?.band_score ?? 0
      },
      status: 200,
    };
  }

  // Cập nhật submission (chấm lại nếu cần)
  async update(
    idWritingSubmission: string,
    updateDto: UpdateUserWritingSubmissionDto,
  ) {
    const submission =
      await this.databaseService.userWritingSubmission.findUnique({
        where: { idWritingSubmission },
        include: {
          writingTask: true,
          //Lấy feedback mới nhất
          feedback: {
            orderBy: {
              gradedAt: 'desc',
            },
            take: 1,
          },
        },
      });

    if (!submission) throw new BadRequestException('Submission not found');

    if (updateDto.status === 'GRADED') {
      const aiResult = await this.evaluateWriting(
        submission.submission_text,
        submission.writingTask.title,
      );

      const updatedFeedback = await this.databaseService.feedback.create({
        data: {
          idWritingSubmission,
          taskResponse: aiResult.task_response,
          coherenceAndCohesion: aiResult.coherence_and_cohesion,
          lexicalResource: aiResult.lexical_resource,
          grammaticalRangeAndAccuracy: aiResult.grammatical_range_and_accuracy,
          generalFeedback: aiResult.general_feedback,
          detailedCorrections: aiResult.detailed_corrections ?? [],
        },
      });

      return {
        message: 'Submission re-graded successfully',
        data: { ...submission, feedback: updatedFeedback },
      };
    }

    const updatedSubmission =
      await this.databaseService.userWritingSubmission.update({
        where: { idWritingSubmission },
        data: { ...updateDto },
      });

    return {
      message: 'Submission updated successfully',
      data: updatedSubmission,
      status: 200,
    };
  }

  // Xóa submission
  async remove(idWritingSubmission: string) {
    const existing =
      await this.databaseService.userWritingSubmission.findUnique({
        where: { idWritingSubmission },
      });
    if (!existing)
      throw new BadRequestException('User writing submission not found');

    await this.databaseService.userWritingSubmission.delete({
      where: { idWritingSubmission },
    });

    return {
      message: 'User writing submission deleted successfully',
      status: 200,
    };
  }

  // Prompt AI
  // Trong class UserWritingSubmissionService

  private buildPrompt(
    submissionText: string,
    writingPrompt: string,
    hasImage: boolean,
  ): string {
    const taskTypeNote = hasImage
      ? 'This is an IELTS Writing Task 1 (Report). Use the provided image (chart/graph/map) to verify the data accuracy in the essay.'
      : 'This is an IELTS Writing Task 2 (Essay). Evaluate the arguments and ideas.';

    return `
You are a certified IELTS Writing examiner. 
${taskTypeNote}

RULES:
1. Act as a strict but fair IELTS examiner.
2. Follow IELTS public band descriptors.
3. For each of the 4 criteria (TR/TA, CC, LR, GRA), provide detailed feedback.
4. Identify specific mistakes. Provide: original text, correction, and explanation.
5. Return ONLY pure JSON.

JSON OUTPUT FORMAT:
{
  "score": number,
  "task_response": string,
  "coherence_and_cohesion": string,
  "lexical_resource": string,
  "grammatical_range_and_accuracy": string,
  "general_feedback": string,
  "detailed_corrections": [
    {
      "mistake": "string",
      "correct": "string",
      "explanation": "string",
      "type": "Grammar | Lexis | Spelling | Cohesion"
    }
  ]
}

### Writing Prompt:
${writingPrompt}

### Candidate's Essay:
${submissionText}
`;
  }
}
