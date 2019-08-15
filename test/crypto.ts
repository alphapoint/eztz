{
  // non-file scope variable names
  const eztz = require('..');
  const crypto = eztz.crypto;
  const utility = eztz.utility;
  const prefix = eztz.prefix;
  const bip39 = require('bip39');
  const sodium = require('libsodium-wrappers');

  describe('sodium', () => {
    test('can sign and verify', async () => {
      const message = 'Hello';
      const pk = 'edpkub25DxHoQGsKJnrwvJGhMc8RrRVEQ3brMPjAdkQPTRA3bnRpjn';
      const sk =
        'edskRtSaYoPMR6LNm8T7gMnUV9higNTzTGyNAU5mYKPbhwh7ogGtFpcv79R4E3E8Gtt3Bx2958Ju2k8NwqxAvLWCBQfk9HCN7n';

      const messageBuf = Buffer.from(message, 'utf8');
      const skBytes = utility.b58cdecode(sk, prefix.edsk);
      const pkBytes = utility.b58cdecode(pk, prefix.edpk);

      const sig = sodium.crypto_sign_detached(message, skBytes, 'uint8array');

      const verified = sodium.crypto_sign_verify_detached(
        sig,
        messageBuf,
        pkBytes
      );

      expect(verified).toBeTruthy();
    });
  });

  describe('eztz.crypto', () => {
    const mnemonic =
      'gold derive diet wisdom cargo energy profit help toilet hole palace divorce simple fish infant';

    test('generateKeys', async () => {
      const pass = '1234';
      const keyPair = await crypto.generateKeys(mnemonic, pass);
      //console.info(keyPair)
    });

    test('deriveKey', async () => {
      const seed = bip39.mnemonicToSeed(mnemonic).slice(0, 32);
      const { pk, sk, pkh } = await crypto.deriveKey({ seed }, `0'/0'`);
      const expectedPk =
        'edpkub25DxHoQGsKJnrwvJGhMc8RrRVEQ3brMPjAdkQPTRA3bnRpjn';
      const expectedSk =
        'edskRtSaYoPMR6LNm8T7gMnUV9higNTzTGyNAU5mYKPbhwh7ogGtFpcv79R4E3E8Gtt3Bx2958Ju2k8NwqxAvLWCBQfk9HCN7n';
      const expectedPkh = 'tz1cvsoKyn3oe84o8QoCBafr1PzMShoNiEZx';
      expect(pk).toEqual(expectedPk);
      expect(sk).toEqual(expectedSk);
      expect(pkh).toEqual(expectedPkh);
    });

    test('sign', async () => {
      const seed = bip39.mnemonicToSeed(mnemonic).slice(0, 32);
      const { sk } = await crypto.deriveKey({ seed }, `0'/0'`);
      const message = 'Hello';
      const signedRes = await crypto.sign(message, sk);
      console.log(signedRes);
    });

    test('verify', async () => {
      //TODO finish this one, ran into libsodium issues
      try {
        const edSig =
          'edsigtdpiU6g2KvevBvFnX2rGiDPfCCWLK5RYL7bGj7DVA5zRwsrCEW3FKBykcvnz3WPe1iC46xFSLwr5WapAtV1hVvRFPQDE6i';
        const message = '48656c6c6f';
        const encodedPk =
          'edpkub25DxHoQGsKJnrwvJGhMc8RrRVEQ3brMPjAdkQPTRA3bnRpjn';
        const res = await crypto.verify(message, edSig, encodedPk);
        console.info(res);
      } catch (ex) {
        console.info(ex);
      }
    });
  });
}
