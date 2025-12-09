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
}
