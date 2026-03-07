import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateTestDto } from './dto/create-test.dto';
import { UpdateTestDto } from './dto/update-test.dto';
import {
  ImportFullTestDto,
  CreateWritingTestDto,
  CreateSpeakingTestDto,
} from './dto/import-test.dto';
import { DatabaseService } from 'src/database/database.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { UsersService } from '../users/users.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { TestType } from '@prisma/client';

@Injectable()
export class TestService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly userService: UsersService,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) { }

  async createTest(
    createTestDto: CreateTestDto,
    file?: Express.Multer.File,
    audioFile?: Express.Multer.File,
  ) {
    const {
      idUser,
      testType,
      title,
      description,
      duration,
      numberQuestion,
      level,
      img,
      audioUrl,
    } = createTestDto;

    // Kiểm tra user
    const existingUser = await this.databaseService.user.findUnique({
      where: { idUser },
    });
    if (!existingUser) {
      throw new BadRequestException('User not found');
    }

    let imageUrl = img;
    let audio = audioUrl;

    // Tạo danh sách tác vụ upload song song
    const uploadTasks: Promise<void>[] = [];

    if (file) {
      uploadTasks.push(
        this.cloudinaryService
          .uploadFile(file, 'test-images', 'image')
          .then((res) => {
            imageUrl = res.secure_url;
          }),
      );
    }

    if (audioFile && testType === 'LISTENING') {
      uploadTasks.push(
        this.cloudinaryService
          .uploadFile(audioFile, 'test-audio', 'audio')
          .then((res) => {
            audio = res.secure_url;
          }),
      );
    }

    // Upload song song
    if (uploadTasks.length > 0) {
      await Promise.all(uploadTasks);
    }

    if (testType === 'LISTENING' || testType === 'READING') {
      if (numberQuestion > 40)
        throw new BadRequestException(
          'Number of questions cannot be more than 40 for LISTENING or READING tests',
        );
    } else if (testType === 'WRITING') {
      if (numberQuestion > 2)
        throw new BadRequestException(
          'Number of questions cannot be more than 2 for WRITING tests',
        );
    }

    // Tạo test trong DB
    const data = await this.databaseService.test.create({
      data: {
        idUser,
        testType,
        title,
        description,
        level,
        duration: Number(duration),
        numberQuestion: Number(numberQuestion),
        img: imageUrl,
        audioUrl: audio,
      },
    });

    await Promise.all([
      this.cache.del(`tests_user_${idUser}`),
      this.cache.del('tests_all'),
    ]);

    return {
      message: 'Test created successfully',
      data,
      status: 200,
    };
  }

  async findAllTestCreatedByIdUser(idUser: string) {
    const existingUser = await this.databaseService.user.findUnique({
      where: {
        idUser,
      },
    });
    if (!existingUser) {
      throw new BadRequestException('User not found');
    }
    const cacheKey = `tests_user_${idUser}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return {
        message: 'Tests retrieved successfully (from cache)',
        data: cached,
        status: 200,
      };
    }

    const data = await this.databaseService.test.findMany({
      where: { idUser },
    });
    await this.cache.set(cacheKey, data, 3600); // cache 1 giờ - optimized for static content
    return {
      message: 'Tests retrieved successfully',
      data,
      status: 200,
    };
  }

  async findAll() {
    const cacheKey = 'tests_all';
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return {
        message: 'Tests retrieved successfully',
        data: cached,
        status: 200,
      };
    }

    const data = await this.databaseService.test.findMany();

    await this.cache.set(cacheKey, data, 3600); // cache 1 giờ
    return {
      message: 'Tests retrieved successfully',
      data,
      status: 200,
    };
  }

  async update(
    idTest: string,
    updateTestDto: UpdateTestDto,
    file?: Express.Multer.File,
    audioFile?: Express.Multer.File,
  ) {
    const {
      idUser,
      testType,
      title,
      description,
      duration,
      level,
      numberQuestion,
      img,
      audioUrl,
    } = updateTestDto;

    const existingUser = await this.databaseService.user.findUnique({
      where: {
        idUser,
      },
    });
    if (!existingUser) {
      throw new BadRequestException('User not found');
    }

    let imageUrl = img;
    let audio = audioUrl;

    if (file) {
      const uploadResult = await this.cloudinaryService.uploadFile(
        file,
        'test-images',
      );
      imageUrl = uploadResult.secure_url;
    }

    if (audioFile && testType === 'LISTENING') {
      const uploadResult = await this.cloudinaryService.uploadFile(
        audioFile,
        'test-audio',
      );
      audio = uploadResult.secure_url;
    }

    if (testType === 'LISTENING' || testType === 'READING') {
      if (numberQuestion > 40)
        throw new BadRequestException(
          'Number of questions cannot be more than 40 for LISTENING or READING tests',
        );
    } else if (testType === 'WRITING' || testType === 'SPEAKING') {
      if (numberQuestion > 2)
        throw new BadRequestException(
          'Number of questions cannot be more than 2 for WRITING or SPEAKING tests',
        );
    }

    const data = await this.databaseService.test.update({
      where: { idTest },
      data: {
        idUser,
        testType,
        title,
        description,
        level,
        duration: Number(duration),
        numberQuestion: Number(numberQuestion),
        img: imageUrl,
        audioUrl: audio,
      },
    });

    // Xóa cache liên quan
    await this.cache.del(`tests_user_${idUser}`);
    await this.cache.del(`test_${idTest}`);
    await this.cache.del('tests_all');

    return {
      message: 'Test updated successfully',
      data,
      status: 200,
    };
  }

  async remove(idTest: string) {
    const existingTest = await this.databaseService.test.findUnique({
      where: { idTest },
    });
    if (!existingTest) {
      throw new BadRequestException('Test not found');
    }

    await this.databaseService.$transaction([
      this.databaseService.part.deleteMany({
        where: {
          idTest,
        },
      }),
      this.databaseService.test.delete({ where: { idTest } }),
    ]);

    // Xóa cache liên quan
    await this.cache.del(`tests_user_${existingTest.idUser}`);
    await this.cache.del(`test_${idTest}`);
    await this.cache.del('tests_all');

    return { message: 'Test deleted successfully', status: 200 };
  }

  async getPartInTest(idTest: string) {
    const cacheKey = `test_${idTest}_parts`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return {
        message: 'Part retrieved successfully (from cache)',
        data: cached,
        status: 200,
      };
    }

    const existingTest = await this.databaseService.test.findUnique({
      where: { idTest },
    });
    if (!existingTest) {
      throw new BadRequestException('Test not found');
    }

    const data = await this.databaseService.test.findMany({
      where: { idTest },
      include: { parts: true },
    });

    await this.cache.set(cacheKey, data, 1800); // cache 30 phút - optimized
    return {
      message: 'Part retrieved successfully',
      data,
      status: 200,
    };
  }

  /**
   * Strip correct answers from metadata before sending to students
   */
  private sanitizeMetadataForUser(metadata: any): any {
    if (!metadata || typeof metadata !== 'object') return metadata;
    const sanitized = { ...metadata };
    // Remove any field that reveals the correct answer
    delete sanitized.correctOptionIndexes;
    delete sanitized.correctAnswer;
    delete sanitized.correctHeadingIndex;
    delete sanitized.correctParagraph;
    delete sanitized.correctFeatureLabel;
    delete sanitized.correctEndingLabel;
    delete sanitized.correctAnswers;
    return sanitized;
  }

  async getTest(idTest: string) {
    const testInfo = await this.databaseService.test.findUnique({
      where: { idTest },
      select: { testType: true },
    });

    if (!testInfo) {
      throw new BadRequestException('Test not found');
    }

    let data: any;

    if (testInfo.testType === TestType.SPEAKING) {
      data = await this.databaseService.test.findUnique({
        where: { idTest },
        include: {
          speakingTasks: {
            include: {
              questions: {
                orderBy: { order: 'asc' },
              },
            },
          },
        },
      });
    } else if (testInfo.testType === TestType.WRITING) {
      data = await this.databaseService.test.findUnique({
        where: { idTest },
        include: {
          writingTasks: true,
        },
      });
    } else {
      // LISTENING/READING — sanitize metadata to hide correct answers
      const rawData = await this.databaseService.test.findUnique({
        where: { idTest },
        include: {
          parts: {
            orderBy: { order: 'asc' },
            include: {
              passage: true,
              questionGroups: {
                orderBy: { order: 'asc' },
                include: {
                  questions: {
                    orderBy: { order: 'asc' },
                  },
                },
              },
            },
          },
        },
      });

      if (rawData && rawData.parts) {
        data = {
          ...rawData,
          parts: rawData.parts.map((part) => ({
            ...part,
            questionGroups: part.questionGroups.map((group) => ({
              ...group,
              questions: group.questions.map((q) => ({
                ...q,
                metadata: this.sanitizeMetadataForUser(q.metadata),
              })),
            })),
          })),
        };
      } else {
        data = rawData;
      }
    }

    return {
      message: 'Test retrieved successfully',
      data,
      status: 200,
    };
  }

  async getAnswerInTest(idTest: string) {
    const testData = await this.databaseService.test.findUnique({
      where: { idTest },
      select: {
        idTest: true,
        title: true,
        parts: {
          orderBy: { order: 'asc' },
          select: {
            idPart: true,
            namePart: true,
            questionGroups: {
              orderBy: { order: 'asc' },
              select: {
                idQuestionGroup: true,
                title: true,
                questionType: true,
                questions: {
                  orderBy: { questionNumber: 'asc' },
                  select: {
                    idQuestion: true,
                    questionNumber: true,
                    content: true,
                    questionType: true,
                    metadata: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!testData) throw new NotFoundException('Test not found');

    return {
      message: 'Test answer key retrieved successfully',
      data: testData,
      status: 200,
    };
  }

  // ============================================================================
  // MASS-IMPORT — AI Crawler sends a single JSON to create an entire R/L test
  // ============================================================================

  async importFullReadingListeningTest(dto: ImportFullTestDto) {
    if (dto.testType !== TestType.READING && dto.testType !== TestType.LISTENING) {
      throw new BadRequestException('This endpoint only supports READING and LISTENING test types');
    }

    const existingUser = await this.databaseService.user.findUnique({
      where: { idUser: dto.idUser },
    });
    if (!existingUser) throw new BadRequestException('User not found');

    // Use interactive $transaction for full control — questions need both idPart and idQuestionGroup
    const data = await this.databaseService.$transaction(async (tx) => {
      // 1. Create the Test
      const test = await tx.test.create({
        data: {
          idUser: dto.idUser,
          title: dto.title,
          description: dto.description ?? null,
          img: dto.img ?? null,
          testType: dto.testType,
          duration: dto.duration,
          numberQuestion: dto.numberQuestion,
          audioUrl: dto.audioUrl ?? null,
          level: dto.level ?? 'Low',
        },
      });

      // 2. Create Parts, Passages, QuestionGroups, and Questions
      for (let partIdx = 0; partIdx < dto.parts.length; partIdx++) {
        const partDto = dto.parts[partIdx];

        const part = await tx.part.create({
          data: {
            idTest: test.idTest,
            namePart: partDto.namePart,
            order: partDto.order ?? partIdx,
            audioUrl: partDto.audioUrl ?? null,
          },
        });

        // Create passage if provided
        if (partDto.passage) {
          await tx.passage.create({
            data: {
              idPart: part.idPart,
              title: partDto.passage.title,
              content: partDto.passage.content,
              image: partDto.passage.image ?? null,
              description: partDto.passage.description ?? null,
              audioUrl: partDto.passage.audioUrl ?? null,
              numberParagraph: partDto.passage.numberParagraph ?? 0,
            },
          });
        }

        // Create question groups and their questions
        for (let groupIdx = 0; groupIdx < partDto.questionGroups.length; groupIdx++) {
          const groupDto = partDto.questionGroups[groupIdx];

          const questionGroup = await tx.questionGroup.create({
            data: {
              idPart: part.idPart,
              title: groupDto.title,
              instructions: groupDto.instructions ?? null,
              questionType: groupDto.questionType,
              imageUrl: groupDto.imageUrl ?? null,
              order: groupDto.order ?? groupIdx,
            },
          });

          // Batch create questions for this group
          if (groupDto.questions.length > 0) {
            await tx.question.createMany({
              data: groupDto.questions.map((q, qIdx) => ({
                idQuestionGroup: questionGroup.idQuestionGroup,
                idPart: part.idPart,
                questionNumber: q.questionNumber,
                content: q.content,
                questionType: q.questionType,
                metadata: q.metadata,
                order: q.order ?? qIdx,
              })),
            });
          }
        }
      }

      // 3. Return the complete test with all relations
      return tx.test.findUnique({
        where: { idTest: test.idTest },
        include: {
          parts: {
            orderBy: { order: 'asc' },
            include: {
              passage: true,
              questionGroups: {
                orderBy: { order: 'asc' },
                include: {
                  questions: { orderBy: { order: 'asc' } },
                },
              },
            },
          },
        },
      });
    });

    return {
      message: 'Full test imported successfully',
      data,
      status: 201,
    };
  }

  // ============================================================================
  // WRITING TEST — Create a complete Writing test with tasks
  // ============================================================================

  async createWritingTest(dto: CreateWritingTestDto) {
    const existingUser = await this.databaseService.user.findUnique({
      where: { idUser: dto.idUser },
    });
    if (!existingUser) throw new BadRequestException('User not found');

    if (dto.writingTasks.length > 2) {
      throw new BadRequestException('A writing test can have a maximum of 2 tasks');
    }

    const data = await this.databaseService.test.create({
      data: {
        idUser: dto.idUser,
        title: dto.title,
        description: dto.description ?? null,
        testType: TestType.WRITING,
        duration: dto.duration,
        numberQuestion: dto.writingTasks.length,
        level: dto.level ?? 'Low',
        writingTasks: {
          create: dto.writingTasks.map((task) => ({
            title: task.title,
            taskType: task.taskType,
            timeLimit: task.timeLimit,
            image: task.image ?? null,
            instructions: task.instructions ?? null,
          })),
        },
      },
      include: {
        writingTasks: true,
      },
    });

    return {
      message: 'Writing test created successfully',
      data,
      status: 201,
    };
  }

  // ============================================================================
  // SPEAKING TEST — Create a complete Speaking test with tasks and questions
  // ============================================================================

  async createSpeakingTest(dto: CreateSpeakingTestDto) {
    const existingUser = await this.databaseService.user.findUnique({
      where: { idUser: dto.idUser },
    });
    if (!existingUser) throw new BadRequestException('User not found');

    if (dto.speakingTasks.length > 3) {
      throw new BadRequestException('A speaking test can have a maximum of 3 tasks (Part 1, 2, 3)');
    }

    const data = await this.databaseService.test.create({
      data: {
        idUser: dto.idUser,
        title: dto.title,
        description: dto.description ?? null,
        testType: TestType.SPEAKING,
        duration: dto.duration,
        numberQuestion: dto.speakingTasks.length,
        level: dto.level ?? 'Low',
        speakingTasks: {
          create: dto.speakingTasks.map((task) => ({
            title: task.title,
            part: task.part,
            questions: {
              create: task.questions.map((q, qIdx) => ({
                topic: q.topic ?? null,
                prompt: q.prompt ?? null,
                subPrompts: q.subPrompts ?? null,
                preparationTime: q.preparationTime ?? 0,
                speakingTime: q.speakingTime ?? 120,
                order: q.order ?? qIdx,
              })),
            },
          })),
        },
      },
      include: {
        speakingTasks: {
          include: {
            questions: { orderBy: { order: 'asc' } },
          },
        },
      },
    });

    return {
      message: 'Speaking test created successfully',
      data,
      status: 201,
    };
  }
}
