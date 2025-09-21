import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { CreateOptionDto } from './dto/create-option.dto';
import { UpdateOptionDto } from './dto/update-option.dto';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class OptionService {
  constructor(private readonly databaseService: DatabaseService) {}
  async createManyOptions(createOptionsDto: CreateOptionDto[]) {
    if (!createOptionsDto || createOptionsDto.length === 0) {
      throw new BadRequestException('No options provided');
    }

    const idCauHoi = createOptionsDto[0].idCauHoi;

    // Check question exists
    const existingQuestion = await this.databaseService.cauHoi.findUnique({
      where: { idCauHoi },
    });
    if (!existingQuestion) throw new BadRequestException('Question not found');

    // Insert all options
    const data = await this.databaseService.option.createMany({
      data: createOptionsDto.map((opt) => ({
        idCauHoi,
        option_label: opt.option_label,
        option_content: opt.option_content,
      })),
    });

    return {
      message: 'Options created successfully',
      count: data.count,
      status: 200,
    };
  }

  async findAllbyIdQuestion(idQuestion: string) {
    const existingQuestion = await this.databaseService.cauHoi.findUnique({
      where: { idCauHoi: idQuestion },
    });
    if (!existingQuestion) throw new BadRequestException('Question not found');

    const data = await this.databaseService.option.findMany({
      where: {
        idCauHoi: idQuestion,
      },
    });

    return {
      message: 'Option retrieved successfully',
      data,
      status: 200,
    };
  }

  async updateOption(idOption: string, updateOptionDto: UpdateOptionDto) {
    const { idCauHoi, option_label, option_content } = updateOptionDto;
    const existingOption = await this.databaseService.option.findUnique({
      where: {
        idOption,
      },
    });

    if (!existingOption) throw new BadGatewayException('Option not found');

    const data = await this.databaseService.option.update({
      where: {
        idOption,
      },
      data: {
        idCauHoi,
        option_label,
        option_content,
      },
    });

    return {
      message: 'Option updated successfully',
      data,
      status: 200,
    };
  }

  async removeOption(idOption: string) {
    const existingOption = await this.databaseService.option.findUnique({
      where: {
        idOption,
      },
    });

    if (!existingOption) throw new BadGatewayException('Option not found');

    await this.databaseService.option.delete({
      where: {
        idOption,
      },
    });

    return {
      message: 'Option deleted successfully',
      status: 200,
    };
  }
}
