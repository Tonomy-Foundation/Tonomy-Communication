import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';

export enum Client {
  browser = 'browser',
  app = 'app',
}

export class LoginUserDto {
  @ApiProperty({ enum: Client })
  @IsEnum(Client)
  client: Client;

  @ApiProperty()
  @IsString()
  username: string;
}
