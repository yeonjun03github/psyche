import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class GoogleLoginDto {
  /** Google Identity Services가 프론트에서 발급한 ID 토큰(JWT). */
  @ApiProperty()
  @IsString()
  idToken!: string;
}
