import { ApiProperty } from '@nestjs/swagger';

export class VeriffSessionRto {
  @ApiProperty({
    description: 'The Verification URL of the session',
    example: `TODO: `,
  })
  url!: string;
}
