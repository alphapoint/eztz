import watermark from "./watermark"
import node from "./node"
import {sexp2mic, mutez, ml2mic} from "./Utility"

const counters = {};
const rpc = {
    call: function(e, d) {
      return node.query(e, d);
    },
    getBalance: function(a) {
      return node
        .query("/chains/main/blocks/head/context/contracts/" + a + "/balance")
        .then(function(r) {
          return r;
        });
    },
    getDelegate: function(a) {
      return node
        .query("/chains/main/blocks/head/context/contracts/" + a + "/delegate")
        .then(function(r) {
          if (r) return r;
          return false;
        })
        .catch(function() {
          return false;
        });
    },
    getManager: function(a) {
      return node.query(
        "/chains/main/blocks/head/context/contracts/" + a + "/manager_key"
      );
    },
    getCounter: function(a) {
      return node.query(
        "/chains/main/blocks/head/context/contracts/" + a + "/counter"
      );
    },
    getBaker: function(tz1) {
      return node.query("/chains/main/blocks/head/context/delegates/" + tz1);
    },
    getHead: function() {
      return node.query("/chains/main/blocks/head");
    },
    getHeader: function() {
      return node.query("/chains/main/blocks/head/header");
    },
    getHeadHash: function() {
      return node.query("/chains/main/blocks/head/hash");
    },

    getBallotList: function() {
      return node.query("/chains/main/blocks/head/votes/ballot_list");
    },
    getProposals: function() {
      return node.query("/chains/main/blocks/head/votes/proposals ");
    },
    getBallots: function() {
      return node.query("/chains/main/blocks/head/votes/ballots ");
    },
    getListings: function() {
      return node.query("/chains/main/blocks/head/votes/listings ");
    },
    getCurrentProposal: function() {
      return node.query("/chains/main/blocks/head/votes/current_proposal ");
    },
    getCurrentPeriod: function() {
      return node.query("/chains/main/blocks/head/votes/current_period_kind ");
    },
    getCurrentQuorum: function() {
      return node.query("/chains/main/blocks/head/votes/current_quorum ");
    },

    awaitOperation: function(hash, interval, timeout) {
      if (typeof interval == "undefined") "30";
      if (typeof timeout == "undefined") "180";
      if (timeout <= 0) throw "Timeout must be more than 0";
      if (interval <= 0) throw "Interval must be more than 0";
      var at = Math.ceil(timeout / interval) + 1,
        c = 0;
      return new Promise(function(resolve, reject) {
        var repeater = function() {
          rpc.getHead().then(function(h) {
            c++;
            outer: for (var i = 3, found = false; i >= 0; i--) {
              for (var j = 0; j < h.operations[i].length; j++) {
                if (h.operations[i][j].hash == hash) {
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
    prepareOperation: async function(from, operation, keys, newAccount, manager) {
      if (typeof keys == "undefined") keys = false;
      var counter, opOb;
      var promises = [],
        requiresReveal = false;
      promises.push(node.query("/chains/main/blocks/head/header"));
      if (Array.isArray(operation)) {
        ops = operation;
      } else {
        ops = [operation];
      }
      for (let i = 0; i < ops.length; i++) {
        if (
          ["transaction", "origination", "delegation"].indexOf(ops[i].kind) >= 0
        ) {
          requiresReveal = true;
          if (!newAccount || operation.kind == "transaction") {
            promises.push(rpc.getCounter(from));
            promises.push(rpc.getManager(from));
          } else {
            promises.push(new Promise((resolve, reject) => resolve(0)));
            promises.push(new Promise((resolve, reject) => resolve({})));
          }
          break;
        }
      }
      const f = await Promise.all(promises);
        head = f[0];
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
                if (newAccount && ops[0].kind == "transaction") {
                    ops[i_1].counter = newCounter;
                    // counters[from]++;
                }
                else {
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
    simulateOperation: async function(from, operation, keys) {
      const fullOp = await rpc.prepareOperation(from, operation, keys);
        return node.query("/chains/main/blocks/head/helpers/scripts/run_operation", fullOp.opOb);
    },
    sendOperation: async function(
      from,
      operation,
      keys,
      skipPrevalidation,
      newAccount,
      manager
    ) {
      if (typeof skipPrevalidation == "undefined") skipPrevalidation = false;
      const fullOp = await rpc
            .prepareOperation(from, operation, keys, newAccount, manager);
        if (keys.sk === false) {
            return fullOp;
        }
        else {
            if (!keys) {
                fullOp.opbytes +=
                    "00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
                fullOp.opOb.signature =
                    "edsigtXomBKi5CTRf5cjATJWSyaRvhfYNHqSUGrn4SdbYRcGwQrUGjzEfQDTuqHhuA8b2d8NarZjz8TRf65WkpQmo423BtomS8Q";
            }
            else {
                var signed = crypto.sign(fullOp.opbytes, keys.sk, watermark.generic);
                fullOp.opbytes = signed.sbytes;
                fullOp.opOb.signature = signed.edsig;
            }
            console.log(fullOp);
            if (skipPrevalidation)
                return rpc.silentInject(fullOp.opbytes);
            else
                return rpc.inject(fullOp.opOb, fullOp.opbytes);
        }
    },
    inject: function(opOb, sopbytes) {
      var opResponse = [],
        errors = [];
      return node
        .query("/chains/main/blocks/head/helpers/preapply/operations", [opOb])
        .then(function(f) {
          if (!Array.isArray(f)) throw { error: "RPC Fail", errors: [] };
          for (var i = 0; i < f.length; i++) {
            for (var j = 0; j < f[i].contents.length; j++) {
              opResponse.push(f[i].contents[j]);
              if (
                typeof f[i].contents[j].metadata.operation_result !=
                  "undefined" &&
                f[i].contents[j].metadata.operation_result.status == "failed"
              )
                errors = errors.concat(
                  f[i].contents[j].metadata.operation_result.errors
                );
            }
          }
          if (errors.length)
            throw { error: "Operation Failed", errors: errors };
          return node.query("/injection/operation", sopbytes);
        })
        .then(function(f) {
          return {
            hash: f,
            operations: opResponse
          };
        });
    },
    silentInject: function(sopbytes) {
      return node.query("/injection/operation", sopbytes).then(function(f) {
        return {
          hash: f
        };
      });
    },

    account: function(
      keys,
      amount,
      spendable,
      delegatable,
      delegate,
      fee,
      gasLimit,
      storageLimit
    ) {
      if (typeof gasLimit == "undefined") gasLimit = "10000";
      if (typeof storageLimit == "undefined") storageLimit = "257";
      const operation = {
        kind: "origination",
        balance: mutez(amount).toString(),
        fee: fee.toString(),
        gas_limit: gasLimit,
        storage_limit: storageLimit
      };
      if (node.isZeronet) operation["manager_pubkey"] = keys.pkh;
      else operation["managerPubkey"] = keys.pkh;
      if (typeof spendable != "undefined") operation.spendable = spendable;
      if (typeof delegatable != "undefined")
        operation.delegatable = delegatable;
      if (typeof delegate != "undefined" && delegate)
        operation.delegate = delegate;
      return rpc.sendOperation(keys.pkh, operation, keys, false, false);
    },
    transfer: function(
      from,
      keys,
      to,
      amount,
      fee,
      parameter,
      gasLimit,
      storageLimit,
      newAccount
    ) {
      if (typeof gasLimit == "undefined") gasLimit = "10100";
      if (typeof storageLimit == "undefined") storageLimit = "0";
      var operation = {
        kind: "transaction",
        fee: fee.toString(),
        gas_limit: gasLimit,
        storage_limit: storageLimit,
        amount: amount.toString(),
        destination: to
      };
      if (typeof parameter == "undefined") parameter = false;
      if (parameter) {
        operation.parameters = sexp2mic(parameter);
      }
      return rpc.sendOperation(from, operation, keys, true, newAccount);
    },
    originate: function(
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
    ) {
      if (typeof gasLimit == "undefined") gasLimit = "10000";
      if (typeof storageLimit == "undefined") storageLimit = "257";
      var _code = ml2mic(code),
        script = {
          code: _code,
          storage: sexp2mic(init)
        },
        operation = {
          kind: "origination",
          balance: mutez(amount).toString(),
          storage_limit: storageLimit,
          gas_limit: gasLimit,
          fee: fee.toString(),
          script: script
        };
      if (node.isZeronet) operation["manager_pubkey"] = keys.pkh;
      else operation["managerPubkey"] = keys.pkh;
      if (typeof spendable != "undefined") operation.spendable = spendable;
      if (typeof delegatable != "undefined")
        operation.delegatable = delegatable;
      if (typeof delegate != "undefined" && delegate)
        operation.delegate = delegate;
      return rpc.sendOperation(keys.pkh, operation, keys);
    },
    setDelegate(
      from,
      keys,
      delegate,
      fee,
      gasLimit,
      storageLimit,
      newAccount,
      manager
    ) {
      if (typeof gasLimit == "undefined") gasLimit = "10000";
      if (typeof storageLimit == "undefined") storageLimit = "0";
      var operation = {
        kind: "delegation",
        fee: fee.toString(),
        gas_limit: gasLimit,
        storage_limit: storageLimit
      };
      if (typeof delegate != "undefined" && delegate) {
        operation.delegate = delegate;
      }
      return rpc.sendOperation(
        from,
        operation,
        keys,
        false,
        newAccount,
        manager
      );
    },
    registerDelegate(keys, fee, gasLimit, storageLimit) {
      if (typeof gasLimit == "undefined") gasLimit = "10000";
      if (typeof storageLimit == "undefined") storageLimit = "0";
      var operation = {
        kind: "delegation",
        fee: fee.toString(),
        gas_limit: gasLimit,
        storage_limit: storageLimit,
        delegate: keys.pkh
      };
      return rpc.sendOperation(keys.pkh, operation, keys);
    },

    activate: function(pkh, secret) {
      var operation = {
        kind: "activate_account",
        pkh: pkh,
        secret: secret
      };
      return rpc.sendOperation(pkh, operation, false);
    },

    typecheckCode(code) {
      var _code = ml2mic(code);
      return node.query(
        "/chains/main/blocks/head/helpers/scripts/typecheck_code",
        { program: _code, gas: "10000" }
      );
    },
    packData(data, type) {
      var check = {
        data: sexp2mic(data),
        type: sexp2mic(type),
        gas: "400000"
      };
      return node.query(
        "/chains/main/blocks/head/helpers/scripts/pack_data",
        check
      );
    },
    typecheckData(data, type) {
      var check = {
        data: sexp2mic(data),
        type: sexp2mic(type),
        gas: "400000"
      };
      return node.query(
        "/chains/main/blocks/head/helpers/scripts/typecheck_data",
        check
      );
    },
    runCode(code, amount, input, storage, trace) {
      var ep = typeof trace != "undefined" && trace ? "trace_code" : "run_code";
      return node.query("/chains/main/blocks/head/helpers/scripts/" + ep, {
        script: ml2mic(code),
        amount: mutez(amount).toString(),
        input: sexp2mic(input),
        storage: sexp2mic(storage)
      });
    }
  }

  export default rpc