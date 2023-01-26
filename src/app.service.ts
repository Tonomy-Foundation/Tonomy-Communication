import { HttpStatus, Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  status(): HttpStatus {
    return HttpStatus.OK;
  }
}
