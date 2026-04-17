import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { CreateForumPostDto } from './dto/create-forum-post.dto';
import { UpdateForumPostDto } from './dto/update-forum-post.dto';
import { DatabaseService } from 'src/database/database.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { ForumModerationStatus, Role } from '@prisma/client';
import { ReviewForumPostDto } from './dto/review-forum-post.dto';

const AUTO_APPROVE_THRESHOLD = 80;
const AUTO_REJECT_THRESHOLD = 20;

const BLOCKED_TERMS = [
  'casino',
  'đặt cược',
  'kiếm tiền nhanh',
  'free money',
  'click link',
  'airdrop',
  'telegram',
];

type ForumModerationMeta = {
  confidence?: number;
  explanation?: string;
  reasons?: string[];
  suggestedEdits?: string[];
  model?: string;
  note?: string | null;
  evaluatedAt?: string;
};

type ModerationResult = {
  status: ForumModerationStatus;
  score: number;
  meta: ForumModerationMeta;
};

@Injectable()
export class ForumPostService {
  private readonly logger = new Logger(ForumPostService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly configService: ConfigService,
  ) {}

  async existingUser(idUser: string) {
    const existingUser = await this.databaseService.user.findUnique({
      where: { idUser },
    });
    if (!existingUser) throw new BadRequestException('User not found');
    return existingUser;
  }

  async existingForumThreads(idForumThreads: string) {
    const existingForumThreads =
      await this.databaseService.forumThreads.findUnique({
        where: { idForumThreads },
      });
    if (!existingForumThreads)
      throw new BadRequestException('Forum thread not found');
    return existingForumThreads;
  }

  private getAIInstance(): GoogleGenAI | null {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY is missing, fallback to needs_review');
      return null;
    }
    return new GoogleGenAI({ apiKey });
  }

  private clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
  }

  private toStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  private cleanGeminiResponse(rawText: string) {
    return rawText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
  }

  private isModeratorRole(role?: Role) {
    return role === Role.ADMIN || role === Role.GIAOVIEN;
  }

  private canViewPost(
    post: { idUser: string; moderationStatus: ForumModerationStatus },
    viewerRole: Role,
    viewerId: string,
  ) {
    if (this.isModeratorRole(viewerRole)) return true;
    if (post.idUser === viewerId) return true;
    return (
      post.moderationStatus === ForumModerationStatus.AUTO_APPROVED ||
      post.moderationStatus === ForumModerationStatus.APPROVED
    );
  }

  private mapModerationStatusToApi(status: ForumModerationStatus) {
    switch (status) {
      case ForumModerationStatus.PENDING:
        return 'pending';
      case ForumModerationStatus.AUTO_APPROVED:
        return 'auto_approved';
      case ForumModerationStatus.NEEDS_REVIEW:
        return 'needs_review';
      case ForumModerationStatus.AUTO_REJECTED:
        return 'auto_rejected';
      case ForumModerationStatus.APPROVED:
        return 'approved';
      case ForumModerationStatus.REJECTED:
        return 'rejected';
      case ForumModerationStatus.CHANGES_REQUESTED:
        return 'changes_requested';
      default:
        return 'pending';
    }
  }

  private mapApiStatusToDb(status: string) {
    switch (status) {
      case 'approved':
        return ForumModerationStatus.APPROVED;
      case 'rejected':
        return ForumModerationStatus.REJECTED;
      case 'changes_requested':
        return ForumModerationStatus.CHANGES_REQUESTED;
      default:
        throw new BadRequestException('Invalid review status');
    }
  }

  private buildModerationView(post: {
    moderationStatus: ForumModerationStatus;
    moderationScore: number | null;
    moderationMeta: unknown;
    reviewedBy: string | null;
    reviewedAt: Date | null;
  }) {
    const meta = (post.moderationMeta as ForumModerationMeta | null) || {};
    return {
      status: this.mapModerationStatusToApi(post.moderationStatus),
      score: post.moderationScore,
      confidence:
        typeof meta.confidence === 'number'
          ? this.clamp(Math.round(meta.confidence), 0, 100)
          : null,
      explanation:
        typeof meta.explanation === 'string' ? meta.explanation : null,
      reasons: this.toStringArray(meta.reasons),
      suggestedEdits: this.toStringArray(meta.suggestedEdits),
      model: typeof meta.model === 'string' ? meta.model : null,
      note: typeof meta.note === 'string' ? meta.note : null,
      reviewedBy: post.reviewedBy,
      reviewedAt: post.reviewedAt,
    };
  }

  private buildGeminiPrompt(
    content: string,
    threadTitle: string | null,
    hasAttachment: boolean,
  ) {
    return `
You are an IELTS forum moderation assistant.
Evaluate if this forum post should be published.

Return STRICT JSON only (no markdown):
{
  "score": 0,
  "confidence": 0,
  "explanation": "",
  "reasons": [""],
  "suggested_edits": [""]
}

Rules:
- score is integer from 0 to 100.
- High quality + safe + relevant IELTS content should be high score.
- Spam, off-topic, abusive, unsafe content should be low score.
- explanation must be concise in Vietnamese.
- reasons should be short bullet-like Vietnamese strings.
- suggested_edits should be practical Vietnamese suggestions.

Context:
- Thread title: ${threadTitle ?? '(không có tiêu đề thread)'}
- Has attachment: ${hasAttachment ? 'yes' : 'no'}

Post content:
"""
${content}
"""
`;
  }

  private runQuickChecks(content: string) {
    const normalized = content.toLowerCase();
    const reasons: string[] = [];

    if (!content.trim() || content.trim().length < 8) {
      reasons.push('Nội dung quá ngắn hoặc trống.');
    }

    if (BLOCKED_TERMS.some((term) => normalized.includes(term))) {
      reasons.push('Phát hiện từ khóa có rủi ro spam/vi phạm.');
    }

    return {
      hardRejected: reasons.length > 0,
      reasons,
    };
  }

  private resolveDecisionByScore(score: number) {
    if (score >= AUTO_APPROVE_THRESHOLD) {
      return ForumModerationStatus.AUTO_APPROVED;
    }
    if (score <= AUTO_REJECT_THRESHOLD) {
      return ForumModerationStatus.AUTO_REJECTED;
    }
    return ForumModerationStatus.NEEDS_REVIEW;
  }

  private async scorePostWithGemini(
    content: string,
    threadTitle: string | null,
    hasAttachment: boolean,
  ): Promise<ModerationResult> {
    const quickCheck = this.runQuickChecks(content);
    if (quickCheck.hardRejected) {
      return {
        status: ForumModerationStatus.AUTO_REJECTED,
        score: 5,
        meta: {
          confidence: 98,
          explanation: 'Bài viết bị từ chối bởi kiểm tra nhanh.',
          reasons: quickCheck.reasons,
          suggestedEdits: [
            'Bổ sung nội dung học thuật rõ ràng và tránh từ khóa spam.',
          ],
          model: 'quick-check',
          evaluatedAt: new Date().toISOString(),
        },
      };
    }

    const ai = this.getAIInstance();
    if (!ai) {
      return {
        status: ForumModerationStatus.NEEDS_REVIEW,
        score: 50,
        meta: {
          confidence: 40,
          explanation:
            'AI moderation tạm thời chưa sẵn sàng, chuyển duyệt tay.',
          reasons: ['Không có cấu hình GEMINI_API_KEY trên server.'],
          suggestedEdits: [],
          model: 'fallback-no-key',
          evaluatedAt: new Date().toISOString(),
        },
      };
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: this.buildGeminiPrompt(content, threadTitle, hasAttachment),
      });

      const rawText = response.text?.trim() ?? '';
      const cleaned = this.cleanGeminiResponse(rawText);
      const parsed = JSON.parse(cleaned) as {
        score?: number;
        confidence?: number;
        explanation?: string;
        reasons?: string[];
        suggested_edits?: string[];
      };

      const rawScore =
        typeof parsed.score === 'number' ? Math.round(parsed.score) : 50;
      const score = this.clamp(rawScore, 0, 100);
      const status = this.resolveDecisionByScore(score);

      return {
        status,
        score,
        meta: {
          confidence:
            typeof parsed.confidence === 'number'
              ? this.clamp(Math.round(parsed.confidence), 0, 100)
              : 70,
          explanation:
            typeof parsed.explanation === 'string' && parsed.explanation.trim()
              ? parsed.explanation.trim()
              : 'AI đã đánh giá xong bài viết.',
          reasons: this.toStringArray(parsed.reasons),
          suggestedEdits: this.toStringArray(parsed.suggested_edits),
          model: 'gemini-2.5-flash',
          evaluatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error('Gemini moderation failed', error);
      return {
        status: ForumModerationStatus.NEEDS_REVIEW,
        score: 50,
        meta: {
          confidence: 45,
          explanation: 'Không kiểm tra được phản hồi từ AI, chuyển duyệt tay.',
          reasons: ['Gemini trả dữ liệu không hợp lệ hoặc lỗi gọi API.'],
          suggestedEdits: [],
          model: 'fallback-parse-error',
          evaluatedAt: new Date().toISOString(),
        },
      };
    }
  }

  private async getForumPostWithRelations(idForumPost: string, idUser: string) {
    return this.databaseService.forumPost.findUnique({
      where: { idForumPost },
      include: {
        user: {
          select: {
            idUser: true,
            nameUser: true,
            avatar: true,
          },
        },
        forumThreads: {
          select: {
            idForumThreads: true,
            title: true,
          },
        },
        forumComment: {
          orderBy: {
            created_at: 'asc',
          },
          include: {
            user: {
              select: {
                idUser: true,
                nameUser: true,
                avatar: true,
              },
            },
            _count: {
              select: {
                forumCommentLikes: true,
              },
            },
            forumCommentLikes: {
              where: {
                idUser,
              },
              select: {
                idUser: true,
              },
            },
          },
        },
        _count: {
          select: {
            forumPostLikes: true,
            forumComment: true,
          },
        },
        forumPostLikes: {
          where: {
            idUser,
          },
          select: {
            idUser: true,
          },
        },
      },
    });
  }

  private transformPost(post: any) {
    const {
      _count,
      forumPostLikes,
      forumComment,
      forumThreads,
      ...restOfPost
    } = post;

    const transformedComments = Array.isArray(forumComment)
      ? forumComment.map((comment) => {
          const {
            _count: commentCount,
            forumCommentLikes: commentLikes,
            ...restOfComment
          } = comment;

          return {
            ...restOfComment,
            commentLikeCount: commentCount?.forumCommentLikes ?? 0,
            isCommentLikedByCurrentUser:
              Array.isArray(commentLikes) && commentLikes.length > 0,
          };
        })
      : [];

    return {
      ...restOfPost,
      threadTitle: forumThreads?.title,
      likeCount: _count?.forumPostLikes ?? 0,
      commentCount: _count?.forumComment ?? transformedComments.length,
      isLikedByCurrentUser:
        Array.isArray(forumPostLikes) && forumPostLikes.length > 0,
      forumComment: transformedComments,
      moderation: this.buildModerationView(post),
    };
  }

  async createForumPost(
    createForumPostDto: CreateForumPostDto,
    file?: Express.Multer.File,
  ) {
    const { idForumThreads, idUser, content } = createForumPostDto;

    await this.existingUser(idUser);
    const forumThread = await this.existingForumThreads(idForumThreads);

    let fileUrl: string | null = null;

    if (file) {
      const uploadResult = await this.cloudinaryService.uploadFile(file);
      fileUrl = uploadResult.secure_url;
    }

    const createdPost = await this.databaseService.forumPost.create({
      data: {
        idForumThreads,
        idUser,
        content,
        file: fileUrl,
      },
    });

    const moderation = await this.scorePostWithGemini(
      content,
      forumThread.title,
      Boolean(fileUrl),
    );

    await this.databaseService.forumPost.update({
      where: { idForumPost: createdPost.idForumPost },
      data: {
        moderationStatus: moderation.status,
        moderationScore: moderation.score,
        moderationMeta: moderation.meta,
      },
    });

    const data = await this.getForumPostWithRelations(
      createdPost.idForumPost,
      idUser,
    );
    if (!data) throw new BadRequestException('Forum post not found');

    return {
      message: 'Forum Post created successfully',
      data: this.transformPost(data),
      status: 200,
    };
  }

  async findAllByIdForumThread(idForumThreads: string, idUser: string) {
    await this.existingUser(idUser);
    await this.existingForumThreads(idForumThreads);

    const data = await this.databaseService.forumPost.findMany({
      where: {
        idForumThreads,
        moderationStatus: {
          in: [
            ForumModerationStatus.AUTO_APPROVED,
            ForumModerationStatus.APPROVED,
          ],
        },
      },
      orderBy: { created_at: 'desc' },
      include: {
        user: {
          select: {
            idUser: true,
            nameUser: true,
            avatar: true,
          },
        },
        forumComment: {
          orderBy: {
            created_at: 'asc',
          },
          include: {
            user: {
              select: {
                idUser: true,
                nameUser: true,
                avatar: true,
              },
            },
            _count: {
              select: {
                forumCommentLikes: true,
              },
            },
            forumCommentLikes: {
              where: {
                idUser,
              },
              select: {
                idUser: true,
              },
            },
          },
        },
        _count: {
          select: {
            forumPostLikes: true,
            forumComment: true,
          },
        },
        forumPostLikes: {
          where: {
            idUser,
          },
          select: {
            idUser: true,
          },
        },
      },
    });

    const transformedPosts = data.map((post) => this.transformPost(post));

    return {
      message: 'Forum posts retrieved successfully',
      data: transformedPosts,
      status: 200,
    };
  }

  async findForumPost(idForumPost: string, idUser: string) {
    const viewer = await this.existingUser(idUser);
    const data = await this.getForumPostWithRelations(idForumPost, idUser);

    if (!data) throw new BadRequestException('Forum post not found');

    if (!this.canViewPost(data, viewer.role, idUser)) {
      throw new BadRequestException('Forum post not found');
    }

    const transformedPost = this.transformPost(data);

    return {
      message: 'Forum post retrieved successfully',
      data: transformedPost,
      status: 200,
    };
  }

  async updateForumPost(
    idForumPost: string,
    updateForumPostDto: UpdateForumPostDto,
    file?: Express.Multer.File,
  ) {
    const { idForumThreads, idUser, content } = updateForumPostDto;

    await this.existingUser(idUser);
    const forumThread = await this.existingForumThreads(idForumThreads);

    const existingPost = await this.databaseService.forumPost.findUnique({
      where: { idForumPost },
    });

    if (!existingPost) throw new BadRequestException('Forum post not found');

    // Check ownership
    const existingPost = await this.databaseService.forumPost.findUnique({
      where: { idForumPost },
    });
    if (!existingPost) throw new BadRequestException('Forum post not found');
    if (existingPost.idUser !== idUser) {
      throw new ForbiddenException('You are not authorized to update this post');
    }

    let fileUrl = updateForumPostDto.file;

    if (file) {
      const uploadResult = await this.cloudinaryService.uploadFile(file);
      fileUrl = uploadResult.secure_url;
    }

    const moderation = await this.scorePostWithGemini(
      content,
      forumThread.title,
      Boolean(fileUrl),
    );

    await this.databaseService.forumPost.update({
      where: { idForumPost },
      data: {
        idForumThreads,
        idUser,
        content,
        file: fileUrl,
        moderationStatus: moderation.status,
        moderationScore: moderation.score,
        moderationMeta: moderation.meta,
        reviewedBy: null,
        reviewedAt: null,
      },
    });

    const data = await this.getForumPostWithRelations(idForumPost, idUser);
    if (!data) throw new BadRequestException('Forum post not found');

    return {
      message: 'Forum Post updated successfully',
      data: this.transformPost(data),
      status: 200,
    };
  }

  async getModerationQueue(idUser: string) {
    const reviewer = await this.existingUser(idUser);
    if (!this.isModeratorRole(reviewer.role)) {
      throw new ForbiddenException(
        'You are not allowed to access moderation queue',
      );
    }

    const data = await this.databaseService.forumPost.findMany({
      where: {
        moderationStatus: {
          not: ForumModerationStatus.AUTO_APPROVED,
        },
      },
      orderBy: {
        created_at: 'desc',
      },
      include: {
        user: {
          select: {
            idUser: true,
            nameUser: true,
            avatar: true,
          },
        },
        forumThreads: {
          select: {
            idForumThreads: true,
            title: true,
          },
        },
        _count: {
          select: {
            forumPostLikes: true,
            forumComment: true,
          },
        },
      },
    });

    const transformedData = data.map((post) => ({
      idForumPost: post.idForumPost,
      idForumThreads: post.idForumThreads,
      threadTitle: post.forumThreads?.title,
      idUser: post.idUser,
      content: post.content,
      file: post.file,
      created_at: post.created_at,
      updated_at: post.updated_at,
      user: post.user,
      likeCount: post._count.forumPostLikes,
      commentCount: post._count.forumComment,
      moderation: this.buildModerationView(post),
    }));

    return {
      message: 'Moderation queue retrieved successfully',
      data: transformedData,
      status: 200,
    };
  }

  async reviewForumPost(
    idForumPost: string,
    reviewForumPostDto: ReviewForumPostDto,
  ) {
    const { idReviewer, status, note } = reviewForumPostDto;

    const reviewer = await this.existingUser(idReviewer);
    if (!this.isModeratorRole(reviewer.role)) {
      throw new ForbiddenException('You are not allowed to review forum posts');
    }

    const existingPost = await this.databaseService.forumPost.findUnique({
      where: { idForumPost },
    });

    if (!existingPost) throw new BadRequestException('Forum post not found');

    const now = new Date();
    const currentMeta =
      (existingPost.moderationMeta as ForumModerationMeta | null) || {};

    const nextMeta: ForumModerationMeta = {
      ...currentMeta,
      note: note?.trim() || null,
      evaluatedAt: currentMeta.evaluatedAt ?? now.toISOString(),
    };

    await this.databaseService.forumPost.update({
      where: { idForumPost },
      data: {
        moderationStatus: this.mapApiStatusToDb(status),
        moderationMeta: nextMeta,
        reviewedBy: reviewer.nameUser || reviewer.email || reviewer.idUser,
        reviewedAt: now,
      },
    });

    const updatedPost = await this.getForumPostWithRelations(
      idForumPost,
      idReviewer,
    );
    if (!updatedPost) throw new BadRequestException('Forum post not found');

    return {
      message: 'Forum post reviewed successfully',
      data: this.transformPost(updatedPost),
      status: 200,
    };
  }

  async removeForumPost(idForumPost: string, idUser: string) {
    const existing = await this.databaseService.forumPost.findUnique({
      where: { idForumPost },
    });
    if (!existing) throw new BadRequestException('Forum post not found');
    if (existing.idUser !== idUser) {
      throw new ForbiddenException('You are not authorized to delete this post');
    }

    await this.databaseService.forumPost.delete({
      where: { idForumPost },
    });

    return {
      message: 'Forum post deleted successfully',
      status: 200,
    };
  }
}
