import { Controller, Get, Query } from '@nestjs/common';
import { WeaknessService } from './weakness.service';

@Controller('weakness')
export class WeaknessController {
  constructor(private readonly weaknessService: WeaknessService) {}

  @Get('grammar')
  async getGrammarWeakness(@Query('idUser') idUser: string) {
    const data = await this.weaknessService.getGrammarWeakness(idUser);
    return data;
  }

  @Get('question-types')
  async getQuestionTypeWeakness(@Query('idUser') idUser: string) {
    const data = await this.weaknessService.getQuestionTypeWeakness(idUser);
    return data;
  }
}
