import { BadRequestException, Injectable } from '@nestjs/common';
import { CreatePassageDto } from './dto/create-passage.dto';
import { UpdatePassageDto } from './dto/update-passage.dto';
import { DatabaseService } from 'src/database/database.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class PassageService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}
  async createPassage(
    createPassageDto: CreatePassageDto,
    file?: Express.Multer.File,
  ) {
    const { idPart, title, content, description, numberParagraph } =
      createPassageDto;

    const existingPart = await this.databaseService.part.findUnique({
      where: { idPart },
    });

    if (!existingPart) throw new BadRequestException('Part not found');

    let image = createPassageDto.image;

    if (file) {
      const uploadResult = await this.cloudinaryService.uploadFile(file);
      image = uploadResult.secure_url;
    }

    const numParagraph =
      typeof numberParagraph === 'number'
        ? numberParagraph
        : Number.parseInt(String(numberParagraph), 10);

    if (Number.isNaN(numParagraph))
      throw new BadRequestException('numberParagraph must be an integer');

    const data = await this.databaseService.passage.create({
      data: {
        idPart,
        title,
        content,
        image,
        description,
        numberParagraph: numParagraph,
      },
    });
    return {
      message: 'Passage created successfully',
      data,
      status: 200,
    };
  }

  async findAllByIdPart(idPart: string) {
    const existingPart = await this.databaseService.part.findUnique({
      where: { idPart },
    });

    if (!existingPart) throw new BadRequestException('Part not found');

    const data = await this.databaseService.passage.findMany({
      where: {
        idPart,
      },
    });

    if (!data) throw new Error('No data');
    return {
      message: 'Passage retrieved successfully',
      data,
      status: 200,
    };
  }

  async findById(idPassage: string) {
    const existingPassage = await this.databaseService.passage.findUnique({
      where: { idPassage },
    });

    if (!existingPassage) throw new BadRequestException('Passage not found');

    return {
      message: 'Passage retrieved successfully',
      data: existingPassage,
      status: 200,
    };
  }

  async updatePassage(
    idPassage: string,
    updatePassageDto: UpdatePassageDto,
    file?: Express.Multer.File,
  ) {
    const { idPart, title, content, description, numberParagraph } =
      updatePassageDto;

    const existingPart = await this.databaseService.part.findUnique({
      where: { idPart },
    });

    if (!existingPart) throw new BadRequestException('Part not found');

    const existingPassage = await this.databaseService.passage.findUnique({
      where: { idPassage },
    });

    if (!existingPassage) throw new BadRequestException('Passage not found');

    let image = updatePassageDto.image;

    if (file) {
      const uploadResult = await this.cloudinaryService.uploadFile(file);
      image = uploadResult.secure_url;
    }

    const numParagraph =
      typeof numberParagraph === 'number'
        ? numberParagraph
        : Number.parseInt(String(numberParagraph), 10);

    if (Number.isNaN(numParagraph))
      throw new BadRequestException('numberParagraph must be an integer');

    const data = await this.databaseService.passage.update({
      where: {
        idPassage,
      },
      data: {
        idPart,
        title,
        content,
        image,
        description,
        numberParagraph: numParagraph,
      },
    });
    return {
      message: 'Passage updated successfully',
      data,
      status: 200,
    };
  }

  async removePassage(idPassage: string) {
    const existingPassage = await this.databaseService.passage.findUnique({
      where: { idPassage },
    });

    if (!existingPassage) throw new BadRequestException('Passage not found');

    await this.databaseService.passage.delete({
      where: {
        idPassage,
      },
    });

    return {
      message: 'Delete passage successfully',
      status: 200,
    };
  }
}
