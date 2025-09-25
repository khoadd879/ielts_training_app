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

  async createTest(createTestDto: CreateTestDto, file?: Express.Multer.File) {
    const {
      idUser,
      loaiDe,
      title,
      description,
      duration,
      numberQuestion,
      img,
    } = createTestDto;

    const existingUser = await this.userService.findOne(idUser);
    if (!existingUser) {
      throw new BadRequestException('User not found');
    }

    let imageUrl = img;
    if (file) {
      const uploadResult = await this.cloudinaryService.uploadFile(file);
      imageUrl = uploadResult.secure_url;
    }

    const data = await this.databaseService.de.create({
      data: {
        idUser,
        loaiDe,
        title,
        description,
        duration: Number(duration),
        numberQuestion: Number(numberQuestion),
        img: imageUrl,
      },
    });

    // Xóa cache list test để lần sau lấy DB mới
    await this.cache.del(`tests_user_${idUser}`);
    await this.cache.del('tests_all');

    return {
      message: 'Test created successfully',
      data,
      status: 200,
    };
  }

  async findAllTestCreatedByIdUser(idUser: string) {
    const user = await this.userService.findOne(idUser);
    if (!user) throw new BadRequestException('User not found');

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

  async update(
    idDe: string,
    updateTestDto: UpdateTestDto,
    file?: Express.Multer.File,
  ) {
    const {
      idUser,
      loaiDe,
      title,
      description,
      duration,
      numberQuestion,
      img,
    } = updateTestDto;

    const existingUser = await this.userService.findOne(idUser);
    if (!existingUser) throw new BadRequestException('User not found');

    let imageUrl = img;
    if (file) {
      const uploadResult = await this.cloudinaryService.uploadFile(file);
      imageUrl = uploadResult.secure_url;
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
