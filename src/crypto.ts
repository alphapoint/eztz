import utility from "./utility";
import library from "./library"
import prefix from "./prefix";
// @ts-ignore
import {TextEncoder} from "text-encoding";
// @ts-ignore
import {Crypto} from "@peculiar/webcrypto";

const crypto = new Crypto();

//TODO: Add p256 and secp256k1 cryptographay
export default {
    extractEncryptedKeys(esk: string, password: string) {
        if (typeof esk == "undefined")
            throw new Error("ES parameter must be provided.");
        if (typeof password == "undefined")
            throw new Error("Password parameter must be provided.");

        const esb = utility.b58cdecode(esk, prefix.edesk);
        const salt = esb.slice(0, 8);
        const esm = esb.slice(8);

        return crypto.subtle
            .importKey(
                "raw",
                new TextEncoder("utf-8").encode(password),
                "PBKDF2",
                false,
                ["deriveBits"]
            )
            .then(function (key: any) {
                console.log(key);
                return crypto.subtle.deriveBits(
                    {
                        name: "PBKDF2",
                        salt: salt,
                        iterations: 32768,
                        hash: {name: "SHA-512"}
                    },
                    key,
                    256
                );
            })
            .then(function (key: ArrayBuffer) {
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
                    sk: utility.b58cencode(kp.privateKey, prefix.edsk),
                    pk: utility.b58cencode(kp.publicKey, prefix.edpk),
                    pkh: utility.b58cencode(
                        library.sodium.crypto_generichash(20, kp.publicKey),
                        prefix.tz1
                    )
                };
            });
    },
    extractKeys(sk: string): KeyPair | false {
        const pref = sk.substr(0, 4);
        switch (pref) {
            case "edsk":
                if (sk.length == 98) {
                    return {
                        pk: utility.b58cencode(
                            utility.b58cdecode(sk, prefix.edsk).slice(32),
                            prefix.edpk
                        ),
                        pkh: utility.b58cencode(
                            library.sodium.crypto_generichash(
                                20,
                                utility.b58cdecode(sk, prefix.edsk).slice(32)
                            ),
                            prefix.tz1
                        ),
                        sk
                    };
                } else if (sk.length == 54) {
                    //seed
                    const s = utility.b58cdecode(sk, prefix.edsk2);
                    const kp = library.sodium.crypto_sign_seed_keypair(s);
                    return {
                        sk: utility.b58cencode(kp.privateKey, prefix.edsk),
                        pk: utility.b58cencode(kp.publicKey, prefix.edpk),
                        pkh: utility.b58cencode(
                            library.sodium.crypto_generichash(20, kp.publicKey),
                            prefix.tz1
                        )
                    };
                }
                break;
        }
        return false;
    },
    generateMnemonic() {
        return library.bip39.generateMnemonic(160)
    },
    checkAddress(a: string) {
        try {
            utility.b58cdecode(a, prefix.tz1);
            return true;
        } catch (e) {
            return false;
        }
    },
    async generateKeys(m: string, p: string) {
        const s: Buffer = await library.bip39.mnemonicToSeed(m, p);
        let seed: Buffer = s.slice(0, 32);
        const kp = library.sodium.crypto_sign_seed_keypair(seed);
        return {
            mnemonic: m,
            passphrase: p,
            sk: utility.b58cencode(kp.privateKey, prefix.edsk),
            pk: utility.b58cencode(kp.publicKey, prefix.edpk),
            pkh: utility.b58cencode(
                library.sodium.crypto_generichash(20, kp.publicKey),
                prefix.tz1
            )
        };
    },
    sign(bytes: string, sk: string, wm: Uint8Array | number[]) {
        var bb = utility.hex2buf(bytes);
        if (typeof wm != "undefined") bb = utility.mergebuf(wm, bb);
        const sig = library.sodium.crypto_sign_detached(
            library.sodium.crypto_generichash(32, bb),
            utility.b58cdecode(sk, prefix.edsk),
            "uint8array"
        );
        const edsig = utility.b58cencode(sig, prefix.edsig);
        const sbytes = bytes + utility.buf2hex(sig);
        return {
            bytes: bytes,
            sig: sig,
            edsig: edsig,
            sbytes: sbytes
        };
    },
    verify(bytes: string, sig: any, pk: string) {
        return library.sodium.crypto_sign_verify_detached(
            sig,
            utility.hex2buf(bytes),
            utility.b58cdecode(pk, prefix.edpk)
        );
    }
};
