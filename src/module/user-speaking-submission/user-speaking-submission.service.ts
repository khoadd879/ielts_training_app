import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserSpeakingSubmissionDto } from './dto/create-user-speaking-submission.dto';
import { UpdateUserSpeakingSubmissionDto } from './dto/update-user-speaking-submission.dto';
import { DatabaseService } from 'src/database/database.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { SpeechClient } from '@google-cloud/speech';

type CorrectionDetail = {
  mistake: string;
  correct: string;
  explanation: string;
  type: string;
};

type AIFeedbackResult = {
  scoreFluency: number;
  scoreLexical: number;
  scoreGrammar: number;
  scorePronunciation: number;
  overallScore: number;
  commentFluency: string;
  commentLexical: string;
  commentGrammar: string;
  commentPronunciation: string;
  generalFeedback: string;
  detailedCorrections: CorrectionDetail[];
};

@Injectable()
export class UserSpeakingSubmissionService {
  private speechClient: SpeechClient;

  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
  ) {
    // Cấu hình Google Cloud (Load từ ENV hoặc File Key)
    const projectId = this.configService.get<string>('GOOGLE_PROJECT_ID');
    const clientEmail = this.configService.get<string>('GOOGLE_CLIENT_EMAIL');
    const privateKeyRaw = this.configService.get<string>('GOOGLE_PRIVATE_KEY');

    // Nếu bạn dùng file key JSON thì chỉ cần new SpeechClient() và set biến môi trường GOOGLE_APPLICATION_CREDENTIALS
    this.speechClient = new SpeechClient({
      projectId,
      credentials: {
        client_email: clientEmail,
        private_key: privateKeyRaw ? privateKeyRaw.replace(/\\n/g, '\n') : undefined,
      }
    });
  }

  private getAIInstance(): GoogleGenAI {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) throw new BadRequestException('Missing GEMINI_API_KEY');
    return new GoogleGenAI({ apiKey });
  }

  // [PHẦN BỊ THIẾU 1] Hàm chuyển Audio -> Text
  private async transcribeAudio(buffer: Buffer): Promise<string> {
    try {
      const audioBytes = buffer.toString('base64');
      const request = {
        audio: { content: audioBytes },
        config: {
          languageCode: 'en-US',
          enableAutomaticPunctuation: true,
          model: 'latest_long', // Model tốt cho audio dài
        },
      };

      const [response] = await this.speechClient.recognize(request as any);
      const transcription = response.results
        ?.map((result) => result.alternatives?.[0]?.transcript)
        .join('\n') || '';
      return transcription;
    } catch (error) {
      console.error('Google STT Error:', error);
      return ''; // Nếu lỗi vẫn trả về rỗng để code chạy tiếp
    }
  }

  async create(
    createUserSpeakingSubmissionDto: CreateUserSpeakingSubmissionDto,
    file?: Express.Multer.File,
    part?: 'PART1' | 'PART2' | 'PART3', // [MỚI] Part nào đang nộp
  ) {
    const { idUser, idSpeakingTask } = createUserSpeakingSubmissionDto;

    const [user, speakingTask] = await Promise.all([
      this.databaseService.user.findUnique({ where: { idUser } }),
      this.databaseService.speakingTask.findUnique({
        where: { idSpeakingTask },
        include: { questions: true },
      }),
    ]);

    if (!user) throw new BadRequestException('User not found');
    if (!speakingTask) throw new BadRequestException('Speaking task not found');

    let audioUrl = createUserSpeakingSubmissionDto.audioUrl;
    let transcript = ''; // [QUAN TRỌNG] Biến lưu text

    if (file) {
      // [PHẦN BỊ THIẾU 2] Chạy song song Upload và Transcribe
      const [cloudinaryRes, transcriptRes] = await Promise.all([
        this.cloudinaryService.uploadFile(file),
        this.transcribeAudio(file.buffer),
      ]);
      audioUrl = cloudinaryRes.secure_url;
      transcript = transcriptRes;
    }

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
          const subs = q.subPrompts ? JSON.stringify(q.subPrompts, null, 2) : '';
          return `Topic: ${q.topic ?? 'N/A'}\nMain Prompt: ${q.prompt}\nSub Prompts: ${subs}`;
        })
        .join('\n\n');

      aiResults[part] = await this.evaluateSpeaking(
        audioUrl,
        transcript, // [QUAN TRỌNG] Truyền transcript vào để chấm điểm chuẩn hơn
        `${speakingTask.title} - ${part}`,
        questions,
      );
    }

    // ==================== GỘP FEEDBACK & ĐIỂM SỐ ==================== //
    const partResults = Object.values(aiResults);
    const validParts = partResults.length || 1;

    // Tính điểm trung bình cộng
    const avg = (key: keyof AIFeedbackResult) =>
      partResults.reduce((sum, r) => sum + ((r[key] as number) || 0), 0) / validParts;

    const combinedFeedback: AIFeedbackResult = {
      scoreFluency: avg('scoreFluency'),
      scoreLexical: avg('scoreLexical'),
      scoreGrammar: avg('scoreGrammar'),
      scorePronunciation: avg('scorePronunciation'),
      overallScore: avg('overallScore'),

      commentFluency: Object.entries(aiResults).map(([p, r]) => `--- ${p} ---\n${r.commentFluency}`).join('\n\n'),
      commentLexical: Object.entries(aiResults).map(([p, r]) => `--- ${p} ---\n${r.commentLexical}`).join('\n\n'),
      commentGrammar: Object.entries(aiResults).map(([p, r]) => `--- ${p} ---\n${r.commentGrammar}`).join('\n\n'),
      commentPronunciation: Object.entries(aiResults).map(([p, r]) => `--- ${p} ---\n${r.commentPronunciation}`).join('\n\n'),

      generalFeedback: Object.entries(aiResults).map(([p, r]) => `--- ${p} ---\n${r.generalFeedback}`).join('\n\n'),
      detailedCorrections: Object.values(aiResults).flatMap(r => r.detailedCorrections || []),
    };

    // ==================== LƯU DATABASE ==================== //
    const data = await this.databaseService.$transaction(async (tx) => {
      const submission = await tx.userSpeakingSubmission.create({
        data: {
          idUser,
          idSpeakingTask,
          audioUrl,
          transcript: transcript || null, // Lưu transcript
          part: part || null, // [MỚI] Lưu part nào
          status: 'GRADED',
        },
      });

      const feedback = await tx.speakingFeedback.create({
        data: {
          idSpeakingSubmission: submission.idSpeakingSubmission,
          // Lưu điểm số
          scoreFluency: combinedFeedback.scoreFluency,
          scoreLexical: combinedFeedback.scoreLexical,
          scoreGrammar: combinedFeedback.scoreGrammar,
          scorePronunciation: combinedFeedback.scorePronunciation,
          overallScore: combinedFeedback.overallScore,
          // Lưu nhận xét
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

    return { message: 'User speaking submission created successfully', data, status: 200 };
  }

  // ... (Giữ nguyên findAllByIdSpeakingTask, update, remove) ...
  async findAllByIdSpeakingTask(idSpeakingTask: string) { /* ... code cũ ... */ return { data: [], message: "", status: 200 }; }
  async update(id: string, dto: UpdateUserSpeakingSubmissionDto, file?: Express.Multer.File) { /* ... code cũ ... */ return { data: null, message: "", status: 200 }; }
  async remove(id: string) { /* ... code cũ ... */ return { message: "", status: 200 }; }

  // [PHẦN CẬP NHẬT 3] Hàm chấm điểm nhận thêm transcript
  private async evaluateSpeaking(
    audioUrl: string,
    transcript: string, // [MỚI]
    title: string,
    questionsText: string,
  ): Promise<AIFeedbackResult> {
    const ai = this.getAIInstance();
    // Truyền transcript vào prompt
    const promptText = this.buildPrompt(title, questionsText, audioUrl, transcript);

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp', // Dùng bản Flash cho nhanh và rẻ
        contents: promptText,
      });

      const raw = response.text?.trim() ?? '';
      const clean = raw.replace(/```json/i, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(clean);

      return {
        scoreFluency: parsed.score_fluency || 0,
        scoreLexical: parsed.score_lexical || 0,
        scoreGrammar: parsed.score_grammar || 0,
        scorePronunciation: parsed.score_pronunciation || 0,
        overallScore: parsed.overall_score || 0,
        commentFluency: parsed.comment_fluency,
        commentLexical: parsed.comment_lexical,
        commentGrammar: parsed.comment_grammar,
        commentPronunciation: parsed.comment_pronunciation,
        generalFeedback: parsed.general_feedback,
        detailedCorrections: parsed.detailed_corrections || [],
      };
    } catch (error) {
      console.error('AI evaluation failed:', error);
      // Trả về điểm 0 nếu lỗi để không crash app
      return {
        scoreFluency: 0, scoreLexical: 0, scoreGrammar: 0, scorePronunciation: 0, overallScore: 0,
        commentFluency: "Error", commentLexical: "Error", commentGrammar: "Error", commentPronunciation: "Error",
        generalFeedback: "AI failed to evaluate.", detailedCorrections: []
      };
    }
  }

  // [PHẦN CẬP NHẬT 4] Prompt dùng Transcript để chấm điểm
  private buildPrompt(
    taskTitle: string,
    questionContext: string,
    audioUrl: string,
    transcript: string, // [MỚI]
  ): string {
    return `
You are a strict IELTS Speaking examiner.
Evaluate the candidate's response based on official IELTS criteria.

### Candidate Submission:
- **Audio URL**: ${audioUrl}
- **Transcript Context**: "${transcript}"
  *(INSTRUCTION: Use the transcript to check Vocabulary and Grammar accuracy. Use the Audio to check Pronunciation and Fluency/Intonation.)*

### Task Info:
Task: ${taskTitle}
Questions: ${questionContext}

----------------------------------
Return valid JSON only (no markdown):
{
  "score_fluency": 6.5,  // Number 0-9
  "score_lexical": 6.0,
  "score_grammar": 5.5,
  "score_pronunciation": 7.0,
  "overall_score": 6.5,  // Average

  "comment_fluency": "Specific feedback...",
  "comment_lexical": "Specific feedback...",
  "comment_grammar": "Specific feedback...",
  "comment_pronunciation": "Specific feedback...",
  
  "general_feedback": "Summary...",
  "detailed_corrections": [
    {
      "mistake": "Quote the mistake",
      "correct": "Correction",
      "explanation": "Why it's wrong",
      "type": "Grammar | Vocabulary | Pronunciation | Fluency"
    }
  ]
}
`;
  }
}