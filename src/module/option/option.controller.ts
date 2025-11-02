import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { OptionService } from './option.service';

import { UpdateOptionDto } from './dto/update-option.dto';
import { ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { CreateManyOptionsDto } from './dto/create-many-options.dto';

@ApiBearerAuth()
@Controller('option')
export class OptionController {
  constructor(private readonly optionService: OptionService) {}

  @Post('create-many-option')
  @ApiBody({ type: CreateManyOptionsDto })
  createManyOptions(@Body() body: CreateManyOptionsDto) {
    return this.optionService.createManyOptions(body.options);
  }

  @Get('get-all-by-id-question/:idQuestion')
  findAllbyIdQuestion(@Param('idQuestion') idQuestion: string) {
    return this.optionService.findAllbyIdQuestion(idQuestion);
  }

  @Patch('update-option/:idOption')
  updateOption(
    @Param('idOption') idOption: string,
    @Body() updateOptionDto: UpdateOptionDto,
  ) {
    return this.optionService.updateOption(idOption, updateOptionDto);
  }

  @Delete('delete-option/:idQuestion')
  removeOne(@Param('idOption') idOption: string) {
    return this.optionService.removeOption(idOption);
  }
}
