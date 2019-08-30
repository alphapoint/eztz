// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
import sodium from 'libsodium-wrappers';
import { node } from './node';
import { rpc } from './rpc';
import { EzTzKeyPair, OperationParameter } from './types';
import { utility } from './utility';

export const contract = {
  oldHash(operationHash: string, ind: number): string {
    const ob = utility.b58cdecode(operationHash, 'o');
    let tt = [];
    let i = 0;
    for (; i < ob.length; i++) {
      tt.push(ob[i]);
    }
    tt = tt.concat([(ind & 0xff000000) >> 24, (ind & 0x00ff0000) >> 16, (ind & 0x0000ff00) >> 8, ind & 0x000000ff]);
    return utility.b58cencode(sodium.crypto_generichash(20, new Uint8Array(tt)), 'KT');
  },
  hash(operationHash: string, ind: number): string {
    const opHashBytes = utility.b58cdecode(operationHash, 'o');
    const tt = new Uint8Array(opHashBytes.length + 4);

    tt.set(opHashBytes, 0);

    const dv = new DataView(tt.buffer, tt.byteOffset, tt.byteLength);
    dv.setUint32(opHashBytes.length, ind, false);

    return utility.b58cencode(sodium.crypto_generichash(20, new Uint8Array(tt)), 'KT');
  },
  originate(keys: EzTzKeyPair, amount: string, code: any, init: string, spendable: boolean, delegatable: boolean, delegate: string, fee: string, gasLimit = '10000', storageLimit = '10000') {
    return rpc.originate(keys, amount, code, init, spendable, delegatable, delegate, fee, gasLimit, storageLimit);
  },
  send(contractAddr: string, from: string, keys: EzTzKeyPair, amount: string, parameter: string, fee: string, gasLimit = '2000', storageLimit = '0') {
    return rpc.transfer(from, keys, contractAddr, amount, fee, parameter, gasLimit, storageLimit);
  },
  balance(contractAddr: string) {
    return rpc.getBalance(contractAddr);
  },
  storage(contractAddr: string): Promise<OperationParameter> {
    return node.query(`/chains/main/blocks/head/context/contracts/${contractAddr}/storage`);
  },
  load(contractAddr: string) {
    return node.query(`/chains/main/blocks/head/context/contracts/${contractAddr}`);
  },
  watch(cc: string, interval: number, cb: any) {
    let storage: OperationParameter[] | OperationParameter = [];
    const ct = () => {
      this.storage(cc).then(r => {
        if (JSON.stringify(storage) !== JSON.stringify(r)) {
          storage = r;
          cb(storage);
        }
      });
    };
    ct();
    return setInterval(ct, interval * 1000);
  }
};
