import { ApiProperty } from '@nestjs/swagger';

export class CreateAccountRequest {
  @ApiProperty({
    required: true,
    description: 'sha256 hash of username',
    example: 'b06ecffb7ad2e992e82c1f3a23341bca36f8337f74032c00c489c21b00f66e52',
  })
  usernameHash?: string;

  @ApiProperty({
    required: true,
    description: 'Salt used to generate the private key',
    example: 'b06ecffb7ad2e992e82c1f3a23341bca36f8337f74032c00c489c21b00f66e52',
  })
  salt?: string;

  @ApiProperty({
    required: true,
    description: 'Public key that will control the account',
    example: 'PUB_K1_6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5BoDq63',
  })
  publicKey?: string;

  @ApiProperty({
    required: true,
    description: 'The hCaptcha token',
    example: '10000000-aaaa-bbbb-cccc-000000000001',
    type: 'string',
  })
  captchaToken?: string;
}

export class CreateAccountResponse {
  @ApiProperty({
    example: 'dfd401c1dcd5fd4ff7836dfe5e3b54630a077ea01643c1529ac20e4e03b26763',
  })
  transactionId!: string;

  @ApiProperty({
    example: 'tonomyacc1',
  })
  accountName!: string;
}
