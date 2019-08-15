import { utility } from './utility';
import { node } from './node';
import { prefix } from './prefix';

export const trezor = {
  source(address: string): Source | any {
    if (address === undefined)
      throw new Error('Source cannot be undefined or empty');
    const tag = address[0] === 't' ? 0 : 1;
    const curve = parseInt(address[2]) - 1;
    const pp = tag === 1 ? prefix.KT : prefix['tz' + (curve + 1)];
    let bytes = utility.b58cdecode(address, pp);
    if (tag === 1) {
      bytes = utility.mergebuf(bytes, [0]);
    } else {
      bytes = utility.mergebuf([curve], bytes);
    }
    return {
      tag: tag,
      hash: bytes
    };
  },
  parameter(address: string, opbytes: string) {
    const tag = address[0] === 't' ? 0 : 1;
    const curve = parseInt(address[2]) - 1;
    const pp = tag === 1 ? prefix.KT : prefix['tz' + (curve + 1)];
    let bytes = utility.b58cdecode(address, pp);
    if (tag === 1) {
      bytes = utility.mergebuf(bytes, [0]);
    } else {
      bytes = utility.mergebuf([curve], bytes);
    }
    const hex = utility.buf2hex(utility.mergebuf([tag], bytes));
    return opbytes.substr(-46) === hex + '00'
      ? false
      : utility.hex2buf(opbytes.substr(opbytes.indexOf(hex) + hex.length + 2));
  },
  operation(d: { opOb: { contents: any[] }; opbytes: string }) {
    const operations = [];
    let revealOp: boolean | Operation | any = false;
    let op: Operation;
    let op2: Operation;
    let p: boolean | Uint8Array;
    for (let i = 0; i < d.opOb.contents.length; i++) {
      op = d.opOb.contents[i];
      if (op.kind === 'reveal') {
        if (revealOp) throw new Error("Can't have 2 reveals");
        if (op.public_key === undefined)
          throw new Error('Missing public key in reveal op.');
        revealOp = {
          source: this.source(op.source),
          // TODO: these parseInt calls are subject to overflow, maybe use native BigInt?
          fee: typeof op.fee === 'string' ? parseInt(op.fee) : op.fee,
          counter:
            typeof op.counter === 'string' ? parseInt(op.counter) : op.counter,
          // TODO: are these field names correct?
          gas_limit:
            typeof op.gas_limit === 'string'
              ? parseInt(op.gas_limit)
              : op.gas_limit,
          storage_limit:
            typeof op.storage_limit === 'string'
              ? parseInt(op.storage_limit)
              : op.storage_limit,
          publicKey: utility.mergebuf(
            [0],
            utility.b58cdecode(op.public_key, prefix.edpk)
          )
        };
      } else {
        if (['origination', 'transaction', 'delegation'].indexOf(op.kind) < 0)
          throw new Error(
            `Operation kind is not origination, transaction, delegation. Operation kind is ${op.kind}`
          );
        op2 = {
          kind: op.kind,
          source: this.source(op.source),
          // TODO: these parseInt calls are subject to overflow, maybe use native BigInt?
          fee: typeof op.fee === 'string' ? parseInt(op.fee) : op.fee,
          counter:
            typeof op.counter === 'string' ? parseInt(op.counter) : op.counter,
          gas_limit:
            typeof op.gas_limit === 'string'
              ? parseInt(op.gas_limit)
              : op.gas_limit,
          storage_limit:
            typeof op.storage_limit === 'string'
              ? parseInt(op.storage_limit)
              : op.storage_limit
        };
        switch (op.kind) {
          case 'transaction':
            // TODO: these parseInt calls are subject to overflow, maybe use native BigInt?
            op2.amount =
              typeof op.amount === 'string' ? parseInt(op.amount) : op.amount;
            if (op.destination !== undefined)
              op2.destination = this.source(op.destination);
            if ((p = this.parameter(op.destination, d.opbytes)))
              op2.parameters = p;
            break;
          case 'origination':
            op2.manager_pubkey = this.source(op.manager_pubkey).hash;
            // TODO: these parseInt calls are subject to overflow, maybe use native BigInt?
            op2.balance =
              typeof op.balance === 'string'
                ? parseInt(op.balance)
                : op.balance;
            op2.spendable = op.spendable;
            op2.delegatable = op.delegatable;
            if (typeof op.delegate != 'undefined') {
              op2.delegate = this.source(op.delegate).hash;
            }
            //Script not supported yet...
            break;
          case 'delegation':
            if (typeof op.delegate != 'undefined') {
              op2.delegate = this.source(op.delegate).hash;
            }
            break;
        }
        operations.push(op2);
      }
    }

    if (operations.length > 1) throw new Error('Too many operations');

    const operation = operations[0];
    return [operation, revealOp];
  }
};
