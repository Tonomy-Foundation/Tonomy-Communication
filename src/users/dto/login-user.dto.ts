import { IsEnum, IsString } from 'class-validator';

export enum Client {
  browser = 'browser',
  app = 'app',
}

export class LoginUserDto {
  @IsEnum(Client)
  client: Client;

  @IsString()
  username: string;
}
