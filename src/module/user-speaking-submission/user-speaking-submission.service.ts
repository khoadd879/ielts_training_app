import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserSpeakingSubmissionDto } from './dto/create-user-speaking-submission.dto';
import { UpdateUserSpeakingSubmissionDto } from './dto/update-user-speaking-submission.dto';
import { DatabaseService } from 'src/database/database.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

type CorrectionDetail = {
  mistake: string;
  correct: string;
  explanation: string;
  type: string; //Loại lỗi
};

type AIFeedbackResult = {
  scoreFluency?: number;
  scoreLexical?: number;
  scoreGrammar?: number;
  scorePronunciation?: number;
  overallScore?: number;
  commentFluency?: string;
  commentLexical?: string;
  commentGrammar?: string;
  commentPronunciation?: string;
  generalFeedback: string;
  detailedCorrections: CorrectionDetail[];
};
@Injectable()
export class UserSpeakingSubmissionService {
  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
  ) { }

  private getAIInstance(): GoogleGenAI {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) throw new BadRequestException('Missing GEMINI_API_KEY');
    return new GoogleGenAI({ apiKey });
  }

  async create(
    createUserSpeakingSubmissionDto: CreateUserSpeakingSubmissionDto,
    file?: Express.Multer.File,
  ) {
    const { idUser, idSpeakingTask } = createUserSpeakingSubmissionDto;

    // Upload audio nếu có
    let audioUrl = createUserSpeakingSubmissionDto.audioUrl;
    if (file) {
      const { secure_url } = await this.cloudinaryService.uploadFile(file);
      audioUrl = secure_url;
    }

    // Kiểm tra dữ liệu hợp lệ
    const [user, speakingTask] = await Promise.all([
      this.databaseService.user.findUnique({ where: { idUser } }),
      this.databaseService.speakingTask.findUnique({
        where: { idSpeakingTask },
        include: { questions: true },
      }),
    ]);

    if (!user) throw new BadRequestException('User not found');
    if (!speakingTask) throw new BadRequestException('Speaking task not found');

    // ==================== TÁCH THEO PART ==================== //
    const groupedQuestions = speakingTask.questions.reduce(
      (acc, q) => {
        acc[q.part] = acc[q.part] || [];
        acc[q.part].push(q);
        return acc;
      },
      {} as Record<string, typeof speakingTask.questions>,
    );

    // ==================== GỌI AI TỪNG PART ==================== //
    const aiResults: Record<string, AIFeedbackResult> = {};

    for (const part of Object.keys(groupedQuestions)) {
      const questions = groupedQuestions[part]
        .sort((a, b) => a.order - b.order)
        .map((q) => {
          const subs = q.subPrompts
            ? JSON.stringify(q.subPrompts, null, 2)
            : '';
          return `Topic: ${q.topic ?? 'N/A'}
Main Prompt: ${q.prompt}
Sub Prompts: ${subs}`;
        })
        .join('\n\n');

      aiResults[part] = await this.evaluateSpeaking(
        audioUrl,
        `${speakingTask.title} - ${part}`,
        questions,
      );
    }

    // ==================== GỘP FEEDBACK ==================== //
    const partResults = Object.values(aiResults);
    const validParts = partResults.length || 1;

    const combinedFeedback: AIFeedbackResult = {
      // Calculate average scores
      scoreFluency: partResults.reduce((sum, r) => sum + (r.scoreFluency || 0), 0) / validParts,
      scoreLexical: partResults.reduce((sum, r) => sum + (r.scoreLexical || 0), 0) / validParts,
      scoreGrammar: partResults.reduce((sum, r) => sum + (r.scoreGrammar || 0), 0) / validParts,
      scorePronunciation: partResults.reduce((sum, r) => sum + (r.scorePronunciation || 0), 0) / validParts,
      overallScore: partResults.reduce((sum, r) => sum + (r.overallScore || 0), 0) / validParts,

      // Combine comments
      commentFluency: Object.entries(aiResults)
        .map(([part, r]) => `--- ${part} ---\n${r.commentFluency || ''}`)
        .join('\n\n'),
      commentLexical: Object.entries(aiResults)
        .map(([part, r]) => `--- ${part} ---\n${r.commentLexical || ''}`)
        .join('\n\n'),
      commentGrammar: Object.entries(aiResults)
        .map(([part, r]) => `--- ${part} ---\n${r.commentGrammar || ''}`)
        .join('\n\n'),
      commentPronunciation: Object.entries(aiResults)
        .map(([part, r]) => `--- ${part} ---\n${r.commentPronunciation || ''}`)
        .join('\n\n'),
      generalFeedback: Object.entries(aiResults)
        .map(([part, r]) => `--- ${part} ---\n${r.generalFeedback}`)
        .join('\n\n'),
      detailedCorrections: Object.values(aiResults).flatMap(
        (r) => r.detailedCorrections || [],
      ),
    };

    // ==================== LƯU DATABASE ==================== //
    const data = await this.databaseService.$transaction(async (tx) => {
      const submission = await tx.userSpeakingSubmission.create({
        data: {
          idUser,
          idSpeakingTask,
          audioUrl,
          status: 'GRADED',
        },
      });

      const feedback = await tx.speakingFeedback.create({
        data: {
          idSpeakingSubmission: submission.idSpeakingSubmission,
          scoreFluency: combinedFeedback.scoreFluency,
          scoreLexical: combinedFeedback.scoreLexical,
          scoreGrammar: combinedFeedback.scoreGrammar,
          scorePronunciation: combinedFeedback.scorePronunciation,
          overallScore: combinedFeedback.overallScore,
          commentFluency: combinedFeedback.commentFluency,
          commentLexical: combinedFeedback.commentLexical,
          commentGrammar: combinedFeedback.commentGrammar,
          commentPronunciation: combinedFeedback.commentPronunciation,
          generalFeedback: combinedFeedback.generalFeedback,
          detailedCorrections: combinedFeedback.detailedCorrections || [],
        },
      });

      return { ...submission, feedback };
    });

    return {
      message: 'User speaking submission created successfully',
      data,
      status: 200,
    };
  }

  async findAllByIdSpeakingTask(idSpeakingTask: string) {
    const existingSpeakingTask =
      await this.databaseService.speakingTask.findUnique({
        where: {
          idSpeakingTask,
        },
      });

    if (!existingSpeakingTask) {
      throw new BadRequestException('Speaking task not found');
    }

    const data = await this.databaseService.userSpeakingSubmission.findMany({
      where: {
        idSpeakingTask,
      },
    });

    return {
      message: 'User speaking submissions retrieved successfully',
      data,
      status: 200,
    };
  }

  async update(
    id: string,
    updateUserSpeakingSubmissionDto: UpdateUserSpeakingSubmissionDto,
    file?: Express.Multer.File,
  ) {
    const existingSubmission =
      await this.databaseService.userSpeakingSubmission.findUnique({
        where: {
          idSpeakingSubmission: id,
        },
      });

    if (!existingSubmission) {
      throw new BadRequestException('User speaking submission not found');
    }

    let audioUrl = existingSubmission.audioUrl;

    if (file) {
      const { secure_url } = await this.cloudinaryService.uploadFile(file);
      audioUrl = secure_url;
    }

    const data = await this.databaseService.userSpeakingSubmission.update({
      where: {
        idSpeakingSubmission: id,
      },
      data: {
        ...updateUserSpeakingSubmissionDto,
        audioUrl,
      },
    });

    return {
      message: 'User speaking submission updated successfully',
      data,
      status: 200,
    };
  }

  async remove(id: string) {
    const existingSubmission =
      await this.databaseService.userSpeakingSubmission.findUnique({
        where: {
          idSpeakingSubmission: id,
        },
      });
    if (!existingSubmission) {
      throw new BadRequestException('User speaking submission not found');
    }

    await this.databaseService.userSpeakingSubmission.delete({
      where: {
        idSpeakingSubmission: id,
      },
    });

    return {
      message: 'User speaking submission removed successfully',
      status: 200,
    };
  }

  private async evaluateSpeaking(
    audioUrl: string,
    title: string,
    questionsText: string,
  ): Promise<AIFeedbackResult> {
    const ai = this.getAIInstance();
    const promptText = this.buildPrompt(title, questionsText, audioUrl);

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: promptText,
      });

      const raw = response.text?.trim() ?? '';
      const clean = raw
        .replace(/```json/i, '')
        .replace(/```/g, '')
        .trim();

      const parsed = JSON.parse(clean);

      return {
        scoreFluency: parsed.score_fluency,
        scoreLexical: parsed.score_lexical,
        scoreGrammar: parsed.score_grammar,
        scorePronunciation: parsed.score_pronunciation,
        overallScore: parsed.overall_score,
        commentFluency: parsed.comment_fluency,
        commentLexical: parsed.comment_lexical,
        commentGrammar: parsed.comment_grammar,
        commentPronunciation: parsed.comment_pronunciation,
        generalFeedback: parsed.general_feedback,
        detailedCorrections: parsed.detailed_corrections || [],
      };
    } catch (error) {
      console.error('AI evaluation failed:', error);
      throw new BadRequestException('AI evaluation failed');
    }
  }

  private buildPrompt(
    taskTitle: string,
    questionContext: string,
    audioUrl: string,
  ): string {
    return `
You are a certified IELTS Speaking examiner.
Evaluate the following candidate's response based on IELTS criteria.

Audio: ${audioUrl}
Task: ${taskTitle}

### Speaking Questions:
${questionContext}

Return feedback in JSON only with the following structure.
- Provide numeric scores (0-9 scale, can use decimals like 6.5, 7.0, etc.) for each criterion.
- Provide detailed text comments for each criterion.
- Calculate the overall_score as the average of the four scores.

{
  "score_fluency": 0.0,
  "score_lexical": 0.0,
  "score_grammar": 0.0,
  "score_pronunciation": 0.0,
  "overall_score": 0.0,
  "comment_fluency": "detailed feedback on fluency and coherence",
  "comment_lexical": "detailed feedback on lexical resource",
  "comment_grammar": "detailed feedback on grammatical range and accuracy",
  "comment_pronunciation": "detailed feedback on pronunciation",
  "general_feedback": "overall assessment and suggestions",
  "detailed_corrections": [
    {
      "mistake": "string",
      "correct": "string",
      "explanation": "string",
      "type": "Grammar | Vocabulary | Pronunciation | Fluency"
    }
  ]
}
`;
  }
}
