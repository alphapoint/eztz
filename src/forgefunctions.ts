import utility from "./Utility";
import tezos from "./tezos"
import library from "./library";

const {b58cdecode, buf2hex, toBytesInt32, toBytesInt32Hex} = utility;

//Forge functions
const forgeOpTags = <> {
    endorsement: 0,
    seed_nonce_revelation: 1,
    double_endorsement_evidence: 2,
    double_baking_evidence: 3,
    activate_account: 4,
    proposals: 5,
    ballot: 6,
    reveal: 7,
    transaction: 8,
    origination: 9,
    delegation: 10
};

function forgeOp(op) {
    var fop;
    fop = buf2hex(new Uint8Array([forgeOpTags[op.kind]]));
    switch (forgeOpTags[op.kind]) {
        case 0:
        case 1:
            fop += buf2hex(toBytesInt32(op.level));
            if (forgeOpTags[op.kind] == 0) break;
            fop += op.nonce;
            if (forgeOpTags[op.kind] == 1) break;
        case 2:
        case 3:
            throw "Double bake and double endorse forging is not complete";
            if (forgeOpTags[op.kind] == 2) break;
            if (forgeOpTags[op.kind] == 3) break;
        case 4:
            fop += buf2hex(
                b58cdecode(op.pkh, eztz.prefix.tz1)
            );
            fop += op.secret;
            if (forgeOpTags[op.kind] == 4) break;
        case 5:
        case 6:
            fop += forgePublicKeyHash(op.source);
            fop += buf2hex(toBytesInt32(op.period));
            if (forgeOpTags[op.kind] == 5) {
                throw "Proposal forging is not complete";
                break;
            } else if (forgeOpTags[op.kind] == 6) {
                fop += buf2hex(
                    b58cdecode(op.proposal, eztz.prefix.P)
                );
                fop += op.ballot == "yay" ? "00" : op.ballot == "nay" ? "01" : "02";
                break;
            }
        case 7:
        case 8:
        case 9:
        case 10:
            fop += forgeAddress(op.source);
            fop += forgeZarith(op.fee);
            fop += forgeZarith(op.counter);
            fop += forgeZarith(op.gas_limit);
            fop += forgeZarith(op.storage_limit);
            if (forgeOpTags[op.kind] == 7) {
                fop += forgePublicKey(op.public_key);
            } else if (forgeOpTags[op.kind] == 8) {
                fop += forgeZarith(op.amount);
                fop += forgeAddress(op.destination);
                if (typeof op.parameters != "undefined" && op.parameters) {
                    fop += forgeBool(true);
                    fop += forgeParameters(op.parameters);
                } else {
                    fop += forgeBool(false);
                }
            } else if (forgeOpTags[op.kind] == 9) {
                fop += forgePublicKeyHash(op.managerPubkey);
                fop += forgeZarith(op.balance);
                fop += forgeBool(op.spendable);
                fop += forgeBool(op.delegatable);
                if (typeof op.delegate != "undefined" && op.delegate) {
                    fop += forgeBool(true);
                    fop += forgePublicKeyHash(op.delegate);
                } else {
                    fop += forgeBool(false);
                }
                if (typeof op.script != "undefined" && op.script) {
                    fop += forgeBool(true);
                    fop += forgeScript(op.script);
                } else {
                    fop += forgeBool(false);
                }
            } else if (forgeOpTags[op.kind] == 10) {
                if (typeof op.delegate != "undefined" && op.delegate) {
                    fop += forgeBool(true);
                    fop += forgePublicKeyHash(op.delegate);
                } else {
                    fop += forgeBool(false);
                }
            }
            break;
    }
    return fop;
}

function forgeBool(b) {
    return b ? "ff" : "00";
}

function forgeScript(s) {
    var t1 = tezos.encodeRawBytes(s.code).toLowerCase();
    var t2 = tezos.encodeRawBytes(s.storage).toLowerCase();
    return (
        toBytesInt32Hex(t1.length / 2) + t1 + toBytesInt32Hex(t2.length / 2) + t2
    );
}

function forgeParameters(p) {
    var t = tezos.encodeRawBytes(p).toLowerCase();
    return toBytesInt32Hex(t.length / 2) + t;
}

function forgeAddress(a) {
    var fa;
    if (a.substr(0, 1) == "K") {
        fa = "01";
        fa += buf2hex(b58cdecode(a, eztz.prefix.KT));
        fa += "00";
    } else {
        fa = "00";
        fa += forgePublicKeyHash(a);
    }
    return fa;
}

function forgeZarith(n) {
    var fn = "";
    n = parseInt(n);
    while (true) {
        if (n < 128) {
            if (n < 16) fn += "0";
            fn += n.toString(16);
            break;
        } else {
            var b = n % 128;
            n -= b;
            n /= 128;
            b += 128;
            fn += b.toString(16);
        }
    }
    return fn;
}

function forgePublicKeyHash(pkh) {
    var fpkh;
    var t = parseInt(pkh.substr(2, 1));
    fpkh = "0" + (t - 1).toString();
    fpkh += buf2hex(
        b58cdecode(pkh, eztz.prefix[pkh.substr(0, 3)])
    );
    return fpkh;
}

function forgePublicKey(pk) {
    var fpk;
    var t;
    switch (pk.substr(0, 2)) {
        case "ed":
            fpk = "00";
            break;
        case "sp":
            fpk = "01";
            break;
        case "p2":
            fpk = "02";
            break;
    }
    fpk += buf2hex(
        b58cdecode(pk, eztz.prefix[pk.substr(0, 4)])
    );
    return fpk;
}

export {forgeOp};
