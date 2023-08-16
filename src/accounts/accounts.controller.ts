import {
  Body,
  Controller,
  HttpStatus,
  Logger,
  Post,
  Res,
} from '@nestjs/common';
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
    const val = await this.accountService.createAccount(createAccountDto);

    // @ts-expect-error status is not callable
    return response.status(HttpStatus.CREATED).send(val);
  }
}
