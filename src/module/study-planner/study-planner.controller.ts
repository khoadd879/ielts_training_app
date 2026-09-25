import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from 'src/decorator/customize';
import { JwtAuthGuard } from 'src/auth/passport/jwt-auth.guard';
import { StudyPlannerService } from './study-planner.service';
import { CalculatePlanDto } from './dto/calculate-plan.dto';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { UpdatePreferenceDto } from './dto/update-preference.dto';

@ApiTags('Study Planner')
@Controller('study-planner')
export class StudyPlannerController {
  constructor(private readonly studyPlannerService: StudyPlannerService) {}

  @Public()
  @Post('calculate')
  async calculatePlan(@Body() dto: CalculatePlanDto): Promise<any> {
    try {
      console.log(
        '[StudyPlanner] calculatePlan called with:',
        JSON.stringify(dto),
      );
      return await this.studyPlannerService.calculatePlan(dto);
    } catch (error) {
      console.error('[StudyPlanner] calculatePlan error:', error);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('plan')
  async getUserPlan(
    @Query('historyMonths') historyMonths: number | undefined,
    @Request() req: any,
  ): Promise<any> {
    const idUser = req.user.userId;
    try {
      console.log(
        '[StudyPlanner] getUserPlan called with:',
        idUser,
        'historyMonths:',
        historyMonths,
      );
      return await this.studyPlannerService.getUserStudyPlan(
        idUser,
        historyMonths,
      );
    } catch (error) {
      console.error('[StudyPlanner] getUserPlan error:', error);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('daily-completion')
  async getDailyCompletion(
    @Query('date') date: string | undefined,
    @Request() req: any,
  ): Promise<any> {
    const idUser = req.user.userId;
    return this.studyPlannerService.getDailyCompletion(idUser, date);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('preference')
  async updatePreference(
    @Body() dto: UpdatePreferenceDto,
    @Request() req: any,
  ): Promise<any> {
    const idUser = req.user.userId;
    return this.studyPlannerService.updateStudyPreference(
      idUser,
      dto.dailyMinutesAvailable,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('daily-tasks/:taskId/complete')
  async completeTask(
    @Param('taskId') taskId: string,
    @Body() dto: CompleteTaskDto,
    @Request() req: any,
  ): Promise<any> {
    const idUser = req.user.userId;
    const idStudyPlan = 'current-plan';
    return this.studyPlannerService.completeTask(
      idUser,
      idStudyPlan,
      taskId,
      dto,
    );
  }
}
