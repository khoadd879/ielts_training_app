import { Controller, Get, Post, Patch, Body, Query, Param, Headers, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from 'src/decorator/customize';
import { JwtAuthGuard } from 'src/auth/passport/jwt-auth.guard';
import { StudyPlannerService } from './study-planner.service';
import { CalculatePlanDto, GetPlanDto } from './dto/calculate-plan.dto';
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
      console.log('[StudyPlanner] calculatePlan called with:', JSON.stringify(dto));
      return await this.studyPlannerService.calculatePlan(dto);
    } catch (error) {
      console.error('[StudyPlanner] calculatePlan error:', error);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('plan')
  async getUserPlan(@Query() query: GetPlanDto): Promise<any> {
    try {
      console.log('[StudyPlanner] getUserPlan called with:', query.idUser);
      return await this.studyPlannerService.getUserStudyPlan(query.idUser);
    } catch (error) {
      console.error('[StudyPlanner] getUserPlan error:', error);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('preference')
  async updatePreference(
    @Body() dto: UpdatePreferenceDto,
    @Headers('x-user-id') idUser: string,
  ): Promise<any> {
    return this.studyPlannerService.updateStudyPreference(idUser, dto.dailyMinutesAvailable);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('daily-tasks/:taskId/complete')
  async completeTask(
    @Param('taskId') taskId: string,
    @Body() dto: CompleteTaskDto,
    @Headers('x-user-id') idUser: string = 'default-user',
  ): Promise<any> {
    const idStudyPlan = 'current-plan';
    return this.studyPlannerService.completeTask(idUser, idStudyPlan, taskId, dto);
  }
}