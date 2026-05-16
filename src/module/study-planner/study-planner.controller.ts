import { Controller, Get, Post, Patch, Body, Query, Param, Headers } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { StudyPlannerService } from './study-planner.service';
import { CalculatePlanDto, GetPlanDto } from './dto/calculate-plan.dto';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { UpdatePreferenceDto } from './dto/update-preference.dto';

@ApiBearerAuth()
@ApiTags('Study Planner')
@Controller('study-planner')
export class StudyPlannerController {
  constructor(private readonly studyPlannerService: StudyPlannerService) {}

  @Post('calculate')
  calculatePlan(@Body() dto: CalculatePlanDto): Promise<any> {
    return this.studyPlannerService.calculatePlan(dto);
  }

  @Get('plan')
  getUserPlan(@Query() query: GetPlanDto): Promise<any> {
    return this.studyPlannerService.getUserStudyPlan(query.idUser);
  }

  @Patch('preference')
  async updatePreference(
    @Body() dto: UpdatePreferenceDto,
    @Headers('x-user-id') idUser: string,
  ): Promise<any> {
    return this.studyPlannerService.updateStudyPreference(idUser, dto.dailyMinutesAvailable);
  }

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