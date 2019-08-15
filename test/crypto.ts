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
      const sk = 'edskRtSaYoPMR6LNm8T7gMnUV9higNTzTGyNAU5mYKPbhwh7ogGtFpcv79R4E3E8Gtt3Bx2958Ju2k8NwqxAvLWCBQfk9HCN7n';

      const messageBuf = Buffer.from(message, 'utf8');
      const skBytes = utility.b58cdecode(sk, prefix.edsk);
      const pkBytes = utility.b58cdecode(pk, prefix.edpk);

      const sig = sodium.crypto_sign_detached(message, skBytes, 'uint8array');

      const verified = sodium.crypto_sign_verify_detached(sig, messageBuf, pkBytes);

      expect(verified).toBeTruthy();
    });
  });

  describe('eztz.crypto', () => {
    const mnemonic = 'gold derive diet wisdom cargo energy profit help toilet hole palace divorce simple fish infant';

    test('deriveKey', async() => {
      const seed = bip39.mnemonicToSeed(mnemonic).slice(0, 32);
      const { pk, sk, pkh } = await crypto.deriveKey( { seed }, `0'/0'`);
      const expectedPk = 'edpkub25DxHoQGsKJnrwvJGhMc8RrRVEQ3brMPjAdkQPTRA3bnRpjn'
      const expectedSk = 'edskRtSaYoPMR6LNm8T7gMnUV9higNTzTGyNAU5mYKPbhwh7pbdrcmZ5StiuNYGbpJArzAGedfWTDRzEx4XgfiE3KtsLBQPy6n'
      const expectedPkh = 'tz1cvsoKyn3oe84o8QoCBafr1PzMShoNiEZx'
      expect(pk).toEqual(expectedPk)
      expect(sk).toEqual(expectedSk)
      expect(pkh).toEqual(expectedPkh)
  })

  test('sign', async() => {
      const seed = bip39.mnemonicToSeed(mnemonic).slice(0, 32);
      const { sk } = await crypto.deriveKey({ seed }, `0'/0'`);
      const message = Buffer.from('Hello').toString('hex');
      const signedRes = await crypto.sign(message, sk);
      const expectedSig = '2dfcb95fa23c23cfc3f87307610420d1bc4225264efafa69c9864e1214bc0cd00945074e4149048009d534af7ba60b8d2b96e31822de99fec9f0dac3ac715008'
      const edSig = 'edsigtdpiU6g2KvevBvFnX2rGiDPfCCWLK5RYL7bGj7DVA5zRverj6u47QCBn41wQd4rVDF9mZZ5SD7Untb8odd43CDF3hwXVgS'
      const sbytes = message + expectedSig;
      expect(signedRes.sbytes).toEqual(sbytes);
      expect(signedRes.bytes).toEqual(message);
      expect(Buffer.from(signedRes.sig).toString('hex')).toEqual(expectedSig);
      expect(signedRes.edsig).toEqual(edSig);
  })

  test('verify', async() => {
      const seed = bip39.mnemonicToSeed(mnemonic).slice(0, 32);
      const { sk, pk } = await crypto.deriveKey({ seed }, `0'/0'`);
      const message = Buffer.from('fixture').toString('hex');
      const { edsig } = await crypto.sign(message, sk);      
      const res = await crypto.verify(message, edsig, pk)
      expect(res).toEqual(true)
  })
  });
}
