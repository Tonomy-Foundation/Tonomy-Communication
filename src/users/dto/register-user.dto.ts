import { IsNumber, IsString } from 'class-validator';

export class RegisterUserDto {
  @IsString()
  randomSeed: string;
}
