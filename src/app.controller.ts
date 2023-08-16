import { Controller, Get, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

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
  checkHealth(): HttpStatus {
    return this.appService.healthCheck();
  }
}
