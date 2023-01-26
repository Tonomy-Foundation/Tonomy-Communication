import { isNumber, IsNumberString } from 'class-validator';

export class RegisterUserDto {
  @IsNumberString()
  randomSeed: number;
}
