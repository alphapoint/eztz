import sodium from "libsodium-wrappers"
import rpc from "./rpc";
import prefix from "./prefix";
import utility from "./Utility";
import node from "./node"

const { b58cdecode} = utility;

const contract = {
    hash: function(operationHash, ind) {
      var ob = b58cdecode(operationHash, prefix.o),
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
      return b58cencode(
        sodium.crypto_generichash(20, new Uint8Array(tt)),
        prefix.KT
      );
    },
    originate: function( keys, amount, code, init, spendable, delegatable, delegate, fee, gasLimit,storageLimit) 
    {
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
    send: function(contract, from, keys, amount, parameter, fee, gasLimit, storageLimit) 
    {
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
    balance: function(contract) {
      return rpc.getBalance(contract);
    },
    storage: function(contract) {
      return new Promise(function(resolve, reject) {
        node
          .query(
            "/chains/main/blocks/head/context/contracts/" +
              contract +
              "/storage"
          )
          .then(function(r) {
            resolve(r);
          })
          .catch(function(e) {
            reject(e);
          });
      });
    },
    load: function(contract) {
      return node.query(
        "/chains/main/blocks/head/context/contracts/" + contract
      );
    },
    watch: function(cc, timeout, cb) {
      let storage = [];
      const ct = function() {
        contract.storage(cc).then(function(r) {
          if (JSON.stringify(storage) != JSON.stringify(r)) {
            storage = r;
            cb(storage);
          }
        });
      };
      ct();
      return setInterval(ct, timeout * 1000);
    }
}

module.exports = contract