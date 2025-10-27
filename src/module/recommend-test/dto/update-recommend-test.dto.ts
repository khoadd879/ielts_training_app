import { PartialType } from '@nestjs/swagger';
import { CreateRecommendTestDto } from './create-recommend-test.dto';

export class UpdateRecommendTestDto extends PartialType(CreateRecommendTestDto) {}
