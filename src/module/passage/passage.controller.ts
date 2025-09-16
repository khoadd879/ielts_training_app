import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PassageService } from './passage.service';
import { CreatePassageDto } from './dto/create-passage.dto';
import { UpdatePassageDto } from './dto/update-passage.dto';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('passage')
export class PassageController {
  constructor(private readonly passageService: PassageService) {}

  @Post('create-passage')
  create(@Body() createPassageDto: CreatePassageDto) {
    return this.passageService.createPassage(createPassageDto);
  }

  @Get('get-by-idPart/:idPart')
  findAll(@Param('idPart') idPart: string) {
    return this.passageService.findAllByIdPart(idPart);
  }

  @Get('get-by-id/:idPassage')
  findOne(@Param('idPassage') idPassage: string) {
    return this.passageService.findById(idPassage);
  }

  @Patch('update-passage/:idPassage')
  update(
    @Param('idPassage') idPassage: string,
    @Body() updatePassageDto: UpdatePassageDto,
  ) {
    return this.passageService.updatePassage(idPassage, updatePassageDto);
  }

  @Delete('delete-passage/:idPassage')
  remove(@Param('idPassage') idPassage: string) {
    return this.passageService.removePassage(idPassage);
  }
}
