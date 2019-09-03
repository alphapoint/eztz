import { forgeOp } from './forgeOp';
import { node } from './node';
import { Block, BlockOperationBase } from './types';
import { utility } from './utility';

export const tezos = {
  async forge(head: Block, opOb: BlockOperationBase): Promise<{ opbytes: string; opOb: BlockOperationBase }> {
    const remoteForgedBytes = await node.query(`/chains/${head.chain_id}/blocks/${head.hash}/helpers/forge/operations`, opOb, undefined);
    let localForgedBytes = utility.buf2hex(utility.b58cdecode(opOb.branch, 'B'));
    for (let i = 0; i < opOb.contents.length; i++) {
      localForgedBytes += forgeOp(opOb.contents[i]);
    }
    // eslint-disable-next-line no-param-reassign
    opOb.protocol = head.protocol;
    if (localForgedBytes === remoteForgedBytes)
      return {
        opbytes: localForgedBytes,
        opOb
      };
    throw new Error("Forge validation error - local and remote bytes don't match");
  }
};
