import { Controller, Post, Body } from '@nestjs/common';
import { ReviewStreakService } from './review-streak.service';
import { SubmitReviewDto } from './dto/submit-review.dto';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('review-streak')
export class ReviewStreakController {
  constructor(private readonly reviewStreakService: ReviewStreakService) {}

  @Post('vocabulary/submit')
  submitVocabularyReview(@Body() submitReviewDto: SubmitReviewDto) {
    return this.reviewStreakService.submitVocabularyReview(submitReviewDto);
  }
}
