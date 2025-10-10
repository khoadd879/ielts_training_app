import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CreateUserWritingSubmissionDto } from './dto/create-user-writing-submission.dto';
import { UpdateUserWritingSubmissionDto } from './dto/update-user-writing-submission.dto';
import { DatabaseService } from 'src/database/database.service';
import { GoogleGenAI } from '@google/genai';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type AIFeedbackResult = {
  score: number;
  task_response: string;
  coherence_and_cohesion: string;
  lexical_resource: string;
  grammatical_range_and_accuracy: string;
  general_feedback: string;
};

@Injectable()
export class UserWritingSubmissionService {
  constructor(
    private readonly databaseService: DatabaseService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

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
      writingTask.prompt,
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
          score: aiResult.score,
          taskResponse: aiResult.task_response,
          coherenceAndCohesion: aiResult.coherence_and_cohesion,
          lexicalResource: aiResult.lexical_resource,
          grammaticalRangeAndAccuracy: aiResult.grammatical_range_and_accuracy,
          generalFeedback: aiResult.general_feedback,
        },
      });

      return { ...submission, feedback };
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

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-001', // hoặc gemini-2.5-flash nếu bạn có quyền
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
        console.error('❌ JSON parse error from Gemini:', err);
        throw new BadRequestException('Invalid AI response format');
      }

      // Lưu vào cache 1 giờ
      await this.cacheManager.set(cacheKey, parsed, 3600);
      return parsed;
    } catch (error) {
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
      include: { writingTask: true },
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
        include: { writingTask: true, feedback: true },
      });

    if (!submission) throw new BadRequestException('Submission not found');

    if (updateDto.status === 'GRADED') {
      console.log(`🔄 Re-grading submission: ${idWritingSubmission}`);
      const aiResult = await this.evaluateWriting(
        submission.submission_text,
        submission.writingTask.prompt,
      );

      const updatedFeedback = await this.databaseService.feedback.update({
        where: { idWritingSubmission },
        data: {
          score: aiResult.score,
          taskResponse: aiResult.task_response,
          coherenceAndCohesion: aiResult.coherence_and_cohesion,
          lexicalResource: aiResult.lexical_resource,
          grammaticalRangeAndAccuracy: aiResult.grammatical_range_and_accuracy,
          generalFeedback: aiResult.general_feedback,
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

  // 📋 Prompt AI
  private buildPrompt(submissionText: string, writingPrompt: string): string {
    return `
You are a certified IELTS Writing examiner with deep knowledge of the official IELTS Writing Band Descriptors (public version). But not too strict maybe add more 0.5 to 1 score if that writing is good enough.

Your task is to objectively evaluate the candidate’s essay below as an IELTS examiner would.  
Please assess according to the four official IELTS Writing criteria:

1. Task Response (TR)
2. Coherence and Cohesion (CC)
3. Lexical Resource (LR)
4. Grammatical Range and Accuracy (GRA)

Rules:
- Be strict but fair.
- Follow IELTS public band descriptors.
- Give concise feedback (2–4 sentences each).
- Return only pure JSON (no markdown).

Format:
{
  "score": number,
  "task_response": string,
  "coherence_and_cohesion": string,
  "lexical_resource": string,
  "grammatical_range_and_accuracy": string,
  "general_feedback": string
}

### Writing Prompt:
${writingPrompt ?? '(No prompt provided)'}

### Essay:
${submissionText}
`;
  }
}
