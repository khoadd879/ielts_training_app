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
import { CreateOptionDto } from './dto/create-option.dto';
import { UpdateOptionDto } from './dto/update-option.dto';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('option')
export class OptionController {
  constructor(private readonly optionService: OptionService) {}

  @Post('create-many-option')
  createManyOptions(@Body() createOptionDto: CreateOptionDto[]) {
    return this.optionService.createManyOptions(createOptionDto);
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

  @Delete('delete-option/:id')
  removeOne(@Param('idOption') idOption: string) {
    return this.optionService.removeOption(idOption);
  }
}
