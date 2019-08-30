/* eslint-disable @typescript-eslint/camelcase */
import BN from 'bignumber.js';
import { TextDecoder, TextEncoder } from 'text-encoding';
import { library } from './library';
// eslint-disable-next-line import/named
import { utility } from './utility';

function encodeRawBytesInternal(input: OperationParameter | OperationParameter[]): string {
  const result = [];

  if (input instanceof Array) {
    result.push('02');
    const bytes: string = input
      .map(x => {
        return encodeRawBytesInternal(x);
      })
      .join('');
    const len = bytes.length / 2;
    result.push(len.toString(16).padStart(8, '0'));
    result.push(bytes);
  } else if (typeof input === 'object') {
    if (input.prim) {
      const argsLen = input.args ? input.args.length : 0;
      result.push(library.prim_mapping_reverse[argsLen][input.annots ? 'true' : 'false']);
      result.push(library.op_mapping_reverse[input.prim]);
      if (input.args) {
        input.args.forEach(arg => {
          return result.push(encodeRawBytesInternal(arg));
        });
      }

      if (input.annots) {
        const annotsBytes = input.annots
          .map((x: any) => {
            return parseInt(utility.buf2hex(new TextEncoder().encode(x)), 10);
          })
          .join('20');
        result.push((annotsBytes.length / 2).toString(16).padStart(8, '0'));
        result.push(annotsBytes);
      }
    } else if (input.bytes) {
      const len = input.bytes.length / 2;
      result.push('0A');
      result.push(len.toString(16).padStart(8, '0'));
      result.push(input.bytes);
    } else if (input.int) {
      const num = new BN(input.int, 10);
      const positiveMark = num.toString(2)[0] === '-' ? '1' : '0';
      const binary = num.toString(2).replace('-', '');
      const pad = binary.length <= 6 ? 6 : (binary.length - 6) % 7 ? binary.length + 7 - ((binary.length - 6) % 7) : binary.length;
      const split = binary.padStart(pad, '0').match(/\d{6,7}/g);
      if (!split) throw new Error('Splitting every 6 to 7 decimal characters matched no result');
      const reversed = split.reverse();

      reversed[0] = positiveMark + reversed[0];
      const numHex = reversed
        .map((x, i) => {
          return parseInt((i === reversed.length - 1 ? '0' : '1') + x, 2)
            .toString(16)
            .padStart(2, '0');
        })
        .join('');

      result.push('00');
      result.push(numHex);
    } else if (input.string) {
      const stringBytes: Uint8Array = new TextEncoder().encode(input.string);
      const stringHex = Array.prototype.slice
        .call(stringBytes)
        .map(x => (x as number).toString(16).padStart(2, '0'))
        .join('');
      const len = stringBytes.length;
      result.push('01');
      result.push(len.toString(16).padStart(8, '0'));
      result.push(stringHex);
    }
  }

  return result.join('');
}

export function encodeRawBytes(input: OperationParameter | OperationParameter[]): string {
  return encodeRawBytesInternal(input).toUpperCase();
}

function decodeRawBytesInternal(bytes: string, entryIndex = 0): OperationParameter | OperationParameter[] {
  let index = entryIndex;

  const b = bytes.slice(index, index + 2);
  const prim = library.prim_mapping[b];

  if (typeof prim === 'object') {
    index += 2;
    const op = library.op_mapping[bytes.slice(index, index + 2)];
    index += 2;

    const args = new Array(prim.len); // Array.apply(null, new Array(prim.len));
    const result: OperationParameter = {
      prim: op,
      args: args.map(() => decodeRawBytesInternal(bytes, index)) as OperationParameter[],
      annots: undefined
    };

    if (!prim.len) delete result.args;

    if (prim.annots) {
      const annotsLen = parseInt(bytes.slice(index, index + 8), 16) * 2;
      index += 8;

      const stringHexStr = bytes.slice(index, index + annotsLen);
      index += annotsLen;

      const stringBytes = utility.hex2buf(stringHexStr);
      const stringResult = new TextDecoder('utf-8').decode(stringBytes);
      result.annots = stringResult.split(' ');
    } else {
      delete result.annots;
    }

    return result;
  }
  switch (b) {
    case '0A': {
      index += 2;
      const len = bytes.slice(index, index + 8);
      index += 8;
      const intLen = parseInt(len, 16) * 2;
      const data = bytes.slice(index, index + intLen);
      index += intLen;
      return { bytes: data };
    }
    case '01': {
      index += 2;
      const len = bytes.slice(index, index + 8);
      index += 8;
      const intLen = parseInt(len, 16) * 2;
      const data = bytes.slice(index, index + intLen);
      index += intLen;

      const stringRaw = utility.hex2buf(data);
      return { string: new TextDecoder('utf-8').decode(stringRaw) };
    }
    case '00': {
      index += 2;

      const firstBytes = parseInt(bytes.slice(index, index + 2), 16)
        .toString(2)
        .padStart(8, '0');
      index += 2;
      // const isPositive = firstBytes[1] === '0';

      const validBytes = [firstBytes.slice(2)];

      let checknext = firstBytes[0] === '1';
      while (checknext) {
        const byteStr = parseInt(bytes.slice(index, index + 2), 16)
          .toString(2)
          .padStart(8, '0');
        index += 2;

        validBytes.push(byteStr.slice(1));
        checknext = byteStr[0] === '1';
      }

      const num = new BN(validBytes.reverse().join(''), 2);
      return { int: num.toString() };
    }
    case '02': {
      index += 2;

      const len = bytes.slice(index, index + 8);
      index += 8;
      const intLen = parseInt(len, 16) * 2;
      const limit = index + intLen;

      const seqLst = [] as OperationParameter[];
      while (limit > index) {
        // should this be bytes or data?
        // const data = read(intLen);
        seqLst.push(decodeRawBytesInternal(bytes, index) as OperationParameter);
      }
      return seqLst;
    }
    default:
      throw new Error(`Invalid raw bytes: Byte:${b} Index:${index}`);
  }
}

export function decodeRawBytes(rawBytes: string): OperationParameter | OperationParameter[] {
  const bytes = rawBytes.toUpperCase();
  return decodeRawBytesInternal(bytes);
}

export function forgeBool(b: string | boolean): string {
  return b ? 'ff' : '00';
}

export function forgeScript(s: OperationScript): string {
  const t1 = encodeRawBytes(s.code).toLowerCase();
  const t2 = encodeRawBytes(s.storage).toLowerCase();
  return utility.toBytesInt32Hex(t1.length / 2) + t1 + utility.toBytesInt32Hex(t2.length / 2) + t2;
}

export function forgeParameters(p: OperationParameter | OperationParameter[]): string {
  const t = encodeRawBytes(p).toLowerCase();
  return utility.toBytesInt32Hex(t.length / 2) + t;
}

export function forgeZarith(v: string | number | bigint): string {
  let fn = '';
  let n: number;
  switch (typeof v) {
    case 'bigint': {
      let bn = v as bigint;
      for (;;) {
        if (bn < 128n) {
          if (bn < 16n) fn += '0';
          fn += bn.toString(16);
          break;
        } else {
          let b = BigInt.asUintN(7, bn); // n % 128n;
          bn -= b;
          bn /= 128n;
          b += 128n;
          fn += b.toString(16);
        }
      }
      return fn;
    }
    case 'string':
      n = parseInt(v as string, 10);
      break;
    case 'number':
      n = v;
      break;
    default:
      throw new Error('Input value must be a number, string, or bigint.');
  }
  for (;;) {
    if (n < 128) {
      if (n < 16) fn += '0';
      fn += n.toString(16);
      break;
    } else {
      let b = n % 128;
      n -= b;
      n /= 128;
      b += 128;
      fn += b.toString(16);
    }
  }
  return fn;
}

export function forgePublicKeyHash(pkh: string): string {
  if (!pkh.startsWith('tz')) throw new Error('Not a public key hash');
  const t = parseInt(pkh.substr(2, 1), 10);
  let fpkh = `0${(t - 1).toString()}`;
  const prefixKey = pkh.substr(0, 3) as 'tz1' | 'tz2' | 'tz3';
  fpkh += utility.buf2hex(utility.b58cdecode(pkh, prefixKey));
  return fpkh;
}

export function forgeAddress(a: string): string {
  let fa = '';
  if (a.substr(0, 2) === 'KT') {
    fa = '01';
    fa += utility.buf2hex(utility.b58cdecode(a, 'KT'));
    fa += '00';
  } else {
    fa = '00';
    fa += forgePublicKeyHash(a);
  }
  return fa;
}

export function forgePublicKey(pk: string): string {
  let fpk;
  if (pk.substr(2, 2) !== 'pk') throw new Error('Not a public key type');
  switch (pk.substr(0, 2)) {
    case 'ed':
      fpk = '00';
      break;
    case 'sp':
      fpk = '01';
      break;
    case 'p2':
      fpk = '02';
      break;
    default:
      throw new Error('Unsupported public key type');
  }
  const prefixKey = pk.substr(0, 4) as 'edpk' | 'sppk' | 'p2pk';
  fpk += utility.buf2hex(utility.b58cdecode(pk, prefixKey));
  return fpk;
}
