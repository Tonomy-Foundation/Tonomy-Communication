import { Body, Controller, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';

@Controller('accounts')
export class AccountsController {
  constructor(private accountService: AccountsService) {}

  @Post()
  @ApiParam({
    name: 'usernameHash',
    type: 'string',
    description: 'The sha256 hash of the username',
    required: true,
  })
  @ApiParam({
    name: 'keys',
    type: 'array',
    description: 'The keys to be added to the account',
    required: true,
  })
  @ApiOperation({
    summary: 'Create a new Tonomy ID account on the blockchain',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'New account created',
  })
  createAccount(@Body() createAccountDto: CreateAccountDto): HttpStatus {
    return this.accountService.createAccount(createAccountDto);
  }
}
