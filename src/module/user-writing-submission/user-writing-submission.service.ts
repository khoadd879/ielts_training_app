import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserWritingSubmissionDto } from './dto/create-user-writing-submission.dto';
import { UpdateUserWritingSubmissionDto } from './dto/update-user-writing-submission.dto';
import { DatabaseService } from 'src/database/database.service';
import { GenerateContentResponse, GoogleGenAI } from '@google/genai';
import { Prisma } from '@prisma/client';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// 🧠 Cache kết quả AI để tránh gọi lại cùng một bài viết
const writingCache = new Map<
  string,
  {
    score: number;
    feedback: Record<string, any>;
  }
>();

@Injectable()
export class UserWritingSubmissionService {
  constructor(private readonly databaseService: DatabaseService) {}

  // 🧾 Tạo submission + gọi AI chấm điểm
  async createUserWritingSubmission(
    createUserWritingSubmissionDto: CreateUserWritingSubmissionDto,
  ) {
    const { idUser, idWritingTask, submission_text } =
      createUserWritingSubmissionDto;

    const existingUser = await this.databaseService.user.findUnique({
      where: { idUser },
    });
    if (!existingUser) throw new BadRequestException('User not found');

    const existingTask = await this.databaseService.writingTask.findUnique({
      where: { idWritingTask },
    });
    if (!existingTask) throw new BadRequestException('Writing task not found');

    // 🧠 1. Gọi AI chấm điểm
    const aiResult = await this.evaluateWriting(submission_text);

    // 🧠 2. Lưu vào database
    const data = await this.databaseService.userWritingSubmission.create({
      data: {
        idUser,
        idWritingTask,
        submission_text,
        score: null,
        feedback: Prisma.JsonNull,
        status: 'SUBMITTED',
      },
    });

    return {
      message: 'Writing submission created and graded successfully',
      data,
      status: 200,
    };
  }

  // 🧠 HÀM CHẤM BÀI BẰNG GEMINI
  async evaluateWriting(
    submission_text: string,
  ): Promise<{ score: number; feedback: Record<string, any> }> {
    const cacheKey = submission_text.trim();

    // ⚡ 0. Check cache trước
    if (writingCache.has(cacheKey)) {
      return writingCache.get(cacheKey)!;
    }

    // ⚙️ 1. Tạo prompt chuẩn
    const prompt = `
You are an experienced IELTS Writing examiner.
Please grade the following IELTS Writing Task 1 and 2 essay according to IELTS band descriptors.

Return your result in **pure JSON format only** (no markdown, no explanations):

{
  "overall_score": number (0–9),
  "task_response": string,
  "coherence_and_cohesion": string,
  "lexical_resource": string,
  "grammatical_range_and_accuracy": string,
  "general_feedback": string
}

Essay:
${submission_text}
`;

    let score = 0;
    let feedback: Record<string, any> = {};

    try {
      // 🧠 2. Gọi Gemini API
      const response: GenerateContentResponse = await ai.models.generateContent(
        {
          model: 'gemini-2.5-flash',
          contents: prompt,
        },
      );

      // 🧹 3. Làm sạch text
      const rawText = response.text?.trim() ?? '';
      const cleanedText = rawText
        .replace(/```json/i, '')
        .replace(/```/g, '')
        .trim();

      // 🧩 4. Parse JSON
      try {
        const parsed = JSON.parse(cleanedText);
        score = parsed.overall_score ?? 0;
        feedback = parsed;
      } catch (parseErr) {
        console.warn('⚠️ Gemini trả về không phải JSON hợp lệ:', parseErr);
        feedback = {
          error: 'Invalid AI JSON format',
          raw: cleanedText,
        };
      }
    } catch (err) {
      console.error('❌ Lỗi khi gọi Gemini:', err);
      feedback = {
        error: 'AI evaluation failed',
      };
    }

    // 🔒 5. Lưu cache để tái sử dụng
    const result = { score, feedback };
    writingCache.set(cacheKey, result);

    return result;
  }

  // 📚 Lấy toàn bộ submissions theo user
  async findAllByIdUser(idUser: string) {
    const user = await this.databaseService.user.findUnique({
      where: { idUser },
    });
    if (!user) throw new BadRequestException('User not found');

    const data = await this.databaseService.userWritingSubmission.findMany({
      where: { idUser },
      include: {
        writingTask: true,
      },
    });

    return {
      message: 'User writing submissions retrieved successfully',
      data,
      status: 200,
    };
  }

  // 📄 Lấy chi tiết submission
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

  // ✏️ Cập nhật submission
  async updateUserWritingSubmission(
    idWritingSubmission: string,
    updateDto: UpdateUserWritingSubmissionDto,
  ) {
    const existing =
      await this.databaseService.userWritingSubmission.findUnique({
        where: { idWritingSubmission },
      });
    if (!existing)
      throw new BadRequestException('User writing submission not found');

    const { submission_text } = existing;

    let updatedScore = existing.score;
    let updatedFeedback = existing.feedback;

    // 🧠 Nếu update yêu cầu chấm lại bài (vd: status = GRADED)
    if (updateDto.status === 'GRADED') {
      const aiResult = await this.evaluateWriting(submission_text);
      updatedScore = aiResult.score;
      updatedFeedback = aiResult.feedback;
    }

    const data = await this.databaseService.userWritingSubmission.update({
      where: { idWritingSubmission },
      data: {
        score: updatedScore,
        feedback:
          updatedFeedback === null
            ? Prisma.JsonNull
            : (updatedFeedback as Prisma.InputJsonValue),
        status: updateDto.status,
      },
    });

    return {
      message:
        updateDto.status === 'GRADED'
          ? 'Writing submission graded successfully'
          : 'Writing submission updated successfully',
      data,
      status: 200,
    };
  }

  // ❌ Xóa submission
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
}
