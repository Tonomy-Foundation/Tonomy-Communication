import { IsOptional, isString, IsString } from 'class-validator';

export class SendJwtDto {
  @IsString({ each: true })
  requests: string[];
  //TODO: account must be replaces later

  @IsOptional()
  @IsString()
  accountName?: string;
}
