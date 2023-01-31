import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class RegisterUserDto {
  @ApiProperty()
  @IsString()
  randomSeed: string;
}
