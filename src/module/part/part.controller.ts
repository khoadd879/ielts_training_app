import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PartService } from './part.service';
import { CreatePartDto } from './dto/create-part.dto';
import { UpdatePartDto } from './dto/update-part.dto';
import { ApiBearerAuth, ApiBody } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('part')
export class PartController {
  constructor(private readonly partService: PartService) {}

  @Post('create-part')
  create(@Body() createPartDto: CreatePartDto) {
    return this.partService.create(createPartDto);
  }

  @Get('get-all-part-by-idTest/:idTest')
  findAll(@Param('idTest') idPart: string) {
    return this.partService.findAll(idPart);
  }

  @Get('get-one/:idPart')
  findOne(@Param('idPart') id: string) {
    return this.partService.findOne(id);
  }

  @Patch('update/:idPart')
  update(
    @Param('idPart') idPart: string,
    @Body() updatePartDto: UpdatePartDto,
  ) {
    return this.partService.update(idPart, updatePartDto);
  }

  @Delete('delete/:idPart')
  remove(@Param('idPart') idPart: string) {
    return this.partService.remove(idPart);
  }
}
