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
  })
  @ApiParam({
    name: 'salt',
    description: 'Salt used to generate the private key',
    required: true,
    type: 'string',
  })
  @ApiParam({
    name: 'keys',
    description:
      'Array of keys and levels that should be added to the new account',
    required: true,
    format: 'array',
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
    try {
      const val = await this.accountService.createAccount(createAccountDto);

      // @ts-expect-error status is not callable
      return response.status(HttpStatus.CREATED).send(val);
    } catch (e) {
      this.logger.error(e);
      throw new HttpException(e.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
