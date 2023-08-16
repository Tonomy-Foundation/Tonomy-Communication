import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateAccountDto } from './dto/create-account.dto';

@Injectable()
export class AccountsService {
  createAccount(createAccountDto: CreateAccountDto): HttpStatus {
    return HttpStatus.CREATED;
  }
}
