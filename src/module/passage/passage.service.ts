import { BadRequestException, Injectable } from '@nestjs/common';
import { CreatePassageDto } from './dto/create-passage.dto';
import { UpdatePassageDto } from './dto/update-passage.dto';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class PassageService {
  constructor(private readonly databaseService: DatabaseService) {}
  async createPassage(createPassageDto: CreatePassageDto) {
    const { idPart, title, content, image, description, numberParagraph } =
      createPassageDto;

    const existingPart = await this.databaseService.part.findUnique({
      where: { idPart },
    });

    if (!existingPart) throw new BadRequestException('Part not found');

    const data = await this.databaseService.doanVan.create({
      data: {
        idPart,
        title,
        content,
        image,
        description,
        numberParagraph,
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

    const data = await this.databaseService.doanVan.findMany({
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
    const existingPassage = await this.databaseService.doanVan.findUnique({
      where: { idDoanVan: idPassage },
    });

    if (!existingPassage) throw new BadRequestException('Passage not found');

    return {
      message: 'Passage retrieved successfully',
      data: existingPassage,
      status: 200,
    };
  }

  async updatePassage(idPassage: string, updatePassageDto: UpdatePassageDto) {
    const { idPart, title, content, image, description, numberParagraph } =
      updatePassageDto;

    const existingPart = await this.databaseService.part.findUnique({
      where: { idPart },
    });

    if (!existingPart) throw new BadRequestException('Part not found');

    const existingPassage = await this.databaseService.doanVan.findUnique({
      where: { idDoanVan: idPassage },
    });

    if (!existingPassage) throw new BadRequestException('Passage not found');

    const data = await this.databaseService.doanVan.update({
      where: {
        idDoanVan: idPassage,
      },
      data: {
        idPart,
        title,
        content,
        image,
        description,
        numberParagraph,
      },
    });
    return {
      message: 'Passage updated successfully',
      data,
      status: 200,
    };
  }

  async removePassage(idPassage: string) {
    const existingPassage = await this.databaseService.doanVan.findUnique({
      where: { idDoanVan: idPassage },
    });

    if (!existingPassage) throw new BadRequestException('Passage not found');

    await this.databaseService.doanVan.delete({
      where: {
        idDoanVan: idPassage,
      },
    });

    return {
      message: 'Delete passage successfully',
      status: 200,
    };
  }
}
