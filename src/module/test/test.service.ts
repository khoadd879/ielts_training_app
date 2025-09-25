import { BadRequestException, Inject, Injectable } from '@nestjs/common';
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
      loaiDe,
      title,
      description,
      duration,
      numberQuestion,
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

    if (audioFile && loaiDe === 'LISTENING') {
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

    // Tạo test trong DB
    const data = await this.databaseService.de.create({
      data: {
        idUser,
        loaiDe,
        title,
        description,
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

    const data = await this.databaseService.de.findMany({ where: { idUser } });
    await this.cache.set(cacheKey, data, 300); // cache 5 phút
    return {
      message: 'Tests retrieved successfully',
      data,
      status: 200,
    };
  }

  async findByName(tieuDe: string) {
    const cacheKey = `tests_name_${tieuDe}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return {
        message: 'Tests retrieved successfully (from cache)',
        data: cached,
        status: 200,
      };
    }

    const data = await this.databaseService.de.findMany({
      where: {
        title: {
          contains: tieuDe,
          mode: 'insensitive',
        },
      },
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

    const data = await this.databaseService.de.findMany();

    await this.cache.set(cacheKey, data, 300); // cache 5 phút
    return {
      message: 'Tests retrieved successfully',
      data,
      status: 200,
    };
  }

  async update(
    idDe: string,
    updateTestDto: UpdateTestDto,
    file?: Express.Multer.File,
    audioFile?: Express.Multer.File,
  ) {
    const {
      idUser,
      loaiDe,
      title,
      description,
      duration,
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

    if (audioFile && loaiDe === 'LISTENING') {
      const uploadResult = await this.cloudinaryService.uploadFile(
        audioFile,
        'test-audio',
      );
      audio = uploadResult.secure_url;
    }

    const data = await this.databaseService.de.update({
      where: { idDe },
      data: {
        idUser,
        loaiDe,
        title,
        description,
        duration: Number(duration),
        numberQuestion: Number(numberQuestion),
        img: imageUrl,
        audioUrl: audio,
      },
    });

    // Xóa cache liên quan
    await this.cache.del(`tests_user_${idUser}`);
    await this.cache.del(`test_${idDe}`);
    await this.cache.del('tests_all');

    return {
      message: 'Test updated successfully',
      data,
      status: 200,
    };
  }

  async remove(idDe: string) {
    const existingTest = await this.databaseService.de.findUnique({
      where: { idDe },
    });
    if (!existingTest) {
      throw new BadRequestException('Test not found');
    }

    await this.databaseService.$transaction([
      this.databaseService.part.deleteMany({
        where: {
          idDe,
        },
      }),
      this.databaseService.de.delete({ where: { idDe } }),
    ]);

    // Xóa cache liên quan
    await this.cache.del(`tests_user_${existingTest.idUser}`);
    await this.cache.del(`test_${idDe}`);
    await this.cache.del('tests_all');

    return { message: 'Test deleted successfully', status: 200 };
  }

  async getPartInTest(idDe: string) {
    const cacheKey = `test_${idDe}_parts`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return {
        message: 'Part retrieved successfully (from cache)',
        data: cached,
        status: 200,
      };
    }

    const existingTest = await this.databaseService.de.findUnique({
      where: { idDe },
    });
    if (!existingTest) {
      throw new BadRequestException('Test not found');
    }

    const data = await this.databaseService.de.findMany({
      where: { idDe },
      include: { parts: true },
    });

    await this.cache.set(cacheKey, data, 600); // cache 10 phút
    return {
      message: 'Part retrieved successfully',
      data,
      status: 200,
    };
  }
}
