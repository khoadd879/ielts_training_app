import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { CreatePartDto } from './dto/create-part.dto';
import { UpdatePartDto } from './dto/update-part.dto';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class PartService {
  constructor(private readonly databaseService: DatabaseService) {}
  async create(createPartDto: CreatePartDto) {
    const { idTest, namePart, order, audioUrl } = createPartDto;

    const existingTest = await this.databaseService.test.findUnique({
      where: { idTest },
    });

    if (!existingTest) {
      throw new BadRequestException('Test not found');
    }

    // Auto-assign next order if not provided, to avoid Unique(idTest, order) clash.
    // Schema enforces @@unique([idTest, order]) so duplicate order in the same test fails.
    let finalOrder = order;
    if (finalOrder === undefined || finalOrder === null) {
      const lastPart = await this.databaseService.part.findFirst({
        where: { idTest },
        orderBy: { order: 'desc' },
        select: { order: true },
      });
      finalOrder = lastPart ? lastPart.order + 1 : 0;
    }

    const data = await this.databaseService.part.create({
      data: {
        idTest,
        namePart,
        order: finalOrder,
        audioUrl: audioUrl ?? null,
      },
    });

    return {
      message: 'Part created successfully',
      data,
      status: 200,
    };
  }

  async findAll(idTest: string) {
    const existingTest = await this.databaseService.test.findUnique({
      where: { idTest },
    });

    if (!existingTest) {
      throw new BadRequestException('Test not found');
    }

    const data = await this.databaseService.part.findMany({
      where: { idTest },
      orderBy: { order: 'asc' },
      include: {
        // N+1 optimization: include counts so frontend can compute offsets without per-part fetches
        _count: {
          select: {
            questionGroups: true,
            questions: true,
          },
        },
        // Include passage existence for Reading parts
        passage: {
          select: {
            idPassage: true,
          },
        },
      },
    });

    return {
      message: 'Part retrieved successfully',
      data,
      status: 200,
    };
  }

  async findOne(idPart: string) {
    const data = await this.databaseService.part.findUnique({
      where: {
        idPart,
      },
      include: {
        passage: true,
        questionGroups: {
          orderBy: { order: 'asc' },
          include: {
            questions: { orderBy: { order: 'asc' } },
          },
        },
      },
    });

    if (!data) throw new BadRequestException('Part not found');

    return {
      message: 'Part retrieved successfully',
      data,
      status: 200,
    };
  }

  async update(idPart: string, updatePartDto: UpdatePartDto) {
    const { idTest, namePart, order, audioUrl } = updatePartDto;

    if (idTest) {
      const existingTest = await this.databaseService.test.findUnique({
        where: { idTest },
      });

      if (!existingTest) {
        throw new BadRequestException('Test not found');
      }
    }

    const existingPart = await this.databaseService.part.findUnique({
      where: {
        idPart,
      },
      include: {
        passage: true,
      },
    });

    if (!existingPart) throw new BadRequestException('Part not found');
    const data = await this.databaseService.part.update({
      where: { idPart },
      data: {
        idTest,
        namePart,
        ...(order !== undefined && { order }),
        ...(audioUrl !== undefined && { audioUrl }),
      },
    });

    return {
      message: 'Part updated successfully',
      data,
      status: 200,
    };
  }

  async remove(idPart: string) {
    const existingPart = await this.databaseService.part.findUnique({
      where: { idPart },
    });

    if (!existingPart) throw new BadRequestException('Part not found');
    await this.databaseService.$transaction([
      this.databaseService.passage.deleteMany({
        where: {
          idPart,
        },
      }),
      this.databaseService.part.delete({ where: { idPart } }),
    ]);
    return {
      message: 'Delete part successfully',
      status: 200,
    };
  }
}
