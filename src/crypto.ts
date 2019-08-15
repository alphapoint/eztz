import { utility } from './utility';
import { library } from './library';
import { prefix } from './prefix';
// @ts-ignore
import { TextEncoder } from 'text-encoding';
// @ts-ignore
import { Crypto } from '@peculiar/webcrypto';
import * as edHd from './ed25519-kd-key';

const _crypto = new Crypto();

//TODO: Add p256 and secp256k1 cryptographay
export const crypto = {
  async extractEncryptedKeys(esk?: string, password?: string): Promise<KeyPair> {
    if (typeof esk == 'undefined') throw new Error('ES parameter must be provided.');
    if (typeof password == 'undefined') throw new Error('Password parameter must be provided.');

    const esb = utility.b58cdecode(esk, prefix.edesk);
    const salt = esb.slice(0, 8);
    const esm = esb.slice(8);

    const sodium = await library.sodium;

    const key = await _crypto.subtle.importKey('raw', new TextEncoder('utf-8').encode(password), 'PBKDF2', false, ['deriveBits']);
    const derivedBits = await _crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 32768,
        hash: { name: 'SHA-512' }
      },
      key,
      256
    );

    const openSecretBox = sodium.crypto_secretbox_open_easy(esm, new Uint8Array(24), new Uint8Array(derivedBits));
    const kp = sodium.crypto_sign_seed_keypair(openSecretBox);
    return {
      sk: utility.b58cencode(kp.privateKey, prefix.edsk),
      pk: utility.b58cencode(kp.publicKey, prefix.edpk),
      pkh: utility.b58cencode(sodium.crypto_generichash(20, kp.publicKey), prefix.tz1)
    };
  },
  async extractKeys(sk: string): Promise<KeyPair | false> {
    const pref = sk.substr(0, 4);
    if (pref !== 'edsk') {
      return false;
    }

    const sodium = await library.sodium;
    if (sk.length == 98) {
      let pkPayload = utility.b58cdecode(sk, prefix.edsk).slice(32);
      return {
        pk: utility.b58cencode(pkPayload, prefix.edpk),
        pkh: utility.b58cencode(sodium.crypto_generichash(20, pkPayload), prefix.tz1),
        sk
      };
    } else if (sk.length == 54) {
      //seed
      const s = utility.b58cdecode(sk, prefix.edsk2);
      const kp = sodium.crypto_sign_seed_keypair(s);
      return {
        sk: utility.b58cencode(kp.privateKey, prefix.edsk),
        pk: utility.b58cencode(kp.publicKey, prefix.edpk),
        pkh: utility.b58cencode(sodium.crypto_generichash(20, kp.publicKey), prefix.tz1)
      };
    }

    return false;
  },
  async generateMnemonic(): Promise<string> {
    return (await library.bip39).generateMnemonic(160);
  },
  checkAddress(a: string): boolean {
    try {
      utility.b58cdecode(a, prefix.tz1);
      return true;
    } catch (e) {
      return false;
    }
  },
  async generateKeys(m: string, p: string): Promise<GeneratedKeyPair> {
    const bip39 = await library.bip39;
    const s: Buffer = await bip39.mnemonicToSeed(m, p);
    let seed: Buffer = s.slice(0, 32);
    const sodium = await library.sodium;
    const kp = sodium.crypto_sign_seed_keypair(seed);

    return {
      mnemonic: m,
      passphrase: p,
      seed: s,
      sk: utility.b58cencode(kp.privateKey, prefix.edsk),
      pk: utility.b58cencode(kp.publicKey, prefix.edpk),
      pkh: utility.b58cencode(sodium.crypto_generichash(20, kp.publicKey), prefix.tz1)
    };
  },
  async deriveKey({ mnemonic, passphrase, seed }: { mnemonic?: string; passphrase?: string; seed?: string | Uint8Array }, subPath: string): Promise<KeyPair> {
    const bip39 = await library.bip39;
    let s: Buffer;
    if (typeof seed === 'string') {
      s = Buffer.from(seed, 'hex');
    } else if (seed instanceof Buffer) {
      s = seed;
    } else {
      // noinspection SuspiciousTypeOfGuard
      if (seed instanceof Uint8Array) {
        s = Buffer.from(seed);
      } else {
        if (mnemonic) {
          s = await bip39.mnemonicToSeed(mnemonic, passphrase);
        } else {
          throw new Error('No mnemonic or seed provided');
        }
      }
    }
    const { key: privateKey } = edHd.derivePath(`m/44'/1729'/${subPath}`, s.toString('hex'));
    const { publicKey, fullKey } = await edHd.getKeyPair(privateKey)
    if (!fullKey) throw new Error('No private key generated in derivation action');
    const sodium = await library.sodium;
    return {
      sk: utility.b58cencode(privateKey, prefix.edsk),
      pk: utility.b58cencode(publicKey, prefix.edpk),
      pkh: utility.b58cencode(sodium.crypto_generichash(20, publicKey), prefix.tz1)
    };
  },
  async sign(bytes: string | Uint8Array, sk: string | Uint8Array, wm?: Uint8Array | number[]) {
    const preBb = bytes instanceof Uint8Array ? bytes : utility.hex2buf(bytes);
    const bb: Uint8Array = typeof wm !== 'undefined' ? utility.mergebuf(wm, preBb) : preBb;
    const sodium = await library.sodium;
    const sig = sodium.crypto_sign_detached(sodium.crypto_generichash(32, bb), sk instanceof Uint8Array ? sk : utility.b58cdecode(sk, prefix.edsk), 'uint8array');
    const edsig = utility.b58cencode(sig, prefix.edsig);
    const sbytes = bytes + utility.buf2hex(sig);
    return {
      bytes: bytes,
      sig: sig,
      edsig: edsig,
      sbytes: sbytes
    };
  },
  async verify(bytes: string | Uint8Array, sig: string | Uint8Array, pk: string | Uint8Array) {
    const sodium = await library.sodium;
    const prepBuff = bytes instanceof Uint8Array ? bytes : utility.hex2buf(bytes)
    return sodium.crypto_sign_verify_detached(
      sig instanceof Uint8Array ? sig : utility.b58cdecode(sig, prefix.edsig),
      sodium.crypto_generichash(32, prepBuff),
      pk instanceof Uint8Array ? pk : utility.b58cdecode(pk, prefix.edpk)
    );
  }
};
