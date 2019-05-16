import watermark from "./watermark"
import node from "./node"
import utility from "./utility"
import crypto from "./crypto"
import tezos from "./tezos";

const counters: { [key: string]: number } = {};

export default {
    call(e: string, d?: any): Promise<any> {
        return node.query(e, d);
    },
    getBalance(a: string): Promise<string> {
        return node
            .query("/chains/main/blocks/head/context/contracts/" + a + "/balance");
    },
    getDelegate(a: string): Promise<string | false> {
        return node
            .query("/chains/main/blocks/head/context/contracts/" + a + "/delegate")
            .then(function (r) {
                if (r) return r;
                return false;
            })
            .catch(() => false);
    },
    getManager(a: string): Promise<string> {
        return node.query(
            "/chains/main/blocks/head/context/contracts/" + a + "/manager_key"
        );
    },
    getCounter(a: string): Promise<string> {
        return node.query("/chains/main/blocks/head/context/contracts/" + a + "/counter");
    },
    getBaker(tz1: string): Promise<string> {
        return node.query("/chains/main/blocks/head/context/delegates/" + tz1);
    },
    getHead(): Promise<Block> {
        return node.query("/chains/main/blocks/head");
    },
    getHeader(): Promise<BlockHeader> {
        return node.query("/chains/main/blocks/head/header");
    },
    getHeadHash(): Promise<string> {
        return node.query("/chains/main/blocks/head/hash");
    },
    getBallotList(): Promise<any> {
        return node.query("/chains/main/blocks/head/votes/ballot_list");
    },
    getProposals(): Promise<any> {
        return node.query("/chains/main/blocks/head/votes/proposals");
    },
    getBallots(): Promise<any> {
        return node.query("/chains/main/blocks/head/votes/ballots");
    },
    getListings(): Promise<any> {
        return node.query("/chains/main/blocks/head/votes/listings");
    },
    getCurrentProposal(): Promise<any> {
        return node.query("/chains/main/blocks/head/votes/current_proposal");
    },
    getCurrentPeriod(): Promise<any> {
        return node.query("/chains/main/blocks/head/votes/current_period_kind");
    },
    getCurrentQuorum(): Promise<any> {
        return node.query("/chains/main/blocks/head/votes/current_quorum");
    },

    awaitOperation(hash: string, interval: number, timeout: number): any {
        if (typeof interval === "undefined")
            interval = 30;
        if (typeof timeout === "undefined")
            timeout = 180;
        if (timeout <= 0) throw "Timeout must be more than 0";
        if (interval <= 0) throw "Interval must be more than 0";
        const at = Math.ceil(timeout / interval) + 1;
        let c = 0;
        let found = false;
        return new Promise((resolve, reject) => {
            const repeater = () => {
                this.getHead().then((h) => {
                    c++;
                    outer: for (let i = 3, found = false; i >= 0; i--) {
                        for (let j = 0; j < h.operations[i].length; j++) {
                            if (h.operations[i][j].hash === hash) {
                                found = true;
                                break outer;
                            }
                        }
                    }
                    if (found) resolve(h.hash);
                    else {
                        if (c >= at) {
                            reject("Timeout");
                        } else {
                            setTimeout(repeater, interval);
                        }
                    }
                });
            };
            repeater();
        });
    },
    async prepareOperation(from: string, operation: Operation, keys: KeyPair | boolean, newAccount?: boolean, manager?: string) {
        if (typeof keys == "undefined") keys = false;
        let counter, opOb;
        const promises = [];
        let requiresReveal = false;
        promises.push(node.query("/chains/main/blocks/head/header"));
        const ops = Array.isArray(operation) ? operation : [operation];
        for (let i = 0; i < ops.length; i++) {
            if (
                ["transaction", "origination", "delegation"].indexOf(ops[i].kind) >= 0
            ) {
                requiresReveal = true;
                if (!newAccount || operation.kind === "transaction") {
                    promises.push(this.getCounter(from));
                    promises.push(this.getManager(from));
                } else {
                    promises.push(new Promise((resolve, reject) => resolve(0)));
                    promises.push(new Promise((resolve, reject) => resolve({})));
                }
                break;
            }
        }
        const f = await Promise.all(promises);
        const head = f[0];
        if (requiresReveal && keys && typeof f[2].key == "undefined") {
            ops.unshift({
                kind: "reveal",
                fee: node.isZeronet ? "100000" : "1269",
                public_key: keys.pk,
                source: from,
                gas_limit: 10000,
                storage_limit: 0
            });
        }
        counter = parseInt(f[1]) + 1;
        if (typeof counters[from] == "undefined")
            counters[from] = counter;
        if (counter > counters[from])
            counters[from] = counter;
        //fix reset bug temp
        counters[from] = counter;
        for (let i_1 = 0; i_1 < ops.length; i_1++) {
            if ([
                "proposals",
                "ballot",
                "transaction",
                "origination",
                "delegation"
            ].indexOf(ops[i_1].kind) >= 0) {
                if (typeof ops[i_1].source == "undefined")
                    ops[i_1].source = from;
            }
            if (["reveal", "transaction", "origination", "delegation"].indexOf(ops[i_1].kind) >= 0) {
                if (typeof ops[i_1].gas_limit == "undefined")
                    ops[i_1].gas_limit = "0";
                if (typeof ops[i_1].storage_limit == "undefined")
                    ops[i_1].storage_limit = "0";
                let newCounter = counters[from] + 1;
                if (newAccount && ops[0].kind === "transaction") {
                    ops[i_1].counter = newCounter;
                    // counters[from]++;
                } else {
                    ops[i_1].counter = counters[from]++;
                }
                ops[i_1].fee = ops[i_1].fee.toString();
                ops[i_1].gas_limit = ops[i_1].gas_limit.toString();
                ops[i_1].storage_limit = ops[i_1].storage_limit.toString();
                ops[i_1].counter = ops[i_1].counter.toString();
            }
        }
        opOb = {
            branch: head.hash,
            contents: ops
        };
        return tezos.forge(head, opOb);
    },
    async simulateOperation(from: string, operation: Operation, keys: KeyPair | boolean) {
        const fullOp = await this.prepareOperation(from, operation, keys);
        return node.query("/chains/main/blocks/head/helpers/scripts/run_operation", fullOp.opOb);
    },
    async sendOperation(
        from: string,
        operation: Operation,
        keys: KeyPair | boolean,
        skipPrevalidation?: boolean,
        newAccount?: boolean,
        manager?: string
    ) {
        if (typeof skipPrevalidation == "undefined")
            skipPrevalidation = false;
        const fullOp = await this
            .prepareOperation(from, operation, keys, newAccount, manager);
        if (keys.sk === false) {
            return fullOp;
        } else {
            if (!keys) {
                fullOp.opbytes +=
                    "00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
                fullOp.opOb.signature =
                    "edsigtXomBKi5CTRf5cjATJWSyaRvhfYNHqSUGrn4SdbYRcGwQrUGjzEfQDTuqHhuA8b2d8NarZjz8TRf65WkpQmo423BtomS8Q";
            } else {
                const signed = crypto.sign(fullOp.opbytes, keys.sk, watermark.generic);
                fullOp.opbytes = signed.sbytes;
                fullOp.opOb.signature = signed.edsig;
            }
            console.log(fullOp);
            if (skipPrevalidation)
                return this.silentInject(fullOp.opbytes);
            else
                return this.inject(fullOp.opOb, fullOp.opbytes);
        }
    },
    inject(opOb: any, sopbytes) {
        const opResponse = [];
        let errors = [];
        return node
            .query("/chains/main/blocks/head/helpers/preapply/operations", [opOb])
            .then(function (f) {
                if (!Array.isArray(f)) throw {error: "RPC Fail", errors: []};
                for (let i = 0; i < f.length; i++) {
                    for (let j = 0; j < f[i].contents.length; j++) {
                        opResponse.push(f[i].contents[j]);
                        if (
                            typeof f[i].contents[j].metadata.operation_result !=
                            "undefined" &&
                            f[i].contents[j].metadata.operation_result.status === "failed"
                        )
                            errors = errors.concat(
                                f[i].contents[j].metadata.operation_result.errors
                            );
                    }
                }
                if (errors.length)
                    throw {error: "ForgeOperation Failed", errors: errors};
                return node.query("/injection/operation", sopbytes);
            })
            .then(function (f) {
                return {
                    hash: f,
                    operations: opResponse
                };
            });
    },
    silentInject(sopbytes) {
        return node.query("/injection/operation", sopbytes).then(function (f) {
            return {
                hash: f
            };
        });
    },

    account(
        keys: KeyPair,
        amount: string,
        spendable: boolean,
        delegatable: boolean,
        delegate: string,
        fee: string,
        gasLimit: string,
        storageLimit: string
    ) {
        if (typeof gasLimit == "undefined") gasLimit = "10000";
        if (typeof storageLimit == "undefined") storageLimit = "257";
        const operation: Operation = {
            kind: "origination",
            balance: utility.mutez(amount).toString(),
            fee: fee.toString(),
            gas_limit: gasLimit,
            storage_limit: storageLimit
        };
        if (node.isZeronet)
            operation["manager_pubkey"] = keys.pkh;
        else
            operation["managerPubkey"] = keys.pkh;

        if (typeof spendable != "undefined")
            operation.spendable = spendable;

        if (typeof delegatable != "undefined")
            operation.delegatable = delegatable;

        if (typeof delegate != "undefined" && delegate)
            operation.delegate = delegate;

        return this.sendOperation(keys.pkh, operation, keys, false, false);
    },
    transfer(
        from: string,
        keys: KeyPair,
        to: string,
        amount: string,
        fee: string,
        parameter: string,
        gasLimit: string,
        storageLimit: string,
        newAccount?: boolean
    ) {
        if (typeof gasLimit == "undefined") gasLimit = "10100";
        if (typeof storageLimit == "undefined") storageLimit = "0";
        const operation: Operation = {
            kind: "transaction",
            fee: fee.toString(),
            gas_limit: gasLimit,
            storage_limit: storageLimit,
            amount: amount.toString(),
            destination: to
        };
        if (typeof parameter == "undefined")throw new Error("transfer() received invalid parameter");//sets parameter to boolean???
        if (parameter) {
            operation.parameters = utility.sexp2mic(parameter);
        }
        return this.sendOperation(from, operation, keys, true, newAccount);
    },
    originate(
        keys: KeyPair,
        amount: string,
        code: string,
        init: string,
        spendable: boolean,
        delegatable: boolean,
        delegate: string,
        fee: string,
        gasLimit: string,
        storageLimit: string
    ) {
        if (typeof gasLimit == "undefined") gasLimit = "10000";
        if (typeof storageLimit == "undefined") storageLimit = "257";
        const _code = utility.ml2mic(code),
            script: OperationScript = {
                code: _code,
                storage: utility.sexp2mic(init)
            },
            operation: Operation = {
                kind: "origination",
                balance: utility.mutez(amount).toString(),
                storage_limit: storageLimit,
                gas_limit: gasLimit,
                fee: fee.toString(),
                script: script
            };

        if (node.isZeronet)
            operation["manager_pubkey"] = keys.pkh;
        else
            operation["managerPubkey"] = keys.pkh;

        if (typeof spendable != "undefined")
            operation.spendable = spendable;

        if (typeof delegatable != "undefined")
            operation.delegatable = delegatable;

        if (typeof delegate != "undefined" && delegate)
            operation.delegate = delegate;

        return this.sendOperation(keys.pkh, operation, keys);
    },
    setDelegate(
        from: string,
        keys: KeyPair,
        delegate: string,
        fee: string,
        gasLimit: string,
        storageLimit: string,
        newAccount?: boolean,
        manager?: string
    ) {
        if (typeof gasLimit == "undefined") gasLimit = "10000";
        if (typeof storageLimit == "undefined") storageLimit = "0";
        const operation: Operation = {
            kind: "delegation",
            fee: fee.toString(),
            gas_limit: gasLimit,
            storage_limit: storageLimit
        };
        if (typeof delegate != "undefined" && delegate) {
            operation.delegate = delegate;
        }
        return this.sendOperation(
            from,
            operation,
            keys,
            false,
            newAccount,
            manager
        );
    },
    registerDelegate(keys: KeyPair, fee: string, gasLimit: string, storageLimit: string) {
        if (typeof gasLimit == "undefined") gasLimit = "10000";
        if (typeof storageLimit == "undefined") storageLimit = "0";
        const operation: Operation = {
            kind: "delegation",
            fee: fee.toString(),
            gas_limit: gasLimit,
            storage_limit: storageLimit,
            delegate: keys.pkh
        };
        return this.sendOperation(keys.pkh, operation, keys);
    },

    activate: function (pkh: any, secret: any) {
        const operation: Operation = {
            kind: "activate_account",
            secret: secret
        };
        return this.sendOperation(pkh, operation, false);
    },

    typecheckCode(code: string) {
        const _code = utility.ml2mic(code);
        return node.query(
            "/chains/main/blocks/head/helpers/scripts/typecheck_code",
            {program: _code, gas: "10000"}
        );
    },
    packData(data, type) {
        const check = {
            data: utility.sexp2mic(data),
            type: utility.sexp2mic(type),
            gas: "400000"
        };
        return node.query(
            "/chains/main/blocks/head/helpers/scripts/pack_data",
            check
        );
    },
    typecheckData(data, type) {
        const check: TypeCheckData = {
            data: utility.sexp2mic(data),
            type: utility.sexp2mic(type),
            gas: "400000"
        };
        return node.query(
            "/chains/main/blocks/head/helpers/scripts/typecheck_data",
            check
        );
    },
    runCode(code: string, amount: string, input: string, storage: string, trace: string) {
        const ep = typeof trace != "undefined" && trace ? "trace_code" : "run_code";
        return node.query("/chains/main/blocks/head/helpers/scripts/" + ep, {
            script: utility.ml2mic(code),
            amount: utility.mutez(amount).toString(),
            input: utility.sexp2mic(input),
            storage: utility.sexp2mic(storage)
        });
    }
};
