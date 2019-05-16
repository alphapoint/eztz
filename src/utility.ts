import BN from "bignumber.js";
// @ts-ignore
import bs58check from "bs58check";

export default {
    toBytesInt32Hex(num: string | number) {
        return this.buf2hex(this.toBytesInt32(num));
    },
    toBytesInt32(num: string | number): ArrayBuffer {
        if (typeof num === "string")
            num = parseInt(num);
        const arr = new Uint8Array([
            (num & 0xff000000) >> 24,
            (num & 0x00ff0000) >> 16,
            (num & 0x0000ff00) >> 8,
            num & 0x000000ff
        ]);
        return arr.buffer;
    },
    totez(m: string): number {
        return parseInt(m) / 1000000;
    },
    mutez(tz: string): string {
        return new BN(new BN(tz).toFixed(6)).multipliedBy(1000000).toString();
    },
    b58cencode(payload: Uint8Array, prefix: Uint8Array): string {
        const n = new Uint8Array(prefix.length + payload.length);
        n.set(prefix);
        n.set(payload, prefix.length);
        return bs58check.encode(Buffer.from(n));
    },
    b58cdecode(enc: Uint8Array | string, prefix: Uint8Array): Uint8Array {
        return bs58check.decode(enc).slice(prefix.length);
    },
    buf2hex(buffer: Uint8Array | ArrayBuffer): string {
        const byteArray = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer),
            hexParts = [];
        for (let i = 0; i < byteArray.length; i++) {
            let hex = byteArray[i].toString(16);
            let paddedHex = ("00" + hex).slice(-2);
            hexParts.push(paddedHex);
        }
        return hexParts.join("");
    },
    hex2buf(hex: string): Uint8Array {
        const hexPairs = hex.match(/[\da-f]{2}/gi);
        if (hexPairs == null)
            throw new Error("Not a hex string");
        return new Uint8Array(
            hexPairs
                .map(function (h) {
                    return parseInt(h, 16);
                })
        );
    },
    hexNonce(length: number): string {
        const chars = "0123456789abcedf";
        var hex = "";
        while (length--)
            hex += chars.charAt((Math.random() * 16) | 0);
        return hex;
    },
    mergebuf(b1: Uint8Array | number[], b2: Uint8Array | number[]): Uint8Array {
        var r = new Uint8Array(b1.length + b2.length);
        r.set(b1);
        r.set(b2, b1.length);
        return r;
    },
    sexp2mic(mi: string): OperationParameter {
        mi = mi
            .replace(/(?:@[a-z_]+)|(?:#.*$)/gm, "")
            .replace(/\s+/g, " ")
            .trim();
        if (mi.charAt(0) === "(")
            mi = mi.slice(1, -1);
        let pl = 0;
        let sopen = false;
        let escaped = false;
        const ret = {
            prim: "",
            args: <OperationParameter[]>[]
        };
        let val = "";
        for (let i = 0; i < mi.length; i++) {
            if (escaped) {
                val += mi[i];
                escaped = false;
                continue;
            } else if (
                (i === mi.length - 1 && sopen === false) ||
                (mi[i] === " " && pl === 0 && sopen === false)
            ) {
                if (i === mi.length - 1) val += mi[i];
                if (val) {
                    let valInt = parseInt(val);
                    if (val === valInt.toString()) {
                        if (!ret.prim)
                            return {int: valInt};
                        else ret.args.push({int: valInt});
                    } else if (val[0] === "0") {
                        if (!ret.prim)
                            return {bytes: val};
                        else ret.args.push({bytes: val});
                    } else if (ret.prim) {
                        // @ts-ignore
                        ret.args.push(this.sexp2mic(val));
                    } else {
                        ret.prim = val;
                    }
                    val = "";
                }
                continue;
            } else if (mi[i] === '"' && sopen) {
                sopen = false;
                if (!ret.prim) return {string: val};
                else ret.args.push({string: val});
                val = "";
                continue;
            } else if (mi[i] === '"' && !sopen && pl === 0) {
                sopen = true;
                continue;
            } else if (mi[i] === "\\") escaped = true;
            else if (mi[i] === "(") pl++;
            else if (mi[i] === ")") pl--;
            val += mi[i];
        }
        return ret;
    },
    mic2arr(s: OperationParameter): any {
        let ret: any = [];
        if (s.hasOwnProperty("prim")) {
            if (s.prim === "Pair") {
                if (!s.args) throw new Error("Prim is pair but args is empty");
                ret.push(this.mic2arr(s.args[0]));
                ret = ret.concat(this.mic2arr(s.args[1]));
            } else if (s.prim === "Elt") {
                if (!s.args) throw new Error("Prim is Elt but args is empty");
                ret = {
                    key: this.mic2arr(s.args[0]),
                    val: this.mic2arr(s.args[1])
                };
            } else if (s.prim === "True") {
                ret = true;
            } else if (s.prim === "False") {
                ret = false;
            }
        } else {
            if (Array.isArray(s)) {
                let sc = s.length;
                for (let i = 0; i < sc; i++) {
                    let n = this.mic2arr(s[i]);
                    if (typeof n.key !== "undefined") {
                        if (Array.isArray(ret)) {
                            ret = {
                                keys: [],
                                vals: []
                            };
                        }
                        ret.keys.push(n.key);
                        ret.vals.push(n.val);
                    } else {
                        ret.push(n);
                    }
                }
            } else if (s.hasOwnProperty("string")) {
                ret = s.string;
            } else if (s.hasOwnProperty("int") && typeof s.int !== 'undefined') {
                if (typeof s.int === 'string')
                    ret = parseInt(s.int);
                else
                    ret = s.int;
            } else {
                ret = s;
            }
        }
        return ret;
    },
    ml2mic(mi: string | string[]): OperationParameter[] {
        let inseq = false,
            seq = "",
            val = "",
            pl = 0,
            bl = 0,
            sopen = false,
            escaped = false;
        const ret: OperationParameter[] = [];
        for (let i = 0; i < mi.length; i++) {
            if (val === "}" || val === ";") {
                val = "";
            }
            if (inseq) {
                if (mi[i] === "}") {
                    bl--;
                } else if (mi[i] === "{") {
                    bl++;
                }
                if (bl === 0) {
                    let st = this.ml2mic(val);
                    ret.push({
                        prim: seq.trim(),
                        // TODO: should this really be OperationParameter[][] ?
                        // @ts-ignore
                        args: [st]
                    });
                    val = "";
                    bl = 0;
                    inseq = false;
                }
            } else if (mi[i] === "{") {
                bl++;
                seq = val;
                val = "";
                inseq = true;
                continue;
            } else if (escaped) {
                val += mi[i];
                escaped = false;
                continue;
            } else if (
                (i === mi.length - 1 && !sopen) ||
                (mi[i] === ";" && pl === 0 && !sopen)
            ) {
                if (i === mi.length - 1) val += mi[i];
                if (val.trim() === "" || val.trim() === "}" || val.trim() === ";") {
                    val = "";
                    continue;
                }
                ret.push(this.sexp2mic(val));
                val = "";
                continue;
            } else if (mi[i] === '"' && sopen) sopen = false;
            else if (mi[i] === '"' && !sopen) sopen = true;
            else if (mi[i] === "\\") escaped = true;
            else if (mi[i] === "(") pl++;
            else if (mi[i] === ")") pl--;
            val += mi[i];
        }
        return ret;
    },
    formatMoney(n: any | string | number, c: number, d: string, t: string): string {
        if (isNaN((c = Math.abs(c)))) c = 2;
        if (d === undefined) d = ".";
        if (t === undefined) t = ",";
        const s = n < 0 ? "-" : "";
        const i: any | string | number = String(parseInt((n = Math.abs(Number(n) || 0).toFixed(c))));
        const j = i.length > 3 ? i.length % 3 : 0;
        return (
            s +
            (j ? i.substr(0, j) + t : "") +
            i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) +
            (c
                ? d +
                Math.abs(n - i)
                    .toFixed(c)
                    .slice(2)
                : "")
        );
    }
};
