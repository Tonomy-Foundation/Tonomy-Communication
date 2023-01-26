import { Logger, Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersGateway } from './users.gateway';

@Module({
  providers: [UsersGateway, UsersService, Logger],
})
export class UsersModule {}
