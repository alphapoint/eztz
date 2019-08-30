/* eslint-disable @typescript-eslint/camelcase */
import { crypto } from './crypto';
import { node } from './node';
import { tezos } from './tezos';
import {
  Block,
  BlockHeader,
  EzTzKeyPair,
  Operation,
  OperationActivateAccount,
  OperationDelegation,
  OperationKind,
  OperationOrigination,
  OperationScript,
  OperationTransaction,
  TypeCheckData
} from './types';
import { utility } from './utility';
import { watermark } from './watermark';

const counters: { [key: string]: number } = {};

function delay(ms: number): Promise<void> {
  return new Promise((resolve): void => {
    setTimeout(resolve, ms);
  });
}

export const rpc = {
  call(e: string, d?: any): Promise<any> {
    return node.query(e, d);
  },
  getBalance(a: string): Promise<string> {
    return node.query(`/chains/main/blocks/head/context/contracts/${a}/balance`);
  },
  getDelegate(a: string): Promise<string | false> {
    return node
      .query(`/chains/main/blocks/head/context/contracts/${a}/delegate`)
      .then(function(r) {
        if (r) return r;
        return false;
      })
      .catch(() => false);
  },
  getManager(a: string): Promise<string> {
    return node.query(`/chains/main/blocks/head/context/contracts/${a}/manager_key`);
  },
  getCounter(a: string): Promise<string> {
    return node.query(`/chains/main/blocks/head/context/contracts/${a}/counter`);
  },
  getBaker(tz1: string): Promise<string> {
    return node.query(`/chains/main/blocks/head/context/delegates/${tz1}`);
  },
  getHead(): Promise<Block> {
    return node.query('/chains/main/blocks/head');
  },
  getBlock(a?: string): Promise<Block> {
    return node.query(`/chains/main/blocks/${a || 'head'}`);
  },
  getHeader(a?: string): Promise<BlockHeader> {
    return node.query(`/chains/main/blocks/${a || 'head'}/header`);
  },
  getHeadHash(): Promise<string> {
    return node.query('/chains/main/blocks/head/hash');
  },
  getBallotList(): Promise<[]> {
    return node.query('/chains/main/blocks/head/votes/ballot_list');
  },
  getProposals(): Promise<[]> {
    return node.query('/chains/main/blocks/head/votes/proposals');
  },
  getBallots(): Promise<[]> {
    return node.query('/chains/main/blocks/head/votes/ballots');
  },
  getListings(): Promise<[]> {
    return node.query('/chains/main/blocks/head/votes/listings');
  },
  getCurrentProposal(): Promise<any> {
    return node.query('/chains/main/blocks/head/votes/current_proposal');
  },
  getCurrentPeriod(): Promise<any> {
    return node.query('/chains/main/blocks/head/votes/current_period_kind');
  },
  getCurrentQuorum(): Promise<any> {
    return node.query('/chains/main/blocks/head/votes/current_quorum');
  },

  async awaitOperation(hash: string, interval = 30, timeout = 180): Promise<string> {
    if (timeout <= 0) throw new Error('Timeout must be more than 0');
    if (interval <= 0) throw Error('Interval must be more than 0');
    const timesMax = Math.ceil(timeout / interval) + 1;
    let times = 0;

    for (;;) {
      const h = await rpc.getHead();
      times++;
      for (let i = 3; i >= 0; i--) {
        for (let j = 0; j < h.operations[i].length; j++) {
          if (h.operations[i][j].hash === hash) {
            return h.hash;
          }
        }
      }
      if (times >= timesMax) {
        throw new Error('Timeout');
      } else {
        await delay(interval);
      }
    }
  },
  async prepareOperation(from: string, operation: Operation, keys?: EzTzKeyPair, newAccount?: boolean, manager?: string) {
    const promises = [];
    let isNewAccount = newAccount;
    let requiresReveal = false;
    promises.push(node.query('/chains/main/blocks/head/header'));
    const ops: Operation[] = Array.isArray(operation) ? operation : [operation];
    for (let i = 0; i < ops.length; i++) {
      const kind = ops[i].kind as OperationKind;
      switch (kind) {
        default:
          break;
        case OperationKind.Transaction:
        case OperationKind.Origination:
        case OperationKind.Delegation:
          requiresReveal = true;
          if (!isNewAccount || operation.kind === 'transaction') isNewAccount = false;
        // fall through
        case OperationKind.Reveal:
          if (!isNewAccount) {
            promises.push(this.getCounter(from));
            promises.push(Promise.resolve(manager) || this.getManager(from));
          } else {
            promises.push(Promise.resolve(0));
            promises.push(Promise.resolve({}));
          }
          break;
      }
    }
    const f = await Promise.all(promises);
    const head = f[0];
    const counter = parseInt(f[1], 10) + 1;
    if (typeof counters[from] === 'undefined') counters[from] = counter;
    if (counter > counters[from]) counters[from] = counter;
    // fix reset bug temp
    counters[from] = counter;
    if (requiresReveal && keys && typeof f[2].key === 'undefined') {
      ops.unshift({
        kind: OperationKind.Reveal,
        fee: node.isZeronet ? '100000' : '1269',
        public_key: keys.pk,
        source: from,
        gas_limit: 10000,
        storage_limit: 0,
        counter
      });
    }
    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];
      switch (op.kind) {
        default:
          break;
        case OperationKind.Proposals:
        case OperationKind.Ballot:
        case OperationKind.Transaction:
        case OperationKind.Origination:
        case OperationKind.Delegation: {
          if (typeof op.source === 'undefined') op.source = from;
        }
      }
      switch (op.kind) {
        default:
          break;
        case OperationKind.Reveal:
        case OperationKind.Transaction:
        case OperationKind.Origination:
        case OperationKind.Delegation: {
          if (typeof op.gas_limit === 'undefined') op.gas_limit = '0';
          if (typeof op.storage_limit === 'undefined') op.storage_limit = '0';
          const newCounter = counters[from] + 1;
          if (newAccount && ops[0].kind === 'transaction') {
            op.counter = newCounter;
            // counters[from]++;
          } else {
            op.counter = counters[from]++;
          }
          op.fee = op.fee !== undefined ? op.fee.toString() : undefined;
          op.gas_limit = op.gas_limit.toString();
          op.storage_limit = op.storage_limit.toString();
          op.counter = op.counter.toString();
        }
      }
    }
    return tezos.forge(head, {
      branch: head.hash,
      contents: ops
    });
  },
  async simulateOperation(from: string, operation: Operation, keys?: EzTzKeyPair): Promise<any> {
    const fullOp = await this.prepareOperation(from, operation, keys);
    return node.query('/chains/main/blocks/head/helpers/scripts/run_operation', fullOp.opOb);
  },
  async sendOperation(
    from: string,
    operation: Operation,
    keys: EzTzKeyPair | boolean | any,
    skipPrevalidation = false,
    newAccount?: boolean,
    manager?: string
  ): Promise<{ hash: string; operations?: Operation[] }> {
    const fullOp = await this.prepareOperation(from, operation, keys, newAccount, manager);
    if (keys.sk === false) {
      if ('hash' in fullOp) return fullOp;
      throw new Error('fullOp is missing hash field');
    }
    if (!keys) {
      fullOp.opbytes += '00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
      fullOp.opOb.signature = 'edsigtXomBKi5CTRf5cjATJWSyaRvhfYNHqSUGrn4SdbYRcGwQrUGjzEfQDTuqHhuA8b2d8NarZjz8TRf65WkpQmo423BtomS8Q';
    } else {
      const signed = await crypto.sign(fullOp.opbytes, keys.sk, watermark.generic);
      fullOp.opbytes = signed.sbytes;
      fullOp.opOb.signature = signed.edsig;
    }
    console.log(fullOp);
    if (skipPrevalidation) return this.silentInject(fullOp.opbytes);
    return this.inject(fullOp.opOb, fullOp.opbytes);
  },
  async inject(opOb: any, sopbytes: any): Promise<{ hash: any; operations: Operation[] }> {
    const opResponse: Operation[] = [];
    let errors: Operation[] = [];
    const f = await node.query('/chains/main/blocks/head/helpers/preapply/operations', [opOb]);
    if (!Array.isArray(f)) throw Object.assign(new Error('RPC Fail'), { errors: [] });
    for (let i = 0; i < f.length; i++) {
      for (let j = 0; j < f[i].contents.length; j++) {
        opResponse.push(f[i].contents[j]);
        if (typeof f[i].contents[j].metadata.operation_result !== 'undefined' && f[i].contents[j].metadata.operation_result.status === 'failed')
          errors = errors.concat(f[i].contents[j].metadata.operation_result.errors);
      }
    }
    if (errors.length) throw Object.assign(new Error('ForgeOperation Failed'), { errors });
    const f_1 = await node.query('/injection/operation', sopbytes);
    return {
      hash: f_1,
      operations: opResponse
    };
  },
  async silentInject(sopbytes: any): Promise<{ hash: any }> {
    const f = await node.query('/injection/operation', sopbytes);
    return {
      hash: f
    };
  },

  reveal(keys: EzTzKeyPair, gasLimit?: string, storageLimit?: string): Promise<any> {
    const operation: Operation = {
      kind: OperationKind.Reveal,
      public_key: keys.pk,
      fee: node.isZeronet ? '100000' : '1269',
      source: keys.pkh,
      gas_limit: gasLimit || '10000',
      storage_limit: storageLimit || '0',
      counter: 0
    };

    return this.sendOperation(keys.pkh, operation, keys, false, false);
  },

  account(keys: EzTzKeyPair, amount: string, spendable: boolean, delegatable: boolean, delegate: string, fee: string, gasLimit?: string, storageLimit?: string): Promise<any> {
    const operation: OperationOrigination = {
      kind: OperationKind.Origination,
      balance: utility.mutez(amount).toString(),
      fee: fee.toString(),
      gas_limit: gasLimit || '10000',
      storage_limit: storageLimit || '257',
      manager_pubkey: keys.pkh,
      spendable: spendable || false,
      delegatable: delegatable || false,
      delegate: delegate || undefined,
      source: keys.pkh,
      counter: 0
    };

    return this.sendOperation(keys.pkh, operation, keys, false, false);
  },
  transfer(
    from: string,
    keys: EzTzKeyPair,
    to: string,
    amount: string,
    fee: string,
    parameter?: string,
    gasLimit?: string,
    storageLimit?: string,
    newAccount?: boolean
  ): Promise<{ hash: string; operations?: Operation[] | [] }> {
    const operation: OperationTransaction = {
      kind: OperationKind.Transaction,
      fee: fee.toString(),
      gas_limit: gasLimit || '10100',
      storage_limit: storageLimit || '0',
      amount: amount.toString(),
      destination: to,
      counter: 0,
      parameters: parameter ? utility.sexp2mic(parameter) : undefined,
      source: from
    };

    return this.sendOperation(from, operation, keys, true, newAccount);
  },
  originate(
    keys: EzTzKeyPair,
    amount: string,
    code: string,
    init: string,
    spendable: boolean,
    delegatable: boolean,
    delegate: string,
    fee: string,
    gasLimit = '10000',
    storageLimit = '257'
  ): Promise<{ hash: string; operations?: Operation[] }> {
    const micCode = utility.ml2mic(code);
    const script: OperationScript = {
      code: micCode,
      storage: utility.sexp2mic(init)
    };
    const operation: OperationOrigination = {
      kind: OperationKind.Origination,
      balance: utility.mutez(amount).toString(),
      storage_limit: storageLimit,
      gas_limit: gasLimit,
      fee: fee.toString(),
      script,
      source: keys.pkh,
      counter: 0,
      spendable: spendable || false,
      delegatable: delegatable || false,
      delegate: delegate || undefined,
      manager_pubkey: keys.pkh
    };

    return this.sendOperation(keys.pkh, operation, keys);
  },
  setDelegate(
    from: string,
    keys: EzTzKeyPair,
    delegate: string,
    fee: string,
    gasLimit = '10000',
    storageLimit = '0',
    newAccount?: boolean,
    manager?: string
  ): Promise<{ hash: string; operations?: Operation[] }> {
    const operation: OperationDelegation = {
      kind: OperationKind.Delegation,
      fee: fee.toString(),
      gas_limit: gasLimit,
      storage_limit: storageLimit,
      delegate: delegate || undefined,
      source: keys.pkh,
      counter: 0
    };
    return this.sendOperation(from, operation, keys, false, newAccount, manager);
  },
  registerDelegate(keys: EzTzKeyPair, fee: string, gasLimit = '10000', storageLimit = '0'): Promise<{ hash: string; operations?: Operation[] }> {
    const operation: Operation = {
      kind: OperationKind.Delegation,
      fee: fee.toString(),
      gas_limit: gasLimit,
      storage_limit: storageLimit,
      delegate: keys.pkh,
      source: keys.pkh,
      counter: 0
    };
    return this.sendOperation(keys.pkh, operation, keys);
  },

  activate(pkh: string, secret: string): Promise<{ hash: string; operations?: Operation[] }> {
    const operation: OperationActivateAccount = {
      kind: OperationKind.ActivateAccount,
      secret,
      pkh
    };
    return this.sendOperation(pkh, operation, false);
  },

  typecheckCode(code: string): Promise<any> {
    const program = utility.ml2mic(code);
    return node.query('/chains/main/blocks/head/helpers/scripts/typecheck_code', {
      program,
      gas: '10000'
    });
  },
  packData(data: string, type: string): Promise<any> {
    const check = {
      data: utility.sexp2mic(data),
      type: utility.sexp2mic(type),
      gas: '400000'
    };
    return node.query('/chains/main/blocks/head/helpers/scripts/pack_data', check);
  },
  typecheckData(data: string, type: string): Promise<any> {
    const check: TypeCheckData = {
      data: utility.sexp2mic(data),
      type: utility.sexp2mic(type),
      gas: '400000'
    };
    return node.query('/chains/main/blocks/head/helpers/scripts/typecheck_data', check);
  },
  runCode(code: string, amount: string, input: string, storage: string, trace: string): Promise<any> {
    const ep = typeof trace !== 'undefined' && trace ? 'trace_code' : 'run_code';
    return node.query(`/chains/main/blocks/head/helpers/scripts/${ep}`, {
      script: utility.ml2mic(code),
      amount: utility.mutez(amount).toString(),
      input: utility.sexp2mic(input),
      storage: utility.sexp2mic(storage)
    });
  }
};
