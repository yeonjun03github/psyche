import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class CreateReportDto {
  @ApiPropertyOptional({
    description: '검사 완료 시점 간 간격이 넓다는 경고를 사용자가 확인했는지 여부',
  })
  @IsOptional()
  @IsBoolean()
  acknowledgeDateSpanWarning?: boolean;
}
