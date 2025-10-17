import {
  Controller,
  HttpException,
  HttpStatus,
  Logger,
  Get,
  Res,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery } from '@nestjs/swagger';
import { InfoService } from './info.service';
import { Response } from 'express';

@Controller('v1/info')
export class InfoController {
  private readonly logger = new Logger(InfoController.name);
  constructor(private infoService: InfoService) { }

  @Get()
  @ApiOperation({
    summary: 'Get information about the Tonomy Network',
  })
  @ApiQuery({
    name: 's',
    description: 'Source of information (cgk = CoinGecko, cmc = CoinMarketCap)',
    required: true,
    type: String,
    example: 'cgk',
  })
  @ApiQuery({
    name: 'q',
    description:
      'Query for the source (for cmc: totalcoins | circulating). Ignored for cgk.',
    required: false,
    type: String,
    example: 'totalcoins',
  })
  async getInfo(
    @Query('s') source: string,
    @Query('q') query: string | undefined,
    @Res() response: Response,
  ): Promise<void> {
    try {
      const val = await this.infoService.getInfo(source, query);

      response.status(HttpStatus.OK).send(val);
    } catch (e) {
      if (e instanceof HttpException) throw e;
      console.error(e);
      throw new HttpException(e.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
