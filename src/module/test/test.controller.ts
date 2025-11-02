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
  UploadedFiles,
} from '@nestjs/common';
import { TestService } from './test.service';
import { CreateTestDto } from './dto/create-test.dto';
import { UpdateTestDto } from './dto/update-test.dto';
import { ApiBearerAuth, ApiConsumes, ApiBody, ApiQuery } from '@nestjs/swagger';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { Public } from 'src/decorator/customize';

@Controller('test')
@ApiBearerAuth()
export class TestController {
  constructor(private readonly testService: TestService) {}

  @Post('create-test')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'img', maxCount: 1 }, // ảnh
      { name: 'audioUrl', maxCount: 1 }, // âm thanh
    ]),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        idUser: { type: 'string', example: '123' },
        testType: { type: 'string', example: 'LISTENING' },
        title: { type: 'string', example: 'Sample Test Title' },
        description: { type: 'string', example: 'This is a test description' },
        duration: { type: 'number', example: 60 },
        numberQuestion: { type: 'number', example: 10 },
        level: { type: 'string', example: 'Low' },
        img: { type: 'string', format: 'binary' }, // ảnh upload
        audioUrl: { type: 'string', format: 'binary' }, // file âm thanh upload
      },
    },
  })
  async create(
    @Body() createTestDto: CreateTestDto,
    @UploadedFiles()
    files: { img?: Express.Multer.File[]; audioUrl?: Express.Multer.File[] },
  ) {
    return this.testService.createTest(
      createTestDto,
      files?.img?.[0],
      files?.audioUrl?.[0],
    );
  }

  @Get('get-all-by-id-user/:idUser')
  findAll(@Param('idUser') idUser: string) {
    return this.testService.findAllTestCreatedByIdUser(idUser);
  }

  @Patch('update-test/:idTest')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'img', maxCount: 1 }, // ảnh
      { name: 'audioUrl', maxCount: 1 }, // âm thanh
    ]),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        idUser: { type: 'string', example: '123' },
        testType: { type: 'string', example: 'LISTENING' },
        title: { type: 'string', example: 'Sample Test Title' },
        description: { type: 'string', example: 'This is a test description' },
        duration: { type: 'number', example: 60 },
        numberQuestion: { type: 'number', example: 10 },
        level: { type: 'string', example: 'Low' },
        img: { type: 'string', format: 'binary' }, // ảnh upload
        audioUrl: { type: 'string', format: 'binary' }, // file âm thanh upload
      },
    },
  })
  update(
    @Param('idTest') idTest: string,
    @Body() updateTestDto: UpdateTestDto,
    @UploadedFiles()
    files: { img?: Express.Multer.File[]; audioUrl?: Express.Multer.File[] },
  ) {
    return this.testService.update(
      idTest,
      updateTestDto,
      files?.img?.[0],
      files?.audioUrl?.[0],
    );
  }

  @Get('get-part-in-test/:idTest')
  getPartInTest(@Param('idTest') idTest: string) {
    return this.testService.getPartInTest(idTest);
  }

  @Get('get-all-test')
  @Public()
  getAllTest() {
    return this.testService.findAll();
  }

  @Delete('delete-test/:idTest')
  remove(@Param('idTest') idTest: string) {
    return this.testService.remove(idTest);
  }
}
