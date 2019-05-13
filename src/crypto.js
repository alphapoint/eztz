import utility from "./Utility";
import library from "./library"
import prefix from "./prefix"

const { b58cencode, b58cdecode, mergebuf, buf2hex, hex2buf } = utility;

//TODO: Add p256 and secp256k1 cryptographay
const crypto = {
    extractEncryptedKeys: function(esk, password) {
      if (typeof esk == "undefined") return false;
      if (typeof password == "undefined") return false;
      if (typeof crypto.subtle == "undefined") return false;

      const esb = b58cdecode(esk, prefix.edesk);
      const salt = esb.slice(0, 8);
      const esm = esb.slice(8);

      return crypto.subtle
        .importKey(
          "raw",
          new TextEncoder("utf-8").encode(password),
          { name: "PBKDF2" },
          false,
          ["deriveBits"]
        )
        .then(function(key) {
          console.log(key);
          return crypto.subtle.deriveBits(
            {
              name: "PBKDF2",
              salt: salt,
              iterations: 32768,
              hash: { name: "SHA-512" }
            },
            key,
            256
          );
        })
        .then(function(key) {
          console.log(key);
          console.log(
            library.sodium.crypto_secretbox_open_easy(
              esm,
              new Uint8Array(24),
              new Uint8Array(key)
            )
          );
          const kp = library.sodium.crypto_sign_seed_keypair(
            library.sodium.crypto_secretbox_open_easy(
              esm,
              new Uint8Array(24),
              new Uint8Array(key)
            )
          );
          return {
            sk: b58cencode(kp.privateKey, prefix.edsk),
            pk: b58cencode(kp.publicKey, prefix.edpk),
            pkh: b58cencode(
              library.sodium.crypto_generichash(20, kp.publicKey),
              prefix.tz1
            )
          };
        });
    },
    extractKeys: function(sk) {
      const pref = sk.substr(0, 4);
      switch (pref) {
        case "edsk":
          if (sk.length == 98) {
            return {
              pk: b58cencode(
                b58cdecode(sk, prefix.edsk).slice(32),
                prefix.edpk
              ),
              pkh: b58cencode(
                library.sodium.crypto_generichash(
                  20,
                  b58cdecode(sk, prefix.edsk).slice(32)
                ),
                prefix.tz1
              ),
              sk: sk
            };
          } else if (sk.length == 54) {
            //seed
            const s = b58cdecode(sk, prefix.edsk2);
            const kp = library.sodium.crypto_sign_seed_keypair(s);
            return {
              sk: b58cencode(kp.privateKey, prefix.edsk),
              pk: b58cencode(kp.publicKey, prefix.edpk),
              pkh: b58cencode(
                library.sodium.crypto_generichash(20, kp.publicKey),
                prefix.tz1
              )
            };
          }
          break;
        default:
          return false;
          break;
      }
    },
    generateMnemonic: () => library.bip39.generateMnemonic(160),
    checkAddress: function(a) {
      try {
        b58cdecode(a, prefix.tz1);
        return true;
      } catch (e) {
        return false;
      }
    },
    generateKeys: function(m, p) {
      const s = library.bip39.mnemonicToSeed(m, p).slice(0, 32);
      const kp = library.sodium.crypto_sign_seed_keypair(s);
      return {
        mnemonic: m,
        passphrase: p,
        sk: b58cencode(kp.privateKey, prefix.edsk),
        pk: b58cencode(kp.publicKey, prefix.edpk),
        pkh: b58cencode(
          library.sodium.crypto_generichash(20, kp.publicKey),
          prefix.tz1
        )
      };
    },
    sign: function(bytes, sk, wm) {
      var bb = hex2buf(bytes);
      if (typeof wm != "undefined") bb = mergebuf(wm, bb);
      const sig = library.sodium.crypto_sign_detached(
        library.sodium.crypto_generichash(32, bb),
        b58cdecode(sk, prefix.edsk),
        "uint8array"
      );
      const edsig = b58cencode(sig, prefix.edsig);
      const sbytes = bytes + buf2hex(sig);
      return {
        bytes: bytes,
        sig: sig,
        edsig: edsig,
        sbytes: sbytes
      };
    },
    verify: function(bytes, sig, pk) {
      return library.sodium.crypto_sign_verify_detached(
        sig,
        hex2buf(bytes),
        b58cdecode(pk, prefix.edpk)
      );
    }
  };

  export default crypto
