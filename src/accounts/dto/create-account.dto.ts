import { ApiProperty } from '@nestjs/swagger';

export class CreateAccountDtoKey {
  @ApiProperty({ example: 'PASSWORD' })
  level?: string;

  @ApiProperty({
    example: 'PUB_K1_6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5BoDq63',
  })
  key?: string;
}

export class CreateAccountRequest {
  @ApiProperty({
    example: 'b06ecffb7ad2e992e82c1f3a23341bca36f8337f74032c00c489c21b00f66e52',
  })
  usernameHash?: string;

  @ApiProperty({ isArray: true, type: CreateAccountDtoKey })
  keys?: CreateAccountDtoKey[];
}

export class CreateAccountResponse {
  @ApiProperty({
    example: 'dfd401c1dcd5fd4ff7836dfe5e3b54630a077ea01643c1529ac20e4e03b26763',
  })
  transactionId!: string;
}
