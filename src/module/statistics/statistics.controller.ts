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
import { CreateStatisticDto } from './dto/create-statistic.dto';
import { UpdateStatisticDto } from './dto/update-statistic.dto';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get(':idUser/weekly')
  getWeeklyStats(@Param('idUser') idUser: string) {
    return this.statisticsService.getWeeklyScores(idUser);
  }

  @Get('overall-score/:idUser')
  getOverAllScore(@Param('idUser') idUser: string){
    return this.statisticsService.OverAllScore(idUser)
  }
}
