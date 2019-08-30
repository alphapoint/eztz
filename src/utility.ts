// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
import BN from 'bignumber.js';
// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
import bs58checkImport from 'bs58check';
import { prefixes } from './prefixes';

const bs58check: {
  encode: (buf: Buffer) => string;
  decode: (str: string) => Buffer;
  decodeUnsafe: (str: string) => Buffer;
} = bs58checkImport;

export const utility = {
  toBytesInt32Hex(num: string | number) {
    return this.buf2hex(this.toBytesInt32(num));
  },
  toBytesInt32(num: string | number): ArrayBuffer {
    const val = typeof num === 'string' ? parseInt(num, 10) : num;
    const arr1 = new Uint32Array(1);
    const view = new DataView(arr1);
    view.setUint32(0, val, false);
    return view.buffer;
  },
  totez(m: string | number): number {
    return (typeof m === 'string' ? parseInt(m, 10) : m) / 1000000;
  },
  mutez(tz: string | number): string {
    return new BN(new BN(tz).toFixed(6)).multipliedBy(1000000).toString();
  },
  b58cencode(payload: Uint8Array, prefix: keyof typeof prefixes | Uint8Array): string {
    const prefixVal = typeof prefix === 'string' ? prefixes[prefix] : prefix;
    const n = new Uint8Array(prefixVal.length + payload.length);
    n.set(prefixVal);
    n.set(payload, prefix.length);
    return bs58check.encode(Buffer.from(n.buffer, n.byteOffset, n.byteLength));
  },
  b58cdecode(enc: string, prefix: keyof typeof prefixes | Uint8Array): Uint8Array {
    const buffer = bs58check.decode(enc);
    let prefixVal;
    if (typeof prefix === 'string') {
      prefixVal = prefixes[prefix];
      const prefixCut = prefix.indexOf('$');
      const prefixStr = prefixCut === -1 ? prefix : prefix.substr(0, prefixCut);
      if (!enc.startsWith(prefixStr)) throw new Error("Prefix sequence while encoded doesn't match.");
    } else {
      prefixVal = prefix;
    }
    const checkPrefixVal = buffer.slice(0, prefixVal.length);
    if (!this.bufEquals(prefixVal, checkPrefixVal)) throw new Error(`Prefix sequence once decoded doesn't match.`);
    return this.bufView(buffer.slice(prefixVal.length));
  },
  bufEquals(bufA: Uint8Array, bufB: Uint8Array): boolean {
    const buf1 = this.bufView(bufA);
    const buf2 = this.bufView(bufB);
    if (buf1 === buf2) return true;

    const l = buf1.byteLength;
    if (l !== buf2.byteLength) return false;

    const view1 = new DataView(buf1.buffer, buf1.byteOffset, buf1.byteLength);
    const view2 = new DataView(buf2.buffer, buf2.byteOffset, buf2.byteLength);

    let i = 0;
    const l4 = l & ~0x3;

    for (; i < l4; i += 4) {
      if (view1.getUint32(i) !== view2.getUint32(i)) return false;
    }
    if ((l & 0x2) !== 0) {
      if (view1.getUint16(i) !== view2.getUint16(i)) return false;
      i += 2;
    }
    if ((l & 0x1) !== 0) {
      if (view1.getUint8(i) !== view2.getUint8(i)) return false;
    }

    return true;
  },
  bufView(buffer: Buffer | Uint8Array | ArrayBuffer | number[] | string): Uint8Array {
    if (typeof buffer === 'string') {
      const newBuf = Buffer.from(buffer, 'hex');
      return new Uint8Array(newBuf.buffer, newBuf.byteOffset, newBuf.byteLength);
    }

    if (buffer instanceof Buffer) return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);

    if (buffer instanceof Uint8Array) return buffer;

    return new Uint8Array(buffer);
  },
  buf2hex(buffer: Uint8Array | ArrayBuffer): string {
    const byteArray = this.bufView(buffer);
    return Buffer.from(byteArray).toString('hex');
    /*
    const hexParts = [];
    for (let i = 0; i < byteArray.length; i++) {
      const hex = byteArray[i].toString(16);
      const paddedHex = `00${hex}`.slice(-2);
      hexParts.push(paddedHex);
    }
    return hexParts.join('');
    */
  },
  hex2buf(hex: string): Uint8Array {
    return this.bufView(Buffer.from(hex, 'hex'));
    /*
    const hexPairs = hex.match(/[\da-f]{2}/gi);
    if (hexPairs == null) throw new Error('Not a hex string');
    return new Uint8Array(hexPairs.map((h) => parseInt(h, 16)));
    */
  },
  hexNonce(length: number): string {
    let l = length;
    const chars = '0123456789abcedf';
    let hex = '';
    while (l--) hex += chars.charAt((Math.random() * 16) | 0);
    return hex;
  },
  mergebuf(b1: Uint8Array | number[], b2: Uint8Array | number[]): Uint8Array {
    const r = new Uint8Array(b1.length + b2.length);
    r.set(b1);
    r.set(b2, b1.length);
    return r;
  },
  sexp2mic(_mi: string): OperationParameter {
    let mi = _mi
      .replace(/(?:@[a-z_]+)|(?:#.*$)/gm, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (mi.charAt(0) === '(') mi = mi.slice(1, -1);
    let pl = 0;
    let sopen = false;
    let escaped = false;
    const ret = {
      prim: '',
      args: [] as OperationParameter[]
    };
    let val = '';
    for (let i = 0; i < mi.length; i++) {
      if (escaped) {
        val += mi[i];
        escaped = false;
        continue;
      } else if ((i === mi.length - 1 && !sopen) || (mi[i] === ' ' && pl === 0 && !sopen)) {
        if (i === mi.length - 1) val += mi[i];
        if (val) {
          const valInt = parseInt(val, 10);
          if (val === valInt.toString()) {
            if (!ret.prim) return { int: val };
            ret.args.push({ int: val });
          } else if (val[0] === '0') {
            if (!ret.prim) return { bytes: val };
            ret.args.push({ bytes: val });
          } else if (ret.prim) {
            ret.args.push(this.sexp2mic(val));
          } else {
            ret.prim = val;
          }
          val = '';
        }
        continue;
      } else if (mi[i] === '"' && sopen) {
        sopen = false;
        if (!ret.prim) return { string: val };
        ret.args.push({ string: val });
        val = '';
        continue;
      } else if (mi[i] === '"' && !sopen && pl === 0) {
        sopen = true;
        continue;
      } else if (mi[i] === '\\') escaped = true;
      else if (mi[i] === '(') pl++;
      else if (mi[i] === ')') pl--;
      val += mi[i];
    }
    return ret;
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mic2arr(s: OperationParameter): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ret = [] as any;
    if ('prim' in s) {
      if (s.prim === 'Pair') {
        if (!s.args) throw new Error('Prim is pair but args is empty');
        ret.push(this.mic2arr(s.args[0]));
        ret = ret.concat(this.mic2arr(s.args[1]));
      } else if (s.prim === 'Elt') {
        if (!s.args) throw new Error('Prim is Elt but args is empty');
        ret = {
          key: this.mic2arr(s.args[0]),
          val: this.mic2arr(s.args[1])
        };
      } else if (s.prim === 'True') {
        ret = true;
      } else if (s.prim === 'False') {
        ret = false;
      }
    } else if (Array.isArray(s)) {
      const sc = s.length;
      for (let i = 0; i < sc; i++) {
        const n = this.mic2arr(s[i]);
        if (typeof n.key !== 'undefined') {
          if (Array.isArray(ret)) {
            ret = {
              keys: [],
              vals: []
            };
          }
          ret.keys.push(n.key);
          ret.vals.push(n.val);
        } else {
          ret.push(n);
        }
      }
    } else if ('string' in s) {
      ret = s.string;
    } else if ('int' in s && typeof s.int !== 'undefined') {
      if (typeof s.int === 'string') ret = parseInt(s.int, 10);
      else ret = s.int;
    } else {
      ret = s;
    }
    return ret;
  },
  ml2mic(mi: string | string[]): OperationParameter[] {
    let inseq = false;
    let seq = '';
    let val = '';
    let pl = 0;
    let bl = 0;
    let sopen = false;
    let escaped = false;
    const ret: OperationParameter[] = [];
    for (let i = 0; i < mi.length; i++) {
      if (val === '}' || val === ';') {
        val = '';
      }
      if (inseq) {
        if (mi[i] === '}') {
          bl--;
        } else if (mi[i] === '{') {
          bl++;
        }
        if (bl === 0) {
          const st = this.ml2mic(val);
          ret.push({
            prim: seq.trim(),
            args: ([st] as unknown) as OperationParameter[]
          });
          val = '';
          bl = 0;
          inseq = false;
        }
      } else if (mi[i] === '{') {
        bl++;
        seq = val;
        val = '';
        inseq = true;
        continue;
      } else if (escaped) {
        val += mi[i];
        escaped = false;
        continue;
      } else if ((i === mi.length - 1 && !sopen) || (mi[i] === ';' && pl === 0 && !sopen)) {
        if (i === mi.length - 1) val += mi[i];
        if (val.trim() === '' || val.trim() === '}' || val.trim() === ';') {
          val = '';
          continue;
        }
        ret.push(this.sexp2mic(val));
        val = '';
        continue;
      } else if (mi[i] === '"' && sopen) sopen = false;
      else if (mi[i] === '"' && !sopen) sopen = true;
      else if (mi[i] === '\\') escaped = true;
      else if (mi[i] === '(') pl++;
      else if (mi[i] === ')') pl--;
      val += mi[i];
    }
    return ret;
  }
};
