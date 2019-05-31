// @ts-ignore
import sodium from "libsodium-wrappers"
import rpc from "./rpc";
import prefix from "./prefix";
import utility from "./utility";
import node from "./node"

export const contract = {
    hash(operationHash: any, ind: any) {
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
    originate(keys: KeyPair, amount: string, code: any, init: string, spendable: boolean, delegatable: boolean, delegate: string, fee: string, gasLimit: string, storageLimit: string) {
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
    send(contract: string, from: string, keys: KeyPair, amount: string, parameter: any, fee: string, gasLimit: string, storageLimit: string) {
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
    balance(contract: string) {
        return rpc.getBalance(contract);
    },
    storage(contract: string): Promise<OperationParameter> {
        return node
            .query("/chains/main/blocks/head/context/contracts/" + contract + "/storage");
    },
    load: function (contract: string) {
        return node.query("/chains/main/blocks/head/context/contracts/" + contract);
    },
    watch(cc: string, interval: number, cb: any) {
        let storage: OperationParameter[] | OperationParameter = [];
        const ct = () => {
            this.storage(cc).then(function (r) {
                if (JSON.stringify(storage) != JSON.stringify(r)) {
                    storage = r;
                    cb(storage);
                }
            });
        };
        ct();
        return setInterval(ct, interval * 1000);
    }
};

export default contract;
