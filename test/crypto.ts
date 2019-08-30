import sodium from 'libsodium-wrappers';
import { crypto } from '../src';

describe('sodium', () => {
  test('can sign and verify', async () => {
    const { keyType, privateKey: skBytes, publicKey: pkBytes } = sodium.crypto_sign_keypair('uint8array');

    const message = 'Hello';
    const messageBuf = new Uint8Array(Buffer.from(message, 'utf8'));

    console.log({
      keyType,
      messageBuf: Buffer.from(messageBuf).toString('hex'),
      messageBufLength: messageBuf.byteLength,
      skBytes: Buffer.from(skBytes).toString('hex'),
      skBytesLength: skBytes.byteLength,
      pkBytes: Buffer.from(pkBytes).toString('hex'),
      pkBytesLength: pkBytes.byteLength
    });

    // NOTE: this prepends sig onto message
    const signed = sodium.crypto_sign(messageBuf, skBytes, 'uint8array');

    const sig = sodium.crypto_sign_detached(messageBuf, skBytes, 'uint8array');

    console.log({
      sig: Buffer.from(sig).toString('hex'),
      sigLength: sig.byteLength,
      signed: Buffer.from(signed).toString('hex'),
      signedLength: signed.byteLength
    });

    // NOTE: this just cuts the sig off the message after verifying, will throw on verification failure
    const opened = sodium.crypto_sign_open(signed, pkBytes, 'uint8array');

    console.log({
      opened: Buffer.from(opened).toString('hex'),
      openedLength: opened.byteLength
    });

    const verified = sodium.crypto_sign_verify_detached(sig, messageBuf, pkBytes);

    expect(verified).toBeTruthy();
  });
});

describe('eztz.crypto', () => {
  const mnemonic = 'gold derive diet wisdom cargo energy profit help toilet hole palace divorce simple fish infant';

  test('deriveKey', async () => {
    const { pk, sk, pkh } = await crypto.deriveKey({ mnemonic }, `0'/0'`);
    const expectedPk = 'edpkub25DxHoQGsKJnrwvJGhMc8RrRVEQ3brMPjAdkQPTRA3bnRpjn';
    const expectedSk = 'edskRtSaYoPMR6LNm8T7gMnUV9higNTzTGyNAU5mYKPbhwh7pbdrcmZ5StiuNYGbpJArzAGedfWTDRzEx4XgfiE3KtsLBQPy6n';
    const expectedPkh = 'tz1cvsoKyn3oe84o8QoCBafr1PzMShoNiEZx';
    console.log(pk);
    console.log(sk);
    console.log(pkh);
    expect(pk).toEqual(expectedPk);
    expect(sk).toEqual(expectedSk);
    expect(pkh).toEqual(expectedPkh);
  });

  test('sign', async () => {
    const { sk } = await crypto.deriveKey({ mnemonic }, `0'/0'`);
    const message = Buffer.from('Hello').toString('hex');
    const signedRes = await crypto.sign(message, sk);
    const expectedSig = '2dfcb95fa23c23cfc3f87307610420d1bc4225264efafa69c9864e1214bc0cd00945074e4149048009d534af7ba60b8d2b96e31822de99fec9f0dac3ac715008';
    const edSig = 'edsigtdpiU6g2KvevBvFnX2rGiDPfCCWLK5RYL7bGj7DVA5zRverj6u47QCBn41wQd4rVDF9mZZ5SD7Untb8odd43CDF3hwXVgS';
    const sbytes = message + expectedSig;
    expect(signedRes.sbytes).toEqual(sbytes);
    expect(signedRes.bytes).toEqual(message);
    expect(Buffer.from(signedRes.sig).toString('hex')).toEqual(expectedSig);
    expect(signedRes.edsig).toEqual(edSig);
  });

  test('verify', async () => {
    console.log('verify');
    const { sk, pk } = await crypto.deriveKey({ mnemonic }, `0'/0'`);
    const message = Buffer.from('fixture');
    const { edsig } = await crypto.sign(message, sk);
    const res = await crypto.verify(message, edsig, pk);
    expect(pk).toEqual('edpkub25DxHoQGsKJnrwvJGhMc8RrRVEQ3brMPjAdkQPTRA3bnRpjn');
    expect(sk).toEqual('edskRtSaYoPMR6LNm8T7gMnUV9higNTzTGyNAU5mYKPbhwh7pbdrcmZ5StiuNYGbpJArzAGedfWTDRzEx4XgfiE3KtsLBQPy6n');
    expect(edsig).toEqual('edsigtf6BxXfxjrLj22ncndDU39T8NtCSqRP7a3RPAvUh2nKP2zvJULbbzwTFYpTQSHERygFZgiYMX5WhcmDxUP5C4g4EaFrfPB');
    expect(res).toEqual(true);
  });
});
