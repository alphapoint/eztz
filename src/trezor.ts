import { Operation, OperationKind, Source } from './types';
import { utility } from './utility';

export const trezor = {
  decompose(address: string): { tag: 0 | 1; bytes: Uint8Array } {
    const tag = address.charAt(0) === 't' ? 0 : 1;
    const curve = parseInt(address.charAt(2), 10) as 1 | 2 | 3;
    const pp = tag === 1 ? 'KT' : (`tz${curve}` as 'tz1' | 'tz2' | 'tz3');
    let bytes = utility.b58cdecode(address, pp);
    if (tag === 1) {
      bytes = utility.mergebuf(bytes, [0]);
    } else {
      bytes = utility.mergebuf([curve - 1], bytes);
    }
    return { tag, bytes };
  },
  source(address: string): Source {
    if (address === undefined) throw new Error('Source cannot be undefined or empty');
    const { tag, bytes } = this.decompose(address);
    return {
      tag,
      hash: bytes
    };
  },
  parameter(address: string, opbytes: string): false | Uint8Array {
    const { tag, bytes } = this.decompose(address);
    const hex = utility.buf2hex(utility.mergebuf([tag], bytes));
    return opbytes.substr(-46) === `${hex}00` ? false : utility.hex2buf(opbytes.substr(opbytes.indexOf(hex) + hex.length + 2));
  },
  operation(d: { opOb: { contents: Operation[] }; opbytes: string }) {
    const operations = [];
    let op: Operation;
    let revealOp: any | undefined;
    let op2: any | undefined;
    let p: boolean | Uint8Array;
    for (let i = 0; i < d.opOb.contents.length; i++) {
      op = d.opOb.contents[i];
      switch (op.kind) {
        default:
          throw new Error(`Operation kind is not reveal, origination, transaction, delegation, but ${op.kind}`);
        case OperationKind.Reveal: {
          if (revealOp) throw new Error("Can't have 2 reveals");
          if (op.public_key === undefined) throw new Error('Missing public key in reveal op.');
          revealOp = {
            source: this.source(op.source),
            // TODO: these parseInt calls are subject to overflow, maybe use native BigInt?
            fee: typeof op.fee === 'string' ? parseInt(op.fee, 10) : op.fee,
            counter: typeof op.counter === 'string' ? parseInt(op.counter, 10) : op.counter,
            // TODO: are these field names correct?
            // eslint-disable-next-line @typescript-eslint/camelcase
            gas_limit: typeof op.gas_limit === 'string' ? parseInt(op.gas_limit, 10) : op.gas_limit,
            // eslint-disable-next-line @typescript-eslint/camelcase
            storage_limit: typeof op.storage_limit === 'string' ? parseInt(op.storage_limit, 10) : op.storage_limit,
            publicKey: utility.mergebuf([0], utility.b58cdecode(op.public_key, 'edpk'))
          };
          break;
        }
        case OperationKind.Origination:
        case OperationKind.Transaction:
        case OperationKind.Delegation: {
          if (['origination', 'transaction', 'delegation'].indexOf(op.kind) < 0) throw new Error(`Operation kind is not origination, transaction, delegation. Operation kind is ${op.kind}`);
          op2 = {
            kind: op.kind,
            source: this.source(op.source),
            // TODO: these parseInt calls are subject to overflow, maybe use native BigInt?
            fee: typeof op.fee === 'string' ? parseInt(op.fee, 10) : op.fee,
            counter: typeof op.counter === 'string' ? parseInt(op.counter, 10) : op.counter,
            // eslint-disable-next-line @typescript-eslint/camelcase
            gas_limit: typeof op.gas_limit === 'string' ? parseInt(op.gas_limit, 10) : op.gas_limit,
            // eslint-disable-next-line @typescript-eslint/camelcase
            storage_limit: typeof op.storage_limit === 'string' ? parseInt(op.storage_limit, 10) : op.storage_limit
          };
          switch (op.kind) {
            default:
              throw new Error(`Operation kind is not reveal, origination, transaction, delegation, but ${(op as { kind?: string }).kind}`);
            case OperationKind.Transaction:
              // TODO: these parseInt calls are subject to overflow, maybe use native BigInt?
              op2.amount = typeof op.amount === 'string' ? parseInt(op.amount, 10) : op.amount;
              if (op.destination !== undefined) op2.destination = this.source(op.destination);
              p = this.parameter(op.destination, d.opbytes);
              if (p) op2.parameters = p;
              break;
            case OperationKind.Origination:
              // eslint-disable-next-line @typescript-eslint/camelcase
              op2.manager_pubkey = this.source(op.manager_pubkey).hash;
              // TODO: these parseInt calls are subject to overflow, maybe use native BigInt?
              op2.balance = typeof op.balance === 'string' ? BigInt(op.balance) : op.balance;
              op2.spendable = op.spendable;
              op2.delegatable = op.delegatable;
              if (typeof op.delegate !== 'undefined') op2.delegate = this.source(op.delegate).hash;
              // Script not supported yet...
              break;
            case OperationKind.Delegation:
              if (typeof op.delegate !== 'undefined') op2.delegate = this.source(op.delegate).hash;
              break;
          }
          operations.push(op2);
          break;
        }
      }
    }

    if (operations.length > 1) throw new Error('Too many operations');

    const operation = operations[0];
    return [operation, revealOp];
  }
};
