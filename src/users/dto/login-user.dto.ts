import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';

export enum Client {
  BROWSER = 'BROWSER',
  APP = 'APP',
}

export class LoginUserDto {
  @ApiProperty({ enum: Client })
  @IsEnum(Client)
  client: Client;

  @ApiProperty()
  @IsString()
  username: string;
}
