import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateTestDto } from './dto/create-test.dto';
import { UpdateTestDto } from './dto/update-test.dto';
import { DatabaseService } from 'src/database/database.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { UsersService } from '../users/users.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class TestService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly userService: UsersService,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

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
    } else if (testType === 'WRITING' || testType === 'SPEAKING') {
      if (numberQuestion > 2)
        throw new BadRequestException(
          'Number of questions cannot be more than 2 for WRITING or SPEAKING tests',
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
    await this.cache.set(cacheKey, data, 300); // cache 5 phút
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

    await this.cache.set(cacheKey, data, 300); // cache 5 phút
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

    await this.cache.set(cacheKey, data, 600); // cache 10 phút
    return {
      message: 'Part retrieved successfully',
      data,
      status: 200,
    };
  }

  async getTest(idTest: string){
      const existingTest = await this.databaseService.test.findUnique({
      where: { idTest },
    });
    if (!existingTest) {
      throw new BadRequestException('Test not found');
    }

    const data = await this.databaseService.test.findUnique({
      where: {idTest},
      include:{
        parts: {
          include:{
            groupOfQuestions: {
              include:{
                question: {
                  include:{
                    answers: true
                  }
                }
              }
            },
          }
        },
        writingTasks: true,
        speakingTasks: true
      }
    })

    if (!data) throw new NotFoundException('Test not found')

    return {
      message: 'Test retrieved successfully',
      data,
      status: 200,
    };
  }

  async getAnswerInTest(idTest: string) {
    // 1. Kiểm tra Test có tồn tại không
    const existingTest = await this.databaseService.test.findUnique({
      where: { idTest },
    });
    if (!existingTest) throw new NotFoundException('Test not found');

    const data = await this.databaseService.test.findUnique({
      where: { idTest },
      select: {
        idTest: true,
        title: true,
        parts: {
          select: {
            idPart: true,
            namePart: true,
            groupOfQuestions: {
              select: {
                idGroupOfQuestions: true,
                title: true,
                typeQuestion: true, // Quan trọng để biết logic check đáp án (MCQ hay FillBlank...)
                question: {
                  orderBy: {
                    numberQuestion: 'asc', // Sắp xếp theo thứ tự câu hỏi
                  },
                  select: {
                    idQuestion: true,
                    numberQuestion: true,
                    // Chỉ lấy các field quan trọng của Answer
                    answers: {
                      select: {
                        idAnswer: true,
                        answer_text: true,   // Cho dạng điền từ
                        matching_key: true,  // Cho dạng MCQ (A,B,C) hoặc Matching
                        matching_value: true // Cho dạng Matching
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return {
      message: 'Test answers retrieved successfully',
      data,
      status: 200,
    };
  }
}
