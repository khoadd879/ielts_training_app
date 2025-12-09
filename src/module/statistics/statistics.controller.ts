import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CreateTargetExam } from './dto/create-target-exam.dto';

@ApiBearerAuth()
@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('overall-score/:idUser')
  getOverAllScore(@Param('idUser') idUser: string){
    return this.statisticsService.OverAllScore(idUser)
  }

  @Get('get-avg-score-by-day/:idUser')
  getAvgScoreByDay(@Param('idUser') idUser: string){
    return this.statisticsService.statistic(idUser)
  }

  @Patch('create-target/:idUser')
  createTarget(@Param('idUser') idUser: string, @Body()createTarget: CreateTargetExam){
    return this.statisticsService.addTargetExam(idUser, createTarget)
  }
}
