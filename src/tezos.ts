import {forgeOp} from "./forgefunctions";
import node from "./node";
import utility from "./utility";
// @ts-ignore
import BN from "bignumber.js";
import library from "./library";
import prefix from "./prefix";
// @ts-ignore
import {TextEncoder, TextDecoder} from "text-encoding";
//import {Block, OperationParameter} from "./rpc-types";

const {b58cdecode, buf2hex} = utility;
const {prim_mapping_reverse, op_mapping_reverse, op_mapping, prim_mapping} = library;

export default {
    async forge(head: Block, opOb: any, validateLocalForge?: boolean)
        : Promise<{ opbytes: string, opOb: any }> {
        if (typeof validateLocalForge == "undefined") validateLocalForge = true;

        const remoteForgedBytes = await node
            .query("/chains/" +
                head.chain_id +
                "/blocks/" +
                head.hash +
                "/helpers/forge/operations", opOb, undefined);
        let localForgedBytes = buf2hex(b58cdecode(opOb.branch, prefix.b));
        for (let i = 0; i < opOb.contents.length; i++) {
            localForgedBytes += forgeOp(opOb.contents[i]);
        }
        opOb.protocol = head.protocol;
        if (localForgedBytes == remoteForgedBytes)
            return {
                opbytes: localForgedBytes,
                opOb: opOb
            };
        else
            throw "Forge validation error - local and remote bytes don't match";
    },
    encodeRawBytes(input: OperationParameter | OperationParameter[]): string {
        return this._encodeRawBytes(input).toUpperCase();
    },
    _encodeRawBytes(input: OperationParameter | OperationParameter[]): string {
        const result = [];

        if (input instanceof Array) {
            result.push("02");
            const bytes: string = input
                .map(x => {
                    return this._encodeRawBytes(x);
                })
                .join("");
            const len = bytes.length / 2;
            result.push(len.toString(16).padStart(8, "0"));
            result.push(bytes);
        } else if (input instanceof Object) {
            if (input.prim) {
                const args_len = input.args ? input.args.length : 0;
                result.push(prim_mapping_reverse[args_len][input.annots ? 'true' : 'false']);
                result.push(op_mapping_reverse[input.prim]);
                if (input.args) {
                    input.args.forEach((arg) => {
                        return result.push(this._encodeRawBytes(arg));
                    });
                }

                if (input.annots) {
                    const annots_bytes = input.annots
                        .map(x => {
                            return parseInt(buf2hex(new TextEncoder().encode(x)));
                        })
                        .join("20");
                    result.push(
                        (annots_bytes.length / 2).toString(16).padStart(8, "0")
                    );
                    result.push(annots_bytes);
                }
            } else if (input.bytes) {
                const len = input.bytes.length / 2;
                result.push("0A");
                result.push(len.toString(16).padStart(8, "0"));
                result.push(input.bytes);
            } else if (input.int) {
                const num = new BN(input.int, 10);
                const positive_mark = num.toString(2)[0] === "-" ? "1" : "0";
                const binary = num.toString(2).replace("-", "");
                const pad =
                    binary.length <= 6
                        ? 6
                        : (binary.length - 6) % 7
                        ? binary.length + 7 - ((binary.length - 6) % 7)
                        : binary.length;
                const split = binary
                    .padStart(pad, "0")
                    .match(/\d{6,7}/g);
                if (!split)
                    throw new Error("Splitting every 6 to 7 decimal characters matched no result");
                const reversed = split.reverse();

                reversed[0] = positive_mark + reversed[0];
                const num_hex = reversed
                    .map((x, i) => {
                        return parseInt((i === reversed.length - 1 ? "0" : "1") + x, 2)
                            .toString(16)
                            .padStart(2, "0");
                    })
                    .join("");

                result.push("00");
                result.push(num_hex);
            } else if (input.string) {
                const string_bytes: Uint8Array = new TextEncoder().encode(input.string);
                const string_hex = Array.prototype.slice.call(string_bytes)
                    .map((x) => x.toString(16)
                        .padStart(2, "0"))
                    .join("");
                const len = string_bytes.length;
                result.push("01");
                result.push(len.toString(16).padStart(8, "0"));
                result.push(string_hex);
            }
        }

        return result.join("");
    },
    decodeRawBytes(bytes : string) {
        bytes = bytes.toUpperCase();

        let index = 0;

        const read = (len: number) => {
            return bytes.slice(index, index + len);
        };

        const rec: any = () => {
            const b = read(2);
            const prim = prim_mapping[b];

            if (prim instanceof Object) {
                index += 2;
                const op = op_mapping[read(2)];
                index += 2;

                const args = Array.apply(null, new Array(prim.len));
                const result : OperationParameter = {
                    prim: op,
                    args: args.map(function () {
                        return rec();
                    }),
                    annots: undefined
                };

                if (!prim.len) delete result.args;

                if (prim.annots) {
                    const annots_len = parseInt(read(8), 16) * 2;
                    index += 8;

                    const string_hex_lst = read(annots_len).match(/[\dA-F]{2}/g);
                    index += annots_len;

                    if (string_hex_lst) {
                        const string_bytes = new Uint8Array(
                            string_hex_lst.map(function (x) {
                                return parseInt(x, 16);
                            })
                        );
                        const string_result = new TextDecoder("utf-8").decode(string_bytes);
                        result.annots = string_result.split(" ");
                    }
                } else {
                    delete result.annots;
                }

                return result;
            } else {
                if (b === "0A") {
                    index += 2;
                    const len = read(8);
                    index += 8;
                    const int_len = parseInt(len, 16) * 2;
                    const data = read(int_len);
                    index += int_len;
                    return {bytes: data};
                } else if (b === "01") {
                    index += 2;
                    const len = read(8);
                    index += 8;
                    const int_len = parseInt(len, 16) * 2;
                    const data = read(int_len);
                    index += int_len;

                    const match_result = data.match(/[\dA-F]{2}/g);
                    if (match_result instanceof Array) {
                        const string_raw = new Uint8Array(
                            match_result.map(function (x) {
                                return parseInt(x, 16);
                            })
                        );
                        return {string: new TextDecoder("utf-8").decode(string_raw)};
                    } else {
                        throw "Input bytes error";
                    }
                } else if (b === "00") {
                    index += 2;

                    const first_bytes = parseInt(read(2), 16)
                        .toString(2)
                        .padStart(8, "0");
                    index += 2;
                    const is_positive = first_bytes[1] === "0";

                    const valid_bytes = [first_bytes.slice(2)];

                    let checknext = first_bytes[0] === "1";
                    while (checknext) {
                        const bytes = parseInt(read(2), 16)
                            .toString(2)
                            .padStart(8, "0");
                        index += 2;

                        valid_bytes.push(bytes.slice(1));
                        checknext = bytes[0] === "1";
                    }

                    const num = new BN(valid_bytes.reverse().join(""), 2);
                    return {int: num.toString()};
                } else if (b === "02") {
                    index += 2;

                    const len = read(8);
                    index += 8;
                    const int_len = parseInt(len, 16) * 2;
                    const data = read(int_len);
                    const limit = index + int_len;

                    const seq_lst = [];
                    while (limit > index) {
                        seq_lst.push(rec());
                    }
                    return seq_lst;
                }
            }

            throw `Invalid raw bytes: Byte:${b} Index:${index}`;
        };

        return rec();
    }
};
