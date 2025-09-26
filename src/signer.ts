import { PrivateKey } from '@wharfkit/antelope';
import settings from './settings';
import { EosioUtil, createSigner } from '@tonomy/tonomy-id-sdk';

const idTonomyActiveKey = PrivateKey.from(settings.secrets.tonomyOpsPrivateKey);

export const tonomySigner = EosioUtil.createSigner(idTonomyActiveKey);
export const tonomyIssuerSigner = createSigner(idTonomyActiveKey);
