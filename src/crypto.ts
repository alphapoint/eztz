import { Crypto } from '@peculiar/webcrypto';
import { TextEncoder } from 'text-encoding';
import * as edHd from './ed25519hd';
import { library } from './library';
import { utility } from './utility';

export const crypto = {
  async extractEncryptedKeys(esk?: string, password?: string): Promise<EzTzKeyPair> {
    if (typeof esk === 'undefined') throw new Error('ES parameter must be provided.');
    if (typeof password === 'undefined') throw new Error('Password parameter must be provided.');

    const esb = utility.b58cdecode(esk, 'edesk');
    const salt = esb.slice(0, 8);
    const esm = esb.slice(8);

    const sodium = await library.sodium;

    const subleCrypto = new Crypto().subtle;
    const key = await subleCrypto.importKey('raw', new TextEncoder('utf-8').encode(password), 'PBKDF2', false, ['deriveBits']);
    const derivedBits = await subleCrypto.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations: 32768,
        hash: { name: 'SHA-512' }
      },
      key,
      256
    );

    const openSecretBox = sodium.crypto_secretbox_open_easy(esm, new Uint8Array(24), new Uint8Array(derivedBits));
    const kp = sodium.crypto_sign_seed_keypair(openSecretBox);
    return {
      sk: utility.b58cencode(kp.privateKey, 'edsk'),
      pk: utility.b58cencode(kp.publicKey, 'edpk'),
      pkh: utility.b58cencode(sodium.crypto_generichash(20, kp.publicKey), 'tz1')
    };
  },
  async extractKeys(sk: string): Promise<EzTzKeyPair | false> {
    const pref = sk.substr(0, 4);
    if (pref !== 'edsk') {
      throw new Error('Not an Tezos format Ed25519 key.');
    }
    const sodium = await library.sodium;
    if (sk.length === 98) {
      const pkPayload = utility.b58cdecode(sk, 'edsk').slice(32);
      return {
        pk: utility.b58cencode(pkPayload, 'edpk'),
        pkh: utility.b58cencode(sodium.crypto_generichash(20, pkPayload), 'tz1'),
        sk
      };
    }
    if (sk.length === 54) {
      // seed
      const s = utility.b58cdecode(sk, 'edsk$short');
      const kp = sodium.crypto_sign_seed_keypair(s);
      return {
        sk: utility.b58cencode(kp.privateKey, 'edsk'),
        pk: utility.b58cencode(kp.publicKey, 'edpk'),
        pkh: utility.b58cencode(sodium.crypto_generichash(20, kp.publicKey), 'tz1')
      };
    }

    return false;
  },
  async generateMnemonic(): Promise<string> {
    return (await library.bip39).generateMnemonic(160);
  },
  checkAddress(a: string): boolean {
    try {
      utility.b58cdecode(a, 'tz1');
      return true;
    } catch (e) {
      return false;
    }
  },
  async generateKeys(mnemonic: string, passphrase: string): Promise<EzTzGeneratedKeyPair> {
    const bip39 = await library.bip39;
    const seed = utility.bufView(await bip39.mnemonicToSeed(mnemonic, passphrase));
    const sodium = await library.sodium;
    const { privateKey, publicKey } = sodium.crypto_sign_seed_keypair(seed.slice(0, 32));

    return {
      mnemonic,
      passphrase,
      seed,
      sk: utility.b58cencode(privateKey, 'edsk'),
      pk: utility.b58cencode(publicKey, 'edpk'),
      pkh: utility.b58cencode(sodium.crypto_generichash(20, publicKey), 'tz1')
    };
  },
  async deriveKey({ mnemonic, passphrase, seed }: { mnemonic?: string; passphrase?: string; seed?: string | Uint8Array }, subPath: string): Promise<EzTzKeyPair> {
    const bip39 = await library.bip39;
    let s: Uint8Array;
    if (seed) {
      s = utility.bufView(seed);
    } else if (mnemonic) {
      s = await bip39.mnemonicToSeed(mnemonic, passphrase);
    } else {
      throw new Error('No mnemonic or seed provided');
    }
    const { publicKey, fullKey } = await edHd.derivePath(`m/44'/1729'/${subPath}`, s.slice(0, 32));
    if (!fullKey) throw new Error('No key generated in derivation action');
    const sodium = await library.sodium;
    return {
      sk: utility.b58cencode(fullKey, 'edsk'),
      pk: utility.b58cencode(publicKey, 'edpk'),
      pkh: utility.b58cencode(sodium.crypto_generichash(20, publicKey), 'tz1')
    };
  },
  async sign(bytes: string | Uint8Array, sk: string | Uint8Array, wm?: Uint8Array | number[]) {
    const preBb = bytes instanceof Uint8Array ? bytes : utility.hex2buf(bytes);
    const bb: Uint8Array = typeof wm !== 'undefined' ? utility.mergebuf(wm, preBb) : preBb;
    const sodium = await library.sodium;
    const sig = sodium.crypto_sign_detached(sodium.crypto_generichash(32, bb), sk instanceof Uint8Array ? sk : utility.b58cdecode(sk, 'edsk'), 'uint8array');
    const edsig = utility.b58cencode(sig, 'edsig');
    const sbytes = bytes + utility.buf2hex(sig);
    return {
      bytes,
      sig,
      edsig,
      sbytes
    };
  },
  async verify(bytes: string | Uint8Array, sig: string | Uint8Array, pk: string | Uint8Array) {
    const sodium = await library.sodium;
    const signature = sig instanceof Uint8Array ? utility.bufView(sig) : utility.b58cdecode(sig, 'edsig');
    const publicKey = pk instanceof Uint8Array ? utility.bufView(pk) : utility.b58cdecode(pk, 'edpk');
    const message = bytes instanceof Uint8Array ? utility.bufView(bytes) : utility.hex2buf(bytes);
    return sodium
      .crypto_sign_verify_detached(
        signature,
        sodium.crypto_generichash(32, message),
        publicKey
      );
  }
};
