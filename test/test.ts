{
  // non-file scope variable names

  const eztz = require('..');
  const crypto = eztz.crypto;
  const utility = eztz.utility;
  const node = eztz.node;

  const MockXHR = require('mock-xmlhttprequest');

  describe('eztz', async () => {
    describe('crypto', () => {
      test('generateMnemonic', async () => {
        const string = await crypto.generateMnemonic();
        expect(string.split(' ')).toHaveLength(15);
      });

      test('checkAddress', () => {
        // todo
      });

      //TODO
      /*test('generateKeysNoSeed', () => {
        const keys = crypto.generateKeysNoSeed();
        expect(typeof keys.pk).toBe('string');
        expect(typeof keys.sk).toBe('string');
        expect(typeof keys.pkh).toBe('string');
      });

      test('generateKeysSalted', () => {
        const keys = crypto.generateKeysSalted('test', new Buffer([2]));
        expect(typeof keys.mnemonic).toBe('string');
        expect(typeof keys.passphrase).toBe('object');
        expect(typeof keys.pk).toBe('string');
        expect(typeof keys.sk).toBe('string');
        expect(typeof keys.pkh).toBe('string');
        expect(typeof keys.salt).toBe('string');
      });*/

      // test('generateKeys', async () => {
      //   const keys = await crypto.generateKeys('test', 'p');
      //   expect(typeof keys.mnemonic).toBe('string');
      //   expect(typeof keys.passphrase).toBe('string');
      //   expect(typeof keys.pk).toBe('string');
      //   expect(typeof keys.sk).toBe('string');
      //   expect(typeof keys.pkh).toBe('string');
      // });

      //TODO
      /*test('generateKeysFromSeedMulti', () => {
        const keys = crypto.generateKeysFromSeedMulti('test', 'p', 3);
        expect(typeof keys.n).toBe('number');
        expect(typeof keys.mnemonic).toBe('string');
        expect(typeof keys.passphrase).toBe('string');
        expect(typeof keys.pk).toBe('string');
        expect(typeof keys.sk).toBe('string');
        expect(typeof keys.pkh).toBe('string');
      });*/

      test('sign', () => {
        //todo
        // const keys = crypto.sign('AA5', 'p');
        // expect(typeof keys.bytes).toBe('number');
        // expect(typeof keys.sig).toBe('string');
        // expect(typeof keys.edsig).toBe('string');
        // expect(typeof keys.sbytes).toBe('string');
      });

      test('verify', () => {
        //todo
        //const keys = crypto.sign('5Kd3NBUAdUnhyzenEwVLy9pBKxSwXvE9FMPyR4UKZvpe6E3AgLr', 'p');
        // expect(typeof keys.bytes).toBe('number');
        // expect(typeof keys.sig).toBe('string');
        // expect(typeof keys.edsig).toBe('string');
        // expect(typeof keys.sbytes).toBe('string');
      });
    });

    describe('node', () => {
      beforeEach(() => {});

      test('init params', () => {
        expect(node.debugMode).toBe(false);
        expect(node.async).toBe(true);
        expect(node.activeProvider).toBe('https://mainnet.tezrpc.me');
      });

      test('setDebugMode', () => {
        node.setDebugMode(true);
        expect(node.debugMode).toBe(true);

        node.setDebugMode(false);
        expect(node.debugMode).toBe(false);
      });

      test('setProvider', () => {
        node.setProvider('https://tezrpc.me/zeronet2');
        expect(node.activeProvider).toBe('https://tezrpc.me/zeronet2');
      });

      test('resetProvider', () => {
        node.setProvider('https://tezrpc.me/zeronet2');
        node.resetProvider();
        expect(node.activeProvider).toBe('https://mainnet.tezrpc.me');
      });
    });
  });
}
