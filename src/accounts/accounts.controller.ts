import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import {
  CreateAccountRequest,
  CreateAccountResponse,
} from './dto/create-account.dto';
import { Response } from 'express';

@Controller('accounts')
export class AccountsController {
  private readonly logger = new Logger(AccountsController.name);
  constructor(private accountService: AccountsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new Tonomy ID account on the blockchain',
  })
  @ApiParam({
    name: 'usernameHash',
    description: 'sha256 hash of username',
    required: true,
    type: 'string',
    example: 'b06ecffb7ad2e992e82c1f3a23341bca36f8337f74032c00c489c21b00f66e52',
  })
  @ApiParam({
    name: 'salt',
    description: 'Salt used to generate the private key',
    required: true,
    type: 'string',
    example: 'b06ecffb7ad2e992e82c1f3a23341bca36f8337f74032c00c489c21b00f66e52',
  })
  @ApiParam({
    name: 'publicKey',
    description: 'Public key that will control the account',
    example: 'PUB_K1_6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5BoDq63',
    required: true,
  })
  @ApiParam({
    name: 'captchaToken',
    description: 'The hCaptcha token',
    required: true,
    type: 'string',
    example: '10000000-aaaa-bbbb-cccc-000000000001',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'New account created',
    type: CreateAccountResponse,
  })
  async createAccount(
    @Body() createAccountDto: CreateAccountRequest,
    @Res() response: Response,
  ): Promise<void> {
    try {
      const val = await this.accountService.createAccount(createAccountDto);

      response.status(HttpStatus.CREATED).send(val);
    } catch (e) {
      if (e instanceof HttpException) throw e;
      console.error(e);
      this.logger.error(e);
      throw new HttpException(e.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
