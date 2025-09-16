import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { TestService } from './test.service';
import { CreateTestDto } from './dto/create-test.dto';
import { UpdateTestDto } from './dto/update-test.dto';
import { ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('test')
@ApiBearerAuth()
export class TestController {
  constructor(private readonly testService: TestService) {}

  @Post('create-test')
  @UseInterceptors(FileInterceptor('img'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        idUser: { type: 'string', example: '123' },
        loaiDe: { type: 'string', example: 'LISTENING' },
        title: { type: 'string', example: 'Sample Test Title' },
        description: { type: 'string', example: 'This is a test description' },
        duration: { type: 'number', example: 60 },
        numberQuestion: { type: 'number', example: 10 },
        img: { type: 'string', format: 'binary' },
      },
    },
  })
  async create(
    @Body() createTestDto: CreateTestDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.testService.createTest(createTestDto, file);
  }

  @Get('get-all-by-id-user/:idUser')
  findAll(@Param('idUser') id: string) {
    return this.testService.findAllTestCreatedByIdUser(id);
  }

  @Get('get-by-name')
  findByName(@Body() tieuDe: string) {
    return this.testService.findByName(tieuDe);
  }

  @Patch('update-test/:idDe')
  @UseInterceptors(FileInterceptor('img'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        idUser: { type: 'string', example: '123' },
        loaiDe: { type: 'string', example: 'LISTENING' },
        title: { type: 'string', example: 'Sample Test Title' },
        description: { type: 'string', example: 'This is a test description' },
        duration: { type: 'number', example: 60 },
        numberQuestion: { type: 'number', example: 10 },
        img: { type: 'string', format: 'binary' },
      },
    },
  })
  update(
    @Param('idDe') id: string,
    @Body() updateTestDto: UpdateTestDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.testService.update(id, updateTestDto, file);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.testService.remove(id);
  }

  @Get('get-part-in-test/:idDe')
  getVocabulariesInTopic(@Param('idDe') idDe: string) {
    return this.testService.getVocabulariesInTopic(idDe);
  }
}
