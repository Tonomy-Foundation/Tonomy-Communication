import { HttpStatus, Injectable } from '@nestjs/common';

@Injectable()
export class AccountsService {
  createAccount(): HttpStatus {
    return HttpStatus.CREATED;
  }
}
