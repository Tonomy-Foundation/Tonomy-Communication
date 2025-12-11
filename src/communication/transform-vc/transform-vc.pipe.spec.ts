import { setSettings } from '@tonomy/tonomy-id-sdk';
import { BodyDto } from '../dto/body.dto';
import { TransformVcPipe } from './transform-vc.pipe';
import { util } from '@tonomy/tonomy-id-sdk';
import { KeyType, PrivateKey } from '@wharfkit/antelope';

setSettings({
  blockchainUrl: 'http://localhost:8888',
  baseTokenAddress: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
});

describe('TransformVcPipe', () => {
  let vc: string;

  beforeEach(async () => {
    const privateKey = PrivateKey.generate(KeyType.K1);
    const issuer = await util.toDidKeyIssuer(privateKey);
    const subject = { foo: 'bar' };
    const signedVc = await util.VerifiableCredential.sign(
      'did:example:1234324',
      'Test Type',
      subject,
      issuer,
    );

    vc = signedVc.toString();
  });

  it('should be defined', () => {
    expect(new TransformVcPipe()).toBeDefined();
  });

  it('must transform antelope VC into message object and verifies it', async () => {
    const pipe = new TransformVcPipe();
    const result = (await pipe.transform(
      { message: vc },
      { type: 'body' },
    )) as BodyDto;

    expect(result.value).toBeDefined();
    expect(result.value?.toString()).toBe(vc.toString());
  });

  it('Verification fails if message isnt valid', async () => {
    // replace the last character from the signature of the VC with a different one
    const lastCharacter = vc[vc.length - 1];
    const newCharacter = lastCharacter === 'a' ? 'b' : 'a';
    const newVc = vc.slice(0, vc.length - 1) + newCharacter;

    const pipe = new TransformVcPipe();
    const result = (await pipe.transform(
      { message: newVc },
      { type: 'body' },
    )) as BodyDto;

    expect(result.error.status).toBe(500);
    expect(result.error.message).toBe('Unexpected end of data');
  });
});
