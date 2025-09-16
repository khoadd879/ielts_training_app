import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { PartService } from './part.service';
import { CreatePartDto } from './dto/create-part.dto';
import { UpdatePartDto } from './dto/update-part.dto';
import { ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AddPartToTest } from './dto/add-part-to-test.dto';

@ApiBearerAuth()
@Controller('part')
export class PartController {
  constructor(private readonly partService: PartService) {}

  @Post('create-part')
  create(@Body() createPartDto: CreatePartDto) {
    return this.partService.create(createPartDto);
  }

  @Get('get-all-part-by-idUser/:idUser')
  findAll(@Param('idUser') idUser: string) {
    return this.partService.findAll(idUser);
  }

  @Get('get-one/:idPart')
  findOne(@Param('idPart') id: string) {
    return this.partService.findOne(id);
  }

  @Patch('update/:idPart')
  update(@Param('idPart') id: string, @Body() updatePartDto: UpdatePartDto) {
    return this.partService.update(id, updatePartDto);
  }

  @Delete('delete/:idPart')
  remove(@Param('idPart') id: string) {
    return this.partService.remove(id);
  }
}
