import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateReportDto {
  @ApiPropertyOptional({
    description: '검사 완료 시점 간 간격이 넓다는 경고를 사용자가 확인했는지 여부',
  })
  @IsOptional()
  @IsBoolean()
  acknowledgeDateSpanWarning?: boolean;

  @ApiPropertyOptional({
    description:
      '리포트 생성 시 사용자가 남기는 참고 메모(예: 최근 이직 준비 중). 완전히 선택 사항이며 다음 리포트에 재사용되지 않는다.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  context?: string;
}
