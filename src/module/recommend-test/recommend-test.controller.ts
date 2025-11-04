import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { RecommendTestService } from './recommend-test.service';
import { CreateRecommendTestDto } from './dto/create-recommend-test.dto';
import { UpdateRecommendTestDto } from './dto/update-recommend-test.dto';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('recommend-test')
export class RecommendTestController {
  constructor(private readonly recommendTestService: RecommendTestService) {}

  @Get('get-recommend-test/:idUser')
  getRecommendTestByIdUser(@Param('idUser') idUser: string) {
    return this.recommendTestService.getSimpleRecommendations(idUser);
  }
}
