import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateTestDto } from './dto/create-test.dto';
import { UpdateTestDto } from './dto/update-test.dto';
import { DatabaseService } from 'src/database/database.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class TestService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly userService: UsersService,
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
      return new BadRequestException('User not found');
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
        duration: Number(duration), // ép kiểu về số
        numberQuestion: Number(numberQuestion), // ép kiểu về số
        img: imageUrl,
      },
    });

    return {
      message: 'Test created successfully',
      data,
      status: 200,
    };
  }

  async findAllTestCreatedByIdUser(idUser: string) {
    const user = await this.userService.findOne(idUser);
    if (!user) return new BadRequestException('User not found');
    const data = await this.databaseService.de.findMany({ where: { idUser } });
    return {
      message: 'Tests retrieved successfully',
      data,
      status: 200,
    };
  }

  async findByName(tieuDe: string) {
    const data = await this.databaseService.de.findMany({
      where: {
        title: {
          contains: tieuDe,
          mode: 'insensitive', // tìm không phân biệt hoa thường
        },
      },
    });
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
        duration: Number(duration), // ép kiểu về số
        numberQuestion: Number(numberQuestion), // ép kiểu về số
        img: imageUrl,
      },
    });

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

    return { message: 'Test deleted successfully', status: 200 };
  }

  async getVocabulariesInTopic(idDe: string) {
    const existingTest = this.databaseService.de.findUnique({
      where: { idDe },
    });
    if (!existingTest) {
      throw new BadRequestException('Test not found');
    }
    const data = await this.databaseService.de.findMany({
      where: { idDe },
      include: { parts: true },
    });
    return {
      message: 'Part retrieved successfully',
      data: data,
      status: 200,
    };
  }
}
