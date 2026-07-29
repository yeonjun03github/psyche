import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CLAIM_SECTION_KEYS, type ClaimSectionKey, type FeedbackVerdict } from '@psyche/shared';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const FEEDBACK_VERDICTS: FeedbackVerdict[] = ['CONFIRMED', 'PARTIALLY_CONFIRMED', 'REJECTED'];

export class UpsertFeedbackDto {
  @ApiProperty({ enum: CLAIM_SECTION_KEYS, description: '피드백을 남길 해석적 섹션 키' })
  @IsIn(CLAIM_SECTION_KEYS)
  section!: ClaimSectionKey;

  @ApiProperty({ enum: FEEDBACK_VERDICTS })
  @IsIn(FEEDBACK_VERDICTS)
  verdict!: FeedbackVerdict;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
