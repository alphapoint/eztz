import createHmac from 'create-hmac';
import { library } from './library';
import { utility } from './utility';

// const pathRegex = /^m\/(?:(?:0|[1-9]\d*)'?(?:\/(?!$)|$))+$/;
const hardPathRegex = /^m\/(?:(?:0|[1-9]\d*)'(?:\/(?!$)|$))+$/;

type HexString = string;
type Slip0010Path = string;

/*
type DecimalDigit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
type UpperHexDigit = DecimalDigit | 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
type LowerHexDigit = DecimalDigit | 'a' | 'b' | 'c' | 'd' | 'e' | 'f';
type HexDigit = UpperHexDigit | LowerHexDigit;
type HexPair = HexDigit + HexPair; // not in TS yet
type UnprefixedHexString = ... HexDigit; // not in TS yet
type HexPrefix = '0x';
type PrefixedHexString = HexPrefix + UnprefixedHexString;
type HexString = PrefixedHexString | UnprefixedHexString;
type Slip0010Path = ^m\/(?:(?:0|[1-9]\d*)'?(?:\/(?!$)|$))+$;
 */

interface Ed25519Key {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  fullKey: Uint8Array;
  chainCode?: Uint8Array;
}

interface Ed25519KeyWithChainCode extends Ed25519Key {
  chainCode: Uint8Array;
}

const ED25519_CURVE = 'ed25519 seed';
const HARDENED_OFFSET = 0x80000000;

export const getMasterKeyFromSeed = (seed: HexString | Uint8Array): Uint8Array => {
  const hmac = createHmac('sha512', ED25519_CURVE);
  return hmac.update(seed instanceof Buffer ? seed : seed instanceof Uint8Array ? Buffer.from(seed) : Buffer.from(seed, 'hex')).digest();
};

function CKDPrivHard(key: Uint8Array, index: number): Buffer {
  const privateKey = key.slice(0, 32);
  const chainCode = key.slice(32);
  const indexBuffer = Buffer.allocUnsafe(4);
  indexBuffer.writeUInt32BE(index + HARDENED_OFFSET, 0);

  const data = Buffer.concat([Buffer.alloc(1, 0), privateKey, indexBuffer]);

  const chainCodeBuffer = chainCode instanceof Buffer ? chainCode : Buffer.from(chainCode);
  return createHmac('sha512', chainCodeBuffer)
    .update(data)
    .digest();
}

export async function getKeyPair(privateKey: Uint8Array, withZeroByte = false): Promise<Ed25519Key> {
  const { publicKey, privateKey: fullKey } = (await library.sodium).crypto_sign_seed_keypair(utility.bufView(privateKey));
  return withZeroByte
    ? {
      privateKey,
      fullKey,
      publicKey: utility.bufView(Buffer.concat([Buffer.alloc(1, 0), Buffer.from(publicKey)]))
    }
    : { privateKey, fullKey, publicKey };
}

export function isValidPath(path: string): boolean {
  return hardPathRegex.test(path);
}

export async function derivePath(path: Slip0010Path, seed: HexString | Uint8Array): Promise<Ed25519KeyWithChainCode> {
  if (!isValidPath(path)) throw new Error('Invalid derivation path');

  const key = getMasterKeyFromSeed(seed);
  const segments = path
    .slice(2)
    .split('/')
    .map(el => parseInt(el, 10));

  const result = segments.reduce(CKDPrivHard, key);

  return {
    ...(await getKeyPair(result.slice(0, 32))),
    chainCode: result.slice(32)
  };
}
