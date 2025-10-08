import { Controller, Post, Body } from '@nestjs/common';
import { ReviewStreakService } from './review-streak.service';
import { SubmitReviewDto } from './dto/submit-review.dto'; // Import DTO
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('review-streak')
export class ReviewStreakController {
  constructor(private readonly reviewStreakService: ReviewStreakService) {}

  @Post('vocabulary/submit')
  async submitVocabularyReview(@Body() submitReviewDto: SubmitReviewDto) {
    // Chỉ cần truyền thẳng DTO đã được validate vào service
    return this.reviewStreakService.submitVocabularyReview(submitReviewDto);
  }
}
