import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class TopicService {
  constructor(private readonly databaseService: DatabaseService) {}
  async createTopic(createTopicDto: CreateTopicDto) {
    const { nameTopic, idUser } = createTopicDto;

    const existingUser = await this.databaseService.user.findUnique({
      where: { idUser },
    });

    if (!existingUser) {
      throw new BadRequestException('User not found');
    }
    const data = await this.databaseService.topic.create({
      data: {
        nameTopic,
        idUser,
      },
    });
    return {
      message: 'Topic created successfully',
      data: data,
      status: 200,
    };
  }

  async findAllByIdUser(idUser: string) {
    const existingUser = this.databaseService.user.findUnique({
      where: { idUser },
    });

    if (!existingUser) {
      throw new BadRequestException('User not found');
    }

    const data = await this.databaseService.topic.findMany({
      where: { idUser },
    });

    return {
      message: 'Topics retrieved successfully',
      data: data,
      status: 200,
    };
  }

  findByName(nameTopic: string, idUser: string) {
    const existingUser = this.databaseService.user.findUnique({
      where: { idUser },
    });

    if (!existingUser) {
      throw new BadRequestException('User not found');
    }

    const data = this.databaseService.topic.findMany({
      where: {
        nameTopic: { contains: nameTopic, mode: 'insensitive' },
        idUser: idUser,
      },
      include: {
        tuVungs: true,
      },
    });

    return {
      message: 'Topics retrieved successfully',
      data: data,
      status: 200,
    };
  }

  updateTopic(idTopic: string, updateTopicDto: UpdateTopicDto) {
    const { nameTopic, idUser } = updateTopicDto;

    const existingTopic = this.databaseService.topic.findUnique({
      where: { idTopic },
    });
    if (!existingTopic) {
      throw new BadRequestException('Topic not found');
    }
    const existingUser = this.databaseService.user.findUnique({
      where: { idUser },
    });

    if (!existingUser) {
      throw new BadRequestException('User not found');
    }

    const data = this.databaseService.topic.update({
      where: { idTopic },
      data: { nameTopic, idUser },
    });
    return {
      message: 'Topic updated successfully',
      data: data,
      status: 200,
    };
  }

  async remove(idTopic: string) {
    const existingTopic = this.databaseService.topic.findUnique({
      where: { idTopic },
    });
    if (!existingTopic) {
      throw new BadRequestException('Topic not found');
    }
    await this.databaseService.topic.delete({ where: { idTopic } });

    return {
      message: 'Topic deleted successfully',
      status: 200,
    };
  }

  //Lay tu vung trong topic
  async getVocabulariesInTopic(idTopic: string) {
    const existingTopic = this.databaseService.topic.findUnique({
      where: { idTopic },
    });
    if (!existingTopic) {
      throw new BadRequestException('Topic not found');
    }
    const data = await this.databaseService.tuVung.findMany({
      where: { idTopic },
    });
    return {
      message: 'Vocabularies retrieved successfully',
      data: data,
      status: 200,
    };
  }
}
