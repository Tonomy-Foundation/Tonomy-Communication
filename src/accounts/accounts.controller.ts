import { Body, Controller, HttpStatus, Post, Res } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import {
  CreateAccountRequest,
  CreateAccountResponse,
} from './dto/create-account.dto';

@Controller('accounts')
export class AccountsController {
  constructor(private accountService: AccountsService) {}

  @Post()
  @ApiBody({
    type: CreateAccountRequest,
    description: 'The account to be created',
  })
  @ApiOperation({
    summary: 'Create a new Tonomy ID account on the blockchain',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'New account created',
    type: CreateAccountResponse,
  })
  async createAccount(
    @Body() createAccountDto: CreateAccountRequest,
    @Res() response: Response,
  ): Promise<CreateAccountResponse> {
    return this.accountService.createAccount(createAccountDto, response);
  }
}
