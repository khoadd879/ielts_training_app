import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum ForumReviewActionStatus {
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CHANGES_REQUESTED = 'changes_requested',
}

export class ReviewForumPostDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'b5b63063-6ed1-4ed6-941f-0f6f2f9b3132' })
  idReviewer: string;

  @IsNotEmpty()
  @IsEnum(ForumReviewActionStatus)
  @ApiProperty({
    enum: ForumReviewActionStatus,
    example: ForumReviewActionStatus.APPROVED,
  })
  status: ForumReviewActionStatus;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    example: 'Bài cần bổ sung nguồn tham khảo và làm rõ luận điểm ở đoạn kết.',
  })
  note?: string;
}
