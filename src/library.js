const op_mapping = {
    "00": "parameter",
    "01": "storage",
    "02": "code",
    "03": "False",
    "04": "Elt",
    "05": "Left",
    "06": "None",
    "07": "Pair",
    "08": "Right",
    "09": "Some",
    "0A": "True",
    "0B": "Unit",
    "0C": "PACK",
    "0D": "UNPACK",
    "0E": "BLAKE2B",
    "0F": "SHA256",
    "10": "SHA512",
    "11": "ABS",
    "12": "ADD",
    "13": "AMOUNT",
    "14": "AND",
    "15": "BALANCE",
    "16": "CAR",
    "17": "CDR",
    "18": "CHECK_SIGNATURE",
    "19": "COMPARE",
    "1A": "CONCAT",
    "1B": "CONS",
    "1C": "CREATE_ACCOUNT",
    "1D": "CREATE_CONTRACT",
    "1E": "IMPLICIT_ACCOUNT",
    "1F": "DIP",
    "20": "DROP",
    "21": "DUP",
    "22": "EDIV",
    "23": "EMPTY_MAP",
    "24": "EMPTY_SET",
    "25": "EQ",
    "26": "EXEC",
    "27": "FAILWITH",
    "28": "GE",
    "29": "GET",
    "2A": "GT",
    "2B": "HASH_KEY",
    "2C": "IF",
    "2D": "IF_CONS",
    "2E": "IF_LEFT",
    "2F": "IF_NONE",
    "30": "INT",
    "31": "LAMBDA",
    "32": "LE",
    "33": "LEFT",
    "34": "LOOP",
    "35": "LSL",
    "36": "LSR",
    "37": "LT",
    "38": "MAP",
    "39": "MEM",
    "3A": "MUL",
    "3B": "NEG",
    "3C": "NEQ",
    "3D": "NIL",
    "3E": "NONE",
    "3F": "NOT",
    "40": "NOW",
    "41": "OR",
    "42": "PAIR",
    "43": "PUSH",
    "44": "RIGHT",
    "45": "SIZE",
    "46": "SOME",
    "47": "SOURCE",
    "48": "SENDER",
    "49": "SELF",
    "4A": "STEPS_TO_QUOTA",
    "4B": "SUB",
    "4C": "SWAP",
    "4D": "TRANSFER_TOKENS",
    "4E": "SET_DELEGATE",
    "4F": "UNIT",
    "50": "UPDATE",
    "51": "XOR",
    "52": "ITER",
    "53": "LOOP_LEFT",
    "54": "ADDRESS",
    "55": "CONTRACT",
    "56": "ISNAT",
    "57": "CAST",
    "58": "RENAME",
    "59": "bool",
    "5A": "contract",
    "5B": "int",
    "5C": "key",
    "5D": "key_hash",
    "5E": "lambda",
    "5F": "list",
    "60": "map",
    "61": "big_map",
    "62": "nat",
    "63": "option",
    "64": "or",
    "65": "pair",
    "66": "set",
    "67": "signature",
    "68": "string",
    "69": "bytes",
    "6A": "mutez",
    "6B": "timestamp",
    "6C": "unit",
    "6D": "operation",
    "6E": "address",
    "6F": "SLICE"
};

const library = {
    bs58check: require("bs58check"),
    sodium: require("libsodium-wrappers"),
    bip39: require("bip39"),
    pbkdf2: require("pbkdf2"),
    op_mapping_reverse: (function() {
        var result = {};
        for (const key in op_mapping) {
          result[op_mapping[key]] = key;
        }
        return result;
    })(),
    prim_mapping: {
        "00": "int",
        "01": "string",
        "02": "seq",
        "03": { name: "prim", len: 0, annots: false },
        "04": { name: "prim", len: 0, annots: true },
        "05": { name: "prim", len: 1, annots: false },
        "06": { name: "prim", len: 1, annots: true },
        "07": { name: "prim", len: 2, annots: false },
        "08": { name: "prim", len: 2, annots: true },
        "09": { name: "prim", len: 3, annots: true },
        "0A": "bytes"
    },
    prim_mapping_reverse: {
        [0]: {
          false: "03",
          true: "04"
        },
        [1]: {
          false: "05",
          true: "06"
        },
        [2]: {
          false: "07",
          true: "08"
        },
        [3]: {
          true: "09"
        }
    },
    toBytesInt32Hex: function(num) {
        return utility.buf2hex(toBytesInt32(num));
    },
    toBytesInt32: function(num) {
        num = parseInt(num);
        arr = new Uint8Array([
            (num & 0xff000000) >> 24,
            (num & 0x00ff0000) >> 16,
            (num & 0x0000ff00) >> 8,
            num & 0x000000ff
        ]);
        return arr.buffer;
    },
    op_mapping
};

module.exports = library;