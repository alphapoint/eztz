import { forgeAddress, forgeBool, forgeParameters, forgePublicKey, forgePublicKeyHash, forgeScript, forgeZarith } from './forgeOpFuncs';
// eslint-disable-next-line import/named

import { utility } from './utility';

// Forge functions
/* eslint-disable @typescript-eslint/camelcase */
// noinspection PointlessArithmeticExpressionJS
export const forgeOpTags: { [K in OperationKind]: number } = {
  endorsement: 0,
  seed_nonce_revelation: 1,
  double_endorsement_evidence: 2,
  double_baking_evidence: 3,
  activate_account: 4,
  proposals: 5,
  ballot: 6,
  // not sure how these tags match
  reveal: 7 + 0,
  transaction: 7 + 1,
  origination: 7 + 2,
  delegation: 7 + 3
};

/* eslint-enable @typescript-eslint/camelcase */

function forgeOp(op: Operation): string {
  const opKind = forgeOpTags[op.kind];
  let fop = utility.buf2hex(new Uint8Array([opKind]));
  switch (op.kind) {
    case OperationKind.Endorsement:
      fop += utility.buf2hex(utility.toBytesInt32(op.level));
      break;
    case OperationKind.SeedNonceRevelation:
      fop += utility.buf2hex(utility.toBytesInt32(op.level));
      fop += op.nonce;
      break;
    case OperationKind.DoubleEndorsementEvidence:
      break;
    case OperationKind.DoubleBakingEvidence:
      break;
    /*
    throw new Error('Double bake and double endorse forging is not complete');
     */
    case OperationKind.ActivateAccount:
      fop += utility.buf2hex(utility.b58cdecode(op.pkh, 'tz1'));
      fop += op.secret;
      break;
    case OperationKind.Proposals:
      throw new Error('Proposal forging is not complete');
    case OperationKind.Ballot:
      fop += forgePublicKeyHash(op.source);
      fop += utility.buf2hex(utility.toBytesInt32(op.period));
      fop += utility.buf2hex(utility.b58cdecode(op.proposal, 'P'));
      fop += op.ballot === 'yay' ? '00' : op.ballot === 'nay' ? '01' : '02';
      break;
    case OperationKind.Reveal:
    case OperationKind.Transaction:
    case OperationKind.Origination:
    case OperationKind.Delegation:
      fop += forgeAddress(op.source);
      fop += forgeZarith(op.fee || 0);
      fop += forgeZarith(op.counter);
      fop += forgeZarith(op.gas_limit);
      fop += forgeZarith(op.storage_limit);
      switch (op.kind) {
        case OperationKind.Reveal:
          fop += forgePublicKey(op.public_key);
          break;
        case OperationKind.Transaction:
          fop += forgeZarith(op.amount);
          fop += forgeAddress(op.destination);
          if (typeof op.parameters !== 'undefined' && op.parameters) {
            fop += forgeBool(true);
            fop += forgeParameters(op.parameters);
          } else {
            fop += forgeBool(false);
          }
          break;
        case OperationKind.Origination:
          fop += forgePublicKeyHash(op.manager_pubkey);
          fop += forgeZarith(op.balance);
          fop += forgeBool(op.spendable);
          fop += forgeBool(op.delegatable);
          if (typeof op.delegate !== 'undefined' && op.delegate) {
            fop += forgeBool(true);
            fop += forgePublicKeyHash(op.delegate);
          } else {
            fop += forgeBool(false);
          }
          if (typeof op.script !== 'undefined' && op.script) {
            fop += forgeBool(true);
            fop += forgeScript(op.script);
          } else {
            fop += forgeBool(false);
          }
          break;
        case OperationKind.Delegation:
          if (typeof op.delegate !== 'undefined' && op.delegate) {
            fop += forgeBool(true);
            fop += forgePublicKeyHash(op.delegate);
          } else {
            fop += forgeBool(false);
          }
          break;
        default:
          throw new Error('Unknown forge opcode');
      }
      break;
    default:
      throw new Error('Unknown forge opcode');
  }
  return fop;
}

export { forgeOp };
