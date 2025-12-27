import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
    const projectId = this.configService.get<string>('GOOGLE_PROJECT_ID');
    const clientEmail = this.configService.get<string>('GOOGLE_CLIENT_EMAIL');
    const privateKeyRaw = this.configService.get<string>('GOOGLE_PRIVATE_KEY');

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

  private async transcribeAudio(buffer: Buffer): Promise<string> {
    try {
      const audioBytes = buffer.toString('base64');
      const request = {
        audio: { content: audioBytes },
        config: {
          languageCode: 'en-US',
          enableAutomaticPunctuation: true,
          model: 'latest_long',
        },
      };

      const [response] = await this.speechClient.recognize(request as any);
      const transcription = response.results
        ?.map((result) => result.alternatives?.[0]?.transcript)
        .join('\n') || '';
      return transcription;
    } catch (error) {
      console.error('Google STT Error:', error);
      return '';
    }
  }

  async create(
    createUserSpeakingSubmissionDto: CreateUserSpeakingSubmissionDto,
    file?: Express.Multer.File,
  ) {
    const { idUser, idSpeakingTask, idTestResult } = createUserSpeakingSubmissionDto;

    const [user, speakingTask,] = await Promise.all([
      this.databaseService.user.findUnique({ where: { idUser } }),
      this.databaseService.speakingTask.findUnique({
        where: { idSpeakingTask },
        include: { questions: true },
      }),

    ]);

    if (!user) throw new NotFoundException('User not found');
    if (!speakingTask) throw new NotFoundException('Speaking task not found');
    if (idTestResult) {
      const tr = await this.databaseService.userTestResult.findUnique({ where: { idTestResult, idUser } });
      if (!tr) throw new NotFoundException('Test result not found');
    }

    let audioUrl = createUserSpeakingSubmissionDto.audioUrl;
    let transcript = '';


    if (file) {
      const [cloudinaryRes, transcriptRes] = await Promise.all([
        this.cloudinaryService.uploadFile(file),
        this.transcribeAudio(file.buffer),
      ]);
      audioUrl = cloudinaryRes.secure_url;
      transcript = transcriptRes;
    }

    if (!audioUrl) {
      throw new BadRequestException('Audio is required');
    }
    const currentPart = speakingTask.part;

    const questionsText = speakingTask.questions
      .sort((a, b) => a.order - b.order)
      .map((q) => {
        const subs = q.subPrompts ? JSON.stringify(q.subPrompts, null, 2) : '';
        return `Topic: ${q.topic ?? 'N/A'}\nMain Prompt: ${q.prompt}\nSub Prompts: ${subs}`;
      })
      .join('\n\n');

    const aiResult = await this.evaluateSpeaking(
      audioUrl,
      transcript,
      `${speakingTask.title} - ${currentPart}`,
      questionsText,
    );

    const data = await this.databaseService.$transaction(async (tx) => {
      const submission = await tx.userSpeakingSubmission.create({
        data: {
          idUser,
          idSpeakingTask,
          audioUrl: audioUrl!,
          idTestResult: idTestResult || null,
          transcript: transcript || null,
          status: 'GRADED'
        },
      });

      const feedback = await tx.speakingFeedback.create({
        data: {
          idSpeakingSubmission: submission.idSpeakingSubmission,
          scoreFluency: aiResult.scoreFluency,
          scoreLexical: aiResult.scoreLexical,
          scoreGrammar: aiResult.scoreGrammar,
          scorePronunciation: aiResult.scorePronunciation,
          overallScore: aiResult.overallScore,
          commentFluency: aiResult.commentFluency,
          commentLexical: aiResult.commentLexical,
          commentGrammar: aiResult.commentGrammar,
          commentPronunciation: aiResult.commentPronunciation,
          generalFeedback: aiResult.generalFeedback,
          detailedCorrections: aiResult.detailedCorrections || [],
        },
      });

      return { ...submission, feedback };
    });

    return { message: 'Submission created successfully', data, status: 200 };
  }

  private async evaluateSpeaking(
    audioUrl: string,
    transcript: string,
    title: string,
    questionsText: string,
  ): Promise<AIFeedbackResult> {
    const ai = this.getAIInstance();
    const promptText = this.buildPrompt(title, questionsText, audioUrl, transcript);

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
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
      return {
        scoreFluency: 0, scoreLexical: 0, scoreGrammar: 0, scorePronunciation: 0, overallScore: 0,
        commentFluency: "Error", commentLexical: "Error", commentGrammar: "Error", commentPronunciation: "Error",
        generalFeedback: "AI failed to evaluate.", detailedCorrections: []
      };
    }
  }

  private buildPrompt(
    taskTitle: string,
    questionContext: string,
    audioUrl: string,
    transcript: string,
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