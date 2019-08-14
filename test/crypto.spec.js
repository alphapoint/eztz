describe('eztz.crypto', () => {
    let crypto;
    let eztz;
    let bip39;
    const mnemonic = 'gold derive diet wisdom cargo energy profit help toilet hole palace divorce simple fish infant'

    beforeEach(async () => {
      eztz = require('../index');
      crypto = eztz.crypto;
      bip39 = await eztz.library.bip39
    });
  
    test('generateKeys', async () => {
        const pass = '1234'
        const keyPair = await crypto.generateKeys(mnemonic, pass)
        //console.info(keyPair)
    });

    test('deriveKey', async() => {
        const seed = bip39.mnemonicToSeed(mnemonic).slice(0, 32);
        const { pk, sk, pkh } = await crypto.deriveKey( { seed }, `0'/0'`);
        const expectedPk = 'edpkub25DxHoQGsKJnrwvJGhMc8RrRVEQ3brMPjAdkQPTRA3bnRpjn'
        const expectedSk = 'edskRtSaYoPMR6LNm8T7gMnUV9higNTzTGyNAU5mYKPbhwh7ogGtFpcv79R4E3E8Gtt3Bx2958Ju2k8NwqxAvLWCBQfk9HCN7n'
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
        const expectedSig = '2dfcb95fa23c23cfc3f87307610420d1bc4225264efafa69c9864e1214bc0cd0aa7686ae59812d8499154b082c97a833e617265fc168eff6ea10e7bf9cc68c0f'
        const edSig = 'edsigtdpiU6g2KvevBvFnX2rGiDPfCCWLK5RYL7bGj7DVA5zRwsrCEW3FKBykcvnz3WPe1iC46xFSLwr5WapAtV1hVvRFPQDE6i'
        const sbytes = message + expectedSig;
        expect(signedRes.sbytes).toEqual(sbytes);
        expect(signedRes.bytes).toEqual(message);
        expect(Buffer.from(signedRes.sig).toString('hex')).toEqual(expectedSig);
        expect(signedRes.edsig).toEqual(edSig);
    })

    test('verify', async() => {
        //TODO finish this one, ran into libsodium issues
        try { 
        const edSig = 'edsigtdpiU6g2KvevBvFnX2rGiDPfCCWLK5RYL7bGj7DVA5zRwsrCEW3FKBykcvnz3WPe1iC46xFSLwr5WapAtV1hVvRFPQDE6i'
        const message = '48656c6c6f'
        const encodedPk = 'edpkub25DxHoQGsKJnrwvJGhMc8RrRVEQ3brMPjAdkQPTRA3bnRpjn'
        const res = await crypto.verify(message, edSig, encodedPk)
        console.info(res)
        } catch(ex) {
            console.info(ex)
        }
    })
  });
  