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
        loaiDe: { type: 'string', example: 'LISTENING' },
        title: { type: 'string', example: 'Sample Test Title' },
        description: { type: 'string', example: 'This is a test description' },
        duration: { type: 'number', example: 60 },
        numberQuestion: { type: 'number', example: 10 },
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
  findAll(@Param('idUser') id: string) {
    return this.testService.findAllTestCreatedByIdUser(id);
  }

  @Get('get-by-name')
  @ApiQuery({ name: 'tieuDe', required: true, description: 'Tên đề cần tìm' })
  findByName(@Body('tieuDe') tieuDe: string) {
    return this.testService.findByName(tieuDe);
  }

  @Patch('update-test/:idDe')
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
        loaiDe: { type: 'string', example: 'LISTENING' },
        title: { type: 'string', example: 'Sample Test Title' },
        description: { type: 'string', example: 'This is a test description' },
        duration: { type: 'number', example: 60 },
        numberQuestion: { type: 'number', example: 10 },
        img: { type: 'string', format: 'binary' }, // ảnh upload
        audioUrl: { type: 'string', format: 'binary' }, // file âm thanh upload
      },
    },
  })
  update(
    @Param('idDe') id: string,
    @Body() updateTestDto: UpdateTestDto,
    @UploadedFiles()
    files: { img?: Express.Multer.File[]; audioUrl?: Express.Multer.File[] },
  ) {
    return this.testService.update(
      id,
      updateTestDto,
      files?.img?.[0],
      files?.audioUrl?.[0],
    );
  }

  @Delete('delete-test/:id')
  remove(@Param('id') id: string) {
    return this.testService.remove(id);
  }

  @Get('get-part-in-test/:idDe')
  getPartInTest(@Param('idDe') idDe: string) {
    return this.testService.getPartInTest(idDe);
  }

  @Get('get-all-test')
  @Public()
  getAllTest() {
    return this.testService.findAll();
  }
}
