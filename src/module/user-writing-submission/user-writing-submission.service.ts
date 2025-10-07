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
    const aiResult = await this.evaluateWriting(
      submission_text,
      existingTask.prompt, // gửi đề viết vào AI
    );

    // 🧠 2. Lưu vào database
    const data = await this.databaseService.userWritingSubmission.create({
      data: {
        idUser,
        idWritingTask,
        submission_text,
        score: aiResult.score,
        feedback: aiResult.feedback as Prisma.InputJsonValue,
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
    writing_prompt?: string,
  ): Promise<{ score: number; feedback: Record<string, any> }> {
    const cacheKey = submission_text.trim();

    // ⚡ 0. Check cache trước
    if (writingCache.has(cacheKey)) {
      return writingCache.get(cacheKey)!;
    }

    // ⚙️ 1. Tạo prompt chuẩn
    const prompt = `
You are a certified IELTS Writing examiner with deep knowledge of the official IELTS Writing Band Descriptors (public version).

Your task is to **objectively evaluate** the candidate’s essay below **as an IELTS examiner would**.  
Please assess the writing according to **the four official IELTS Writing criteria**:

1. **Task Response (TR)** – How fully and appropriately the task is answered.  
2. **Coherence and Cohesion (CC)** – The logical organization, paragraphing, and flow of ideas.  
3. **Lexical Resource (LR)** – The range, accuracy, and appropriacy of vocabulary.  
4. **Grammatical Range and Accuracy (GRA)** – The range and correctness of grammar and sentence structures.

### Rules for evaluation:
- Be **strict but fair**, following IELTS public band descriptors (0–9), can follow descriptors on https://takeielts.britishcouncil.org/sites/default/files/ielts_writing_band_descriptors.pdf  .
- Avoid subjective praise. Focus on measurable weaknesses and strengths.
- Give **specific, concise feedback** for each criterion (2–4 sentences max).
- Calculate the **overall band score** as the average of the four criteria, rounded to the nearest 0.5.
- Do **NOT** include markdown, commentary, or explanations outside the JSON.

### Output format:
Return your entire response in **pure JSON only** — no markdown fences, no extra text.

{
  "score": number (0–9, rounded to nearest 0.5),
  "task_response": string,
  "coherence_and_cohesion": string,
  "lexical_resource": string,
  "grammatical_range_and_accuracy": string,
  "general_feedback": string
}

### Writing Prompt:
${writing_prompt ?? '(No prompt provided)'}

### Essay to evaluate:
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
        score = parsed.score ?? 0;
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
