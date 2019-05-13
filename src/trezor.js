import { b58cdecode, mergebuf, buf2hex, hex2buf } from "./Utility";

const trezor = {
    source: function(address) {
      var tag = address[0] == "t" ? 0 : 1;
      var curve = parseInt(address[2]) - 1;
      var pp = tag == 1 ? prefix.KT : prefix["tz" + (curve + 1)];
      var bytes = b58cdecode(address, pp);
      if (tag == 1) {
        bytes = mergebuf(bytes, [0]);
      } else {
        bytes = mergebuf([curve], bytes);
      }
      return {
        tag: tag,
        hash: bytes
      };
    },
    parameter: function(address, opbytes) {
      var tag = address[0] == "t" ? 0 : 1;
      var curve = parseInt(address[2]) - 1;
      var pp = tag == 1 ? prefix.KT : prefix["tz" + (curve + 1)];
      var bytes = b58cdecode(address, pp);
      if (tag == 1) {
        bytes = mergebuf(bytes, [0]);
      } else {
        bytes = mergebuf([curve], bytes);
      }
      hex = buf2hex(mergebuf([tag], bytes));
      return opbytes.substr(-46) == hex + "00"
        ? false
        : hex2buf(
            opbytes.substr(opbytes.indexOf(hex) + hex.length + 2)
          );
    },
    operation: function(d) {
      var operations = [];
      var revealOp = false;
      var op;
      for (var i = 0; i < d.opOb.contents.length; i++) {
        op = d.opOb.contents[i];
        if (op.kind == "reveal") {
          if (revealOp) throw "Can't have 2 reveals";
          revealOp = {
            source: trezor.source(op.source),
            fee: parseInt(op.fee),
            counter: parseInt(op.counter),
            gasLimit: parseInt(op.gas_limit),
            storageLimit: parseInt(op.storage_limit),
            publicKey: mergebuf(
              [0],
              b58cdecode(op.public_key, prefix.edpk)
            )
          };
        } else {
          if (["origination", "transaction", "delegation"].indexOf(op.kind) < 0)
            return console.log("err2");
          op2 = {
            type: op.kind,
            source: trezor.source(op.source),
            fee: parseInt(op.fee),
            counter: parseInt(op.counter),
            gasLimit: parseInt(op.gas_limit),
            storageLimit: parseInt(op.storage_limit)
          };
          switch (op.kind) {
            case "transaction":
              op2.amount = parseInt(op.amount);
              op2.destination = trezor.source(op.destination);
              if ((p = trezor.parameter(op.destination, d.opbytes)))
                op2.parameters = p;
              break;
            case "origination":
              if (node.isZeronet)
                op2.manager_pubkey = trezor.source(op.manager_pubkey).hash;
              else op2.managerPubkey = trezor.source(op.managerPubkey).hash;
              op2.balance = parseInt(op.balance);
              op2.spendable = op.spendable;
              op2.delegatable = op.delegatable;
              if (typeof op.delegate != "undefined") {
                op2.delegate = trezor.source(op.delegate).hash;
              }
              //Script not supported yet...
              break;
            case "delegation":
              if (typeof op.delegate != "undefined") {
                op2.delegate = trezor.source(op.delegate).hash;
              }
              break;
          }
          operations.push(op2);
        }
      }
      if (operations.length > 1) return console.log("Too many operations");
      var operation = operations[0];
      var tx = {};
      return [operation, revealOp];
    }
  }

  export default trezor