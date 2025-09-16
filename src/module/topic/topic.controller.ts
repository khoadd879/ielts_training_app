import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { TopicService } from './topic.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('topic')
export class TopicController {
  constructor(private readonly topicService: TopicService) {}

  @Post('create-topic')
  createTopic(@Body() createTopicDto: CreateTopicDto) {
    return this.topicService.createTopic(createTopicDto);
  }

  @Get('get-all-by-idUser/:idUser')
  findAllByName(@Param('idUser') idUser: string) {
    return this.topicService.findAllByIdUser(idUser);
  }

  @Get('get-all-by-name/:idUser')
  findOne(@Param('idUser') idUser: string, nameTopic) {
    return this.topicService.findByName(nameTopic, idUser);
  }

  @Patch('update/:idTopic')
  update(
    @Param('idTopic') idTopic: string,
    @Body() updateTopicDto: UpdateTopicDto,
  ) {
    return this.topicService.updateTopic(idTopic, updateTopicDto);
  }

  @Delete('delete/:idTopic')
  remove(@Param('idTopic') idTopic: string) {
    return this.topicService.remove(idTopic);
  }

  @Get('get-vocabularies-in-topic/:idTopic')
  getVocabulariesInTopic(@Param('idTopic') idTopic: string) {
    return this.topicService.getVocabulariesInTopic(idTopic);
  }
}
