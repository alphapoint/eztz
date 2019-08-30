// non-file scope variable names

import { utility } from '../src';

describe('eztz', () => {
  describe('utility', () => {
    test('mintotz', () => {
      const num1 = 1000000;
      const num2 = 9000000;
      expect(utility.totez(num1)).toBe(1);
      expect(utility.totez(num2)).toBe(9);
    });

    test('mutez', () => {
      const num = 0.000001;
      const num2 = 4294.967297;
      expect(utility.mutez(num)).toBe('1');
      expect(utility.mutez(num2)).toBe('4294967297');
    });

    test('b58cencode', () => {
      expect(utility.b58cencode(new Uint8Array([1]), new Uint8Array([2]))).toBe('ztysqgT');
    });

    test('b58cdecode', () => {
      const data = utility.b58cdecode('ztysqgT', new Uint8Array([2]));
      expect(data).toEqual(new Uint8Array([1]));
    });

    test('buf2hex', () => {
      expect(utility.buf2hex(new Uint8Array([1, 2]))).toBe('0102');
    });

    test('hex2buf', () => {
      const data = JSON.stringify(utility.hex2buf('1e1d'));
      expect(data).toEqual('{"0":30,"1":29}');
    });

    test('hexNonce', () => {
      const length = 5;
      expect(utility.hexNonce(length)).toHaveLength(length);
    });

    test('sexp2mic', () => {
      expect(utility.sexp2mic('123')).toEqual({ int: '123' });
      expect(utility.sexp2mic('"456"')).toEqual({ string: '456' });
    });

    test('mic2arr', () => {
      // todo
    });

    test('ml2mic', () => {
      // todo
    });
  });
});
