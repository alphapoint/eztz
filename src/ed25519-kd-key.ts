import createHmac from 'create-hmac';
import { library } from './library';

const pathRegex = new RegExp("^m(\\/[0-9]+')+$");
const replaceDerive = (val: string): string => val.replace("'", '');

interface Nacl {
  crypto_sign_seed_keypair: (val: Buffer) => { signPk: Buffer; signSk: Buffer };
}
type Hex = string;
type Path = string;

type Keys = {
  key: Buffer;
  chainCode: Buffer;
};

const ED25519_CURVE = 'ed25519 seed';
const HARDENED_OFFSET = 0x80000000;

export const getMasterKeyFromSeed = (seed: Hex): Keys => {
  const hmac = createHmac('sha512', ED25519_CURVE);
  const I = hmac.update(Buffer.from(seed, 'hex')).digest();
  const IL = I.slice(0, 32);
  const IR = I.slice(32);
  return {
    key: IL,
    chainCode: IR
  };
};

const CKDPriv = ({ key, chainCode }: Keys, index: number): Keys => {
  const indexBuffer = Buffer.allocUnsafe(4);
  indexBuffer.writeUInt32BE(index, 0);

  const data = Buffer.concat([Buffer.alloc(1, 0), key, indexBuffer]);

  const I = createHmac('sha512', chainCode)
    .update(data)
    .digest();
  const IL = I.slice(0, 32);
  const IR = I.slice(32);
  return {
    key: IL,
    chainCode: IR
  };
};

export const getKeyPair = async (privateKey: Buffer, withZeroByte = false): Promise<any> => {
  const naclInstance = await library.sodium;
  console.info('privatekey: ', privateKey.toString('hex'));
  const { publicKey, privateKey: fullKey } = naclInstance.crypto_sign_seed_keypair(new Uint8Array(privateKey));
  const zero = Buffer.alloc(1, 0);
  const newPubKey = withZeroByte ? Buffer.concat([zero, Buffer.from(publicKey)]) : Buffer.from(publicKey);
  return { publicKey: newPubKey, fullKey, privateKey };
};

export const isValidPath = (path: string): boolean => {
  if (!pathRegex.test(path)) {
    return false;
  }
  return !path
    .split('/')
    .slice(1)
    .map(replaceDerive)
    .some(isNaN as any /* ts T_T*/);
};

export const derivePath = (path: Path, seed: Hex): Keys => {
  if (!isValidPath(path)) {
    throw new Error('Invalid derivation path');
  }

  const { key, chainCode } = getMasterKeyFromSeed(seed);
  const segments = path
    .split('/')
    .slice(1)
    .map(replaceDerive)
    .map(el => parseInt(el, 10));

  return segments.reduce((parentKeys, segment) => CKDPriv(parentKeys, segment + HARDENED_OFFSET), { key, chainCode });
};
