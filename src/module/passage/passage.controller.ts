import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
} from '@nestjs/common';
import { PassageService } from './passage.service';
import { CreatePassageDto } from './dto/create-passage.dto';
import { UpdatePassageDto } from './dto/update-passage.dto';
import { ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiBearerAuth()
@Controller('passage')
export class PassageController {
  constructor(private readonly passageService: PassageService) {}

  @Post('create-passage')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        idPart: { type: 'string', example: '123' },
        title: { type: 'string', example: 'Passage Title' },
        content: { type: 'string', example: 'This is the content...' },
        description: { type: 'string', example: 'Description text' },
        numberParagraph: { type: 'number', example: 1 },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  create(
    @Body() createPassageDto: CreatePassageDto,
    file?: Express.Multer.File,
  ) {
    return this.passageService.createPassage(createPassageDto, file);
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
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        idPart: { type: 'string', example: '123' },
        title: { type: 'string', example: 'Passage Title' },
        content: { type: 'string', example: 'This is the content...' },
        description: { type: 'string', example: 'Description text' },
        numberParagraph: { type: 'number', example: 1 },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  update(
    @Param('idPassage') idPassage: string,
    @Body() updatePassageDto: UpdatePassageDto,
    file?: Express.Multer.File,
  ) {
    return this.passageService.updatePassage(idPassage, updatePassageDto, file);
  }

  @Delete('delete-passage/:idPassage')
  remove(@Param('idPassage') idPassage: string) {
    return this.passageService.removePassage(idPassage);
  }
}
