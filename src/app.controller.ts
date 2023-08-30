import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';

@Controller()
export class AppController {
  constructor(private appService: AppService) {}

  @Get()
  @ApiOperation({
    summary: 'Health check',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Health check',
  })
  checkHealth(@Res() res: Response) {
    this.appService.healthCheck(res);
  }
}
