import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { RecommendTestService } from './recommend-test.service';
import { CreateRecommendTestDto } from './dto/create-recommend-test.dto';
import { UpdateRecommendTestDto } from './dto/update-recommend-test.dto';

@Controller('recommend-test')
export class RecommendTestController {
  constructor(private readonly recommendTestService: RecommendTestService) {}
}
