import { utility } from './utility';
import { tezos } from './tezos';
import { prefix } from './prefix';

//Forge functions
const forgeOpTags: { [key: string]: number } = {
  endorsement: 0,
  seed_nonce_revelation: 1,
  double_endorsement_evidence: 2,
  double_baking_evidence: 3,
  activate_account: 4,
  proposals: 5,
  ballot: 6,
  reveal: 7,
  transaction: 8,
  origination: 9,
  delegation: 10
};

function forgeOp(op: any) {
  let fop = utility.buf2hex(new Uint8Array([forgeOpTags[op.kind]]));
  switch (forgeOpTags[op.kind]) {
    case 0:
    case 1:
      fop += utility.buf2hex(utility.toBytesInt32(op.level));
      if (forgeOpTags[op.kind] == 0) break;
      fop += op.nonce;
      if (forgeOpTags[op.kind] == 1) break;
    case 2:
    case 3:
      if (forgeOpTags[op.kind] == 2) break;
      if (forgeOpTags[op.kind] == 3) break;
      throw 'Double bake and double endorse forging is not complete';
    case 4:
      fop += utility.buf2hex(utility.b58cdecode(op.pkh, prefix.tz1));
      fop += op.secret;
      if (forgeOpTags[op.kind] == 4) break;
    case 5:
    case 6:
      fop += forgePublicKeyHash(op.source);
      fop += utility.buf2hex(utility.toBytesInt32(op.period));
      if (forgeOpTags[op.kind] == 5) {
        throw 'Proposal forging is not complete';
        break;
      } else if (forgeOpTags[op.kind] == 6) {
        fop += utility.buf2hex(utility.b58cdecode(op.proposal, prefix.P));
        fop += op.ballot == 'yay' ? '00' : op.ballot == 'nay' ? '01' : '02';
        break;
      }
    case 7:
    case 8:
    case 9:
    case 10:
      fop += forgeAddress(op.source);
      fop += forgeZarith(op.fee);
      fop += forgeZarith(op.counter);
      fop += forgeZarith(op.gas_limit);
      fop += forgeZarith(op.storage_limit);
      if (forgeOpTags[op.kind] == 7) {
        fop += forgePublicKey(op.public_key);
      } else if (forgeOpTags[op.kind] == 8) {
        fop += forgeZarith(op.amount);
        fop += forgeAddress(op.destination);
        if (typeof op.parameters != 'undefined' && op.parameters) {
          fop += forgeBool(true);
          fop += forgeParameters(op.parameters);
        } else {
          fop += forgeBool(false);
        }
      } else if (forgeOpTags[op.kind] == 9) {
        fop += forgePublicKeyHash(op.manager_pubkey);
        fop += forgeZarith(op.balance);
        fop += forgeBool(op.spendable);
        fop += forgeBool(op.delegatable);
        if (typeof op.delegate != 'undefined' && op.delegate) {
          fop += forgeBool(true);
          fop += forgePublicKeyHash(op.delegate);
        } else {
          fop += forgeBool(false);
        }
        if (typeof op.script != 'undefined' && op.script) {
          fop += forgeBool(true);
          fop += forgeScript(op.script);
        } else {
          fop += forgeBool(false);
        }
      } else if (forgeOpTags[op.kind] == 10) {
        if (typeof op.delegate != 'undefined' && op.delegate) {
          fop += forgeBool(true);
          fop += forgePublicKeyHash(op.delegate);
        } else {
          fop += forgeBool(false);
        }
      }
      break;
  }
  return fop;
}

function forgeBool(b: string | boolean) {
  return b ? 'ff' : '00';
}

function forgeScript(s: OperationScript) {
  var t1 = tezos.encodeRawBytes(s.code).toLowerCase();
  var t2 = tezos.encodeRawBytes(s.storage).toLowerCase();
  return (
    utility.toBytesInt32Hex(t1.length / 2) +
    t1 +
    utility.toBytesInt32Hex(t2.length / 2) +
    t2
  );
}

function forgeParameters(p: OperationParameter | OperationParameter[]) {
  var t = tezos.encodeRawBytes(p).toLowerCase();
  return utility.toBytesInt32Hex(t.length / 2) + t;
}

function forgeAddress(a: string) {
  var fa;
  if (a.substr(0, 1) == 'K') {
    fa = '01';
    fa += utility.buf2hex(utility.b58cdecode(a, prefix.KT));
    fa += '00';
  } else {
    fa = '00';
    fa += forgePublicKeyHash(a);
  }
  return fa;
}

function forgeZarith(n: string | number) {
  let fn = '';
  n = typeof n === 'string' ? parseInt(n) : n;
  while (true) {
    if (n < 128) {
      if (n < 16) fn += '0';
      fn += n.toString(16);
      break;
    } else {
      let b = n % 128;
      n -= b;
      n /= 128;
      b += 128;
      fn += b.toString(16);
    }
  }
  return fn;
}

function forgePublicKeyHash(pkh: string) {
  var fpkh;
  var t = parseInt(pkh.substr(2, 1));
  fpkh = '0' + (t - 1).toString();
  fpkh += utility.buf2hex(utility.b58cdecode(pkh, prefix[pkh.substr(0, 3)]));
  return fpkh;
}

function forgePublicKey(pk: string) {
  var fpk;
  var t;
  switch (pk.substr(0, 2)) {
    case 'ed':
      fpk = '00';
      break;
    case 'sp':
      fpk = '01';
      break;
    case 'p2':
      fpk = '02';
      break;
  }
  fpk += utility.buf2hex(utility.b58cdecode(pk, prefix[pk.substr(0, 4)]));
  return fpk;
}

export { forgeOp };
