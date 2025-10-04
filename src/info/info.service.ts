import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';

@Injectable()
export class InfoService {
  private readonly logger = new Logger(InfoService.name);

  async getInfo(source: string, query?: string): Promise<unknown> {
    this.logger.debug(`getInfo() source=${source} query=${query ?? ''}`);

    switch (source ? source.toLowerCase() : '') {
      case 'cgk':
        return await this.getFromCoinGecko(query);
      case 'cmc':
        return await this.getFromCoinMarketCap(query);
      default:
        return await this.getFromCoinGecko(query);
    }
  }

  private async getFromCoinGecko(query?: string): Promise<unknown> {
    // Stub implementation. Replace with real CoinGecko fetch logic.
    // Intentionally not using network calls yet.
    return {
      source: 'coingecko',
      status: 'stub',
      query: query ?? null,
      data: null,
    };
  }

  private async getFromCoinMarketCap(query?: string): Promise<unknown> {
    // Stub implementation. Replace with real CoinMarketCap fetch logic.
    if (!query) {
      throw new HttpException(
        'Query parameter "q" is required for source cmc',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!['totalcoins', 'circulating'].includes(query.toLowerCase())) {
      throw new HttpException(
        'Unsupported cmc query. Allowed values: totalcoins, circulating',
        HttpStatus.BAD_REQUEST,
      );
    }

    return {
      source: 'coinmarketcap',
      status: 'stub',
      query,
      data: null,
    };
  }
}
