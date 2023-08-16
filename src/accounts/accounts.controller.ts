import { Controller, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AccountsService } from './accounts.service';

@Controller('accounts')
export class AccountsController {
  constructor(private accountService: AccountsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create new account',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'New account created',
  })
  createAccount(): HttpStatus {
    return this.accountService.createAccount();
  }
}
