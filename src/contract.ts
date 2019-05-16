// @ts-ignore
import sodium from "libsodium-wrappers"
import rpc from "./rpc";
import prefix from "./prefix";
import utility from "./utility";
import node from "./node"

export default {
    hash(operationHash, ind) {
        var ob = utility.b58cdecode(operationHash, prefix.o),
            tt = [],
            i = 0;
        for (; i < ob.length; i++) {
            tt.push(ob[i]);
        }
        tt = tt.concat([
            (ind & 0xff000000) >> 24,
            (ind & 0x00ff0000) >> 16,
            (ind & 0x0000ff00) >> 8,
            ind & 0x000000ff
        ]);
        return utility.b58cencode(
            sodium.crypto_generichash(20, new Uint8Array(tt)),
            prefix.KT
        );
    },
    originate(keys, amount, code, init, spendable, delegatable, delegate, fee, gasLimit, storageLimit) {
        if (typeof gasLimit == "undefined") gasLimit = "10000";
        if (typeof storageLimit == "undefined") storageLimit = "10000";
        return rpc.originate(
            keys,
            amount,
            code,
            init,
            spendable,
            delegatable,
            delegate,
            fee,
            gasLimit,
            storageLimit
        );
    },
    send(contract, from, keys, amount, parameter, fee, gasLimit, storageLimit) {
        if (typeof gasLimit == "undefined") gasLimit = "2000";
        if (typeof storageLimit == "undefined") storageLimit = "0";
        return rpc.transfer(
            from,
            keys,
            contract,
            amount,
            fee,
            parameter,
            gasLimit,
            storageLimit
        );
    },
    balance(contract) {
        return rpc.getBalance(contract);
    },
    storage(contract) {
        return new Promise(function (resolve, reject) {
            node
                .query(
                    "/chains/main/blocks/head/context/contracts/" +
                    contract +
                    "/storage"
                )
                .then(function (r) {
                    resolve(r);
                })
                .catch(function (e) {
                    reject(e);
                });
        });
    },
    load: function (contract) {
        return node.query(
            "/chains/main/blocks/head/context/contracts/" + contract
        );
    },
    watch(cc, timeout, cb) {
        let storage = [];
        const ct = () => {
            this.storage(cc).then(function (r) {
                if (JSON.stringify(storage) != JSON.stringify(r)) {
                    storage = r;
                    cb(storage);
                }
            });
        };
        ct();
        return setInterval(ct, timeout * 1000);
    }
};
