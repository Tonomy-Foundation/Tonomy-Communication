import { HttpStatus, Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  healthCheck(res: Response) {
    // @ts-expect-error status() is not callable
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
