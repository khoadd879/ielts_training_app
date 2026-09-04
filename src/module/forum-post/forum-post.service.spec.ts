import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ForumPostService } from './forum-post.service';
import { DatabaseService } from '../../database/database.service';
import { RabbitMQService } from '../../rabbitmq/rabbitmq.service';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { SystemConfigService } from '../system-config/system-config.service';
import { ForumModerationStatus } from '@prisma/client';

describe('ForumPostService.createForumPost — async moderation', () => {
  let service: ForumPostService;

  const mockDb: any = {
    user: { findUnique: jest.fn() },
    forumThreads: { findUnique: jest.fn() },
    forumPost: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  const mockRabbit: any = { publishModerationForum: jest.fn() };
  const mockCloudinary: any = { uploadFile: jest.fn() };
  const mockSystemConfig: any = { getModerationPolicy: jest.fn() };
  const mockConfig: any = { get: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ForumPostService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: RabbitMQService, useValue: mockRabbit },
        { provide: CloudinaryService, useValue: mockCloudinary },
        { provide: SystemConfigService, useValue: mockSystemConfig },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    service = module.get(ForumPostService);
  });

  it('tạo post PENDING + publish moderation, không await Gemini', async () => {
    mockDb.user.findUnique.mockResolvedValueOnce({ idUser: 'user-1' });
    mockDb.forumThreads.findUnique.mockResolvedValueOnce({ title: 'Thread 1' });
    mockDb.forumPost.create.mockResolvedValueOnce({
      idForumPost: 'post-1',
      idForumThreads: 'thread-1',
      idUser: 'user-1',
      content: 'hello',
      file: null,
    });
    mockDb.forumPost.findUnique.mockResolvedValueOnce({
      idForumPost: 'post-1',
      idForumThreads: 'thread-1',
      idUser: 'user-1',
      content: 'hello',
      file: null,
      moderationStatus: ForumModerationStatus.PENDING,
      moderationScore: null,
      moderationMeta: null,
      reviewedBy: null,
      reviewedAt: null,
      created_at: new Date(),
      updated_at: new Date(),
      user: { idUser: 'user-1', nameUser: 'u', avatar: null },
      forumThreads: { idForumThreads: 'thread-1', title: 'Thread 1' },
      forumComment: [],
      forumPostLikes: [],
      _count: { forumPostLikes: 0, forumComment: 0 },
    });

    const result = await service.createForumPost({
      idForumThreads: 'thread-1',
      idUser: 'user-1',
      content: 'hello',
    } as any);

    expect(mockDb.forumPost.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          idForumThreads: 'thread-1',
          idUser: 'user-1',
          content: 'hello',
          moderationStatus: ForumModerationStatus.PENDING,
          moderationScore: null,
          // Prisma.JsonNull serializes to {} on the wire
          moderationMeta: expect.anything(),
        }),
      }),
    );
    expect(mockRabbit.publishModerationForum).toHaveBeenCalledWith(
      expect.objectContaining({
        postId: 'post-1',
        userId: 'user-1',
        content: 'hello',
        threadTitle: 'Thread 1',
        hasAttachment: false,
        enqueuedAt: expect.any(String),
      }),
    );
    expect(result.moderationStatus).toBe('pending');
    expect(result.status).toBe(202);
  });
});
