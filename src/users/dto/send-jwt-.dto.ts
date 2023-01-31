import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, isString, IsString } from 'class-validator';

export class SendJwtDto {
  @ApiProperty()
  @IsString({ each: true })
  requests: string[];
  //TODO: account must be replaces later

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accountName?: string;
}
