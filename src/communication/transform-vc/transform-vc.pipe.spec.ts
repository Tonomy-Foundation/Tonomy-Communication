import { setSettings } from '@tonomy/tonomy-id-sdk';
import { BodyDto } from '../dto/body.dto';
import { TransformVcPipe } from './transform-vc.pipe';
import { Body, HttpException } from '@nestjs/common';

setSettings({
  blockchainUrl: 'http://localhost:8888',
});

describe('TransformVcPipe', () => {
  it('should be defined', () => {
    expect(new TransformVcPipe()).toBeDefined();
  });

  it('must transform antelope VC into message object and verifies it', async () => {
    const vc =
      'eyJhbGciOiJFUzI1NkstUiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkaWQ6andrOmV5SmpjbllpT2lKelpXTndNalUyYXpFaUxDSnJkSGtpT2lKRlF5SXNJbmdpT2lKWmFGTlJaeloyUkNzclpUSldkRkJGTWxWbVNrb3ZPR3BLU3k5SlpEaFdWMDVwTlcxVVJXNTJNalJGUFNJc0lua2lPaUpQVEZKT2RscDNhemRHYURKNGR6UnFja296WkZsYVQwWlJaMWN5YlRJM1pHWkdOVUZ3Y0ZveUwwaFZQU0lzSW10cFpDSTZJbEJWUWw5TE1WODNZVkp5Y204NFkybFJiemt5TVRSWFVrZDVhVU5vY25wQk9WZDBWMGhFTldKelExTjZTbFI2Wm5KV2JtVmhURVJJTmlKOSIsImp0aSI6Imh0dHBzOi8vZXhhbXBsZS5jb20vaWQvMTIzNDMyNCIsIm5iZiI6MTY3OTk5NDMwNywidmMiOnsiQGNvbnRleHQiOlsiaHR0cHM6Ly93d3cudzMub3JnLzIwMTgvY3JlZGVudGlhbHMvdjEiXSwiY3JlZGVudGlhbFN1YmplY3QiOnsibWVzc2FnZSI6eyJjYWxsYmFja1BhdGgiOiIvY2FsbGJhY2siLCJvcmlnaW4iOiJodHRwOi8vMTkyLjE2OC42OC4xMTI6MzAwMSIsInB1YmxpY0tleSI6IlBVQl9LMV83YVJycm84Y2lRbzkyMTRXUkd5aUNocnpBOVd0V0hENWJzQ1N6SlR6ZnJWbmVhTERINiIsInJhbmRvbVN0cmluZyI6IjQzYWVmODYxZjdhMWU2OThjZDkzZjNlMTk1ZTNiZDA2NmIwM2Y4OGFiNTk4YzcxZWFlNWJmYTkxMmYwNjlmYzAifX0sInR5cGUiOlsiVmVyaWZpYWJsZUNyZWRlbnRpYWwiXX19.zR5n3nZSGFjs6fRhbnDLfcWgWC1NMwOx1tuVijxi0Ixgzf4I3VrfTKkrzZP6ryrG_yUk_ecQvs8auzNEeqATxQA';
    const pipe = new TransformVcPipe();
    const result = (await pipe.transform(
      { message: vc },
      { type: 'body' },
    )) as BodyDto;

    expect(result.value).toBeDefined();
    expect(result.value?.toString()).toBe(vc);
  });

  it('Verification fails if message isnt valid', async () => {
    const vc =
      'eyJhbGciOiJFUzI1NkstUiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkaWQ6andrOmV5SmpjbllpT2lKelpXTndNalUyYXpFaUxDSnJkSGtpT2lKRlF5SXNJbmdpT2lKWmFGTlJaeloyUkNzclpUSldkRkJGTWxWbVNrb3ZPR3BLU3k5SlpEaFdWMDVwTlcxVVJXNTJNalJGUFNJc0lua2lPaUpQVEZKT2RscDNhemRHYURKNGR6UnFja296WkZsYVQwWlJaMWN5YlRJM1pHWkdOVUZ3Y0ZveUwwaFZQU0lzSW10cFpDSTZJbEJWUWw5TE1WODNZVkp5Y204NFkybFJiemt5TVRSWFVrZDVhVU5vY25wQk9WZDBWMGhFTldKelExTjZTbFI2Wm5KV2JtVmhURVJJTmlKOSIsImp0aSI6Imh0dHBzOi8vZXhhbXBsZS5jb20vaWQvMTIzNDMyNCIsIm5iZiI6MTY3OTk5NDMwNywidmMiOnsiQGNvbnRleHQiOlsiaHR0cHM6Ly93d3cudzMub3JnLzIwMTgvY3JlZGVudGlhbHMvdjEiXSwiY3JlZGVudGlhbFN1YmplY3QiOnsibWVzc2FnZSI6eyJjYWxsYmFja1BhdGgiOiIvY2FsbGJhY2siLCJvcmlnaW4iOiJodHRwOi8vMTkyLjE2OC42OC4xMTI6MzAwMSIsInB1YmxpY0tleSI6IlBVQl9LMV83YVJycm84Y2lRbzkyMTRXUkd5aUNocnpBOVd0V0hENWJzQ1N6SlR6ZnJWbmVhTERINiIsInJhbmRvbVN0cmluZyI6IjQzYWVmODYxZjdhMWU2OThjZDkzZjNlMTk1ZTNiZDA2NmIwM2Y4OGFiNTk4YzcxZWFlNWJmYTkxMmYwNjlmYzAifX0sInR5cGUiOlsiVmVyaWZpYWJsZUNyZWRlbnRpYWwiXX19.zR5n3nZSGFjs6fRhbnDLfcWgWC1NMwOx1tuVijxi0If4I3VrfTKkrzZP6ryrG_yUk_ecQvs8auzNEeqATxQA';
    const pipe = new TransformVcPipe();

    const result = (await pipe.transform(
      { message: vc },
      { type: 'body' },
    )) as BodyDto;

    expect(result.error.status).toBe(500);
    expect(result.error.message).toBe('wrong signature length');
  });
});
