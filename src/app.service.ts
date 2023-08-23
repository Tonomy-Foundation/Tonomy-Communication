import { HttpStatus, Injectable } from '@nestjs/common';
import { Response } from 'express';

@Injectable()
export class AppService {
  healthCheck(res: Response) {
    res.status(HttpStatus.OK).send({
      status: 'ok',
      info: {
        service: {
          status: 'up',
        },
      },
      error: {},
      details: {
        service: {
          status: 'up',
        },
      },
    });
  }
}
