import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CreateUserWritingSubmissionDto } from './dto/create-user-writing-submission.dto';
import { UpdateUserWritingSubmissionDto } from './dto/update-user-writing-submission.dto';
import { DatabaseService } from 'src/database/database.service';
import { GoogleGenAI } from '@google/genai';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';

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
  ) {}

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
    createUserWritingSubmissionDto: CreateUserWritingSubmissionDto,
  ) {
    const { idUser, idWritingTask, submission_text } =
      createUserWritingSubmissionDto;

    const [user, writingTask] = await Promise.all([
      this.databaseService.user.findUnique({ where: { idUser } }),
      this.databaseService.writingTask.findUnique({ where: { idWritingTask } }),
    ]);

    if (!user) throw new BadRequestException('User not found');
    if (!writingTask) throw new BadRequestException('Writing task not found');

    // Gọi AI chấm điểm
    const aiResult = await this.evaluateWriting(
      submission_text,
      writingTask.title,
    );

    const data = await this.databaseService.$transaction(async (tx) => {
      const submission = await tx.userWritingSubmission.create({
        data: {
          idUser,
          idWritingTask,
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

    const idTest = await this.databaseService.writingTask.findUnique({
      where: {
        idWritingTask,
      },
      include: {
        test: true,
      },
    });

    if (!idTest?.test?.idTest) {
      throw new BadRequestException('Invalid test or missing "de" reference');
    }

    await this.databaseService.userTestResult.create({
      data: {
        idUser,
        idTest: idTest.test.idTest,
        band_score: aiResult.score,
        level: idTest.test.level,
        status: 'FINISHED',
      },
    });

    return {
      message: 'Writing submission created and graded successfully',
      data,
      status: 200,
    };
  }

  // HÀM CHẤM BÀI BẰNG GEMINI
  async evaluateWriting(
    submissionText: string,
    writingPrompt: string,
  ): Promise<AIFeedbackResult> {
    const cacheKey = `writing-feedback:${submissionText.trim()}:${writingPrompt.trim()}`;
    const cachedData = await this.cacheManager.get<AIFeedbackResult>(cacheKey);

    if (cachedData) {
      console.log('⚡️ Cache HIT!');
      return cachedData;
    }

    const prompt = this.buildPrompt(submissionText, writingPrompt);
    const ai = this.getAIInstance();

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
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

  // Lấy toàn bộ submissions theo user
  async findAllByIdUser(idUser: string) {
    const user = await this.databaseService.user.findUnique({
      where: { idUser },
    });
    if (!user) throw new BadRequestException('User not found');

    const data = await this.databaseService.userWritingSubmission.findMany({
      where: { idUser },
      include: {
        writingTask: true,
        feedback: {
          orderBy: { gradedAt: 'desc' },
          take: 1,
        },
      },
    });

    return {
      message: 'User writing submissions retrieved successfully',
      data,
      status: 200,
    };
  }

  // Lấy chi tiết submission
  async findOne(idWritingSubmission: string) {
    const data = await this.databaseService.userWritingSubmission.findUnique({
      where: { idWritingSubmission },
      include: { writingTask: true, user: true },
    });
    if (!data)
      throw new BadRequestException('User writing submission not found');

    return {
      message: 'User writing submission retrieved successfully',
      data,
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

  private buildPrompt(submissionText: string, writingPrompt: string): string {
    return `
You are a certified IELTS Writing examiner with deep knowledge of the official IELTS Writing Band Descriptors. 
Your task is to objectively evaluate the candidate’s essay and provide detailed, constructive feedback.

RULES:
1.  Act as a strict but fair IELTS examiner.
2.  Follow IELTS public band descriptors.
3.  For each of the 4 criteria (TR, CC, LR, GRA), provide detailed feedback (3-5 sentences).
4.  Crucially, identify specific mistakes in the essay. For each mistake, provide the original text, the correction, a brief explanation, and classify the error type.
5.  Return ONLY pure JSON (no markdown, no surrounding text).

JSON OUTPUT FORMAT:
{
  "score": number, // Overall band score (e.g., 6.0, 6.5, 7.0)
  "task_response": string, // Detailed feedback on Task Response
  "coherence_and_cohesion": string, // Detailed feedback on Coherence and Cohesion
  "lexical_resource": string, // Detailed feedback on Lexical Resource
  "grammatical_range_and_accuracy": string, // Detailed feedback on Grammatical Range and Accuracy
  "general_feedback": string, // A general summary and tips for improvement
  "detailed_corrections": [
    {
      "mistake": "The original text snippet with the error.",
      "correction": "The corrected text snippet.",
      "explanation": "Brief explanation of why it was wrong.",
      "type": "Grammar | Lexis | Spelling | Cohesion"
    }
  ]
}

### Writing Prompt (Task):
${writingPrompt ?? '(No prompt provided)'}

### Candidate's Essay:
${submissionText}
`;
  }
}
