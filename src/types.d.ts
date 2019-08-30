declare const enum OperationType {
  Activation = 'Activation',
  Delegation = 'Delegation',
  Endorsement = 'Endorsement',
  Origination = 'Origination',
  Reveal = 'Reveal',
  Transaction = 'Transaction'
}

declare const enum OperationKind {
  ActivateAccount = 'activate_account',
  Ballot = 'ballot',
  Delegation = 'delegation',
  DoubleBakingEvidence = 'double_baking_evidence',
  DoubleEndorsementEvidence = 'double_endorsement_evidence',
  Endorsement = 'endorsement',
  Origination = 'origination',
  Proposals = 'proposals',
  Reveal = 'reveal',
  SeedNonceRevelation = 'seed_nonce_revelation',
  Transaction = 'transaction'
}

/* eslint-disable @typescript-eslint/camelcase */
declare const enum OperationKindTag {
  // noinspection PointlessArithmeticExpressionJS
  endorsement = 0,
  seed_nonce_revelation = 1,
  double_endorsement_evidence = 2,
  double_baking_evidence = 3,
  activate_account = 4,
  proposals = 5,
  ballot = 6,
  // not sure how these tags match
  reveal = 7 + 0,
  transaction = 7 + 1,
  origination = 7 + 2,
  delegation = 7 + 3
}

declare interface Source {
  tag: number;
  hash: Uint8Array;
}

declare interface Block {
  protocol: string;
  chain_id: string;
  header: BlockHeader;
  metadata: any;
  operations: [any, any, any, BlockOperation[]];
  hash: string;
}

declare interface BlockHeader {
  context: string;
  level: number;
  priority: number;
  hash: string;
  proof_of_work_nonce: string;
  operations_hash: string;
  fitness: string[];
  proto: number;
  signature: string;
  timestamp: string;
  validation_pass: number;
  predecessor: string;
}

declare interface BlockOperationBase {
  branch: string;
  chain_id?: string;
  contents: Operation[];
  hash?: string;
  protocol?: string;
  signature?: string;
}

interface BlockOperation extends BlockOperationBase {
  branch: string;
  chain_id: string;
  contents: Operation[];
  hash: string;
  protocol: string;
  signature: string;
}

declare interface OperationMetadata {
  balance_updates: {
    kind: string;
    level: number;
    contract: string;
    delegate: string;
    change: string;
  }[];
  operation_result: {
    balance_updates: {
      change: string;
      contract: string;
      kind: string;
    }[];
    consumed_gas: string;
    status: string;
    errors?: any; // TODO: string[]? {...}[]?
  };
  source: string;
  storage_limit: string;
}

interface ManagerKey {
  manager: string;
}

declare type Operation =
  | OperationEndorsement
  | OperationDoubleEndorsementEvidence
  | OperationDoubleBakingEvidence
  | OperationSeedNonceRevelation
  | OperationActivateAccount
  | OperationProposals
  | OperationBallot
  | OperationReveal
  | OperationTransaction
  | OperationOrigination
  | OperationDelegation;

/*
interface OperationBase {
  nonce?: string;
  pkh?: string;
  source?: Source | string | any;
  counter?: string | number;
  kind: OperationKind;
  balance?: string | number;
  fee?: string | number;
  gas_limit?: string | number;
  storage_limit?: string | number;
  amount?: string | number;
  destination?: Source | string;
  delegatable?: boolean;
  delegate?: string;
  spendable?: boolean;
  manager_pubkey?: string;
  parameters?: OperationParameter | Uint8Array;
  signature?: string;
  script?: OperationScript;
  secret?: string;
  public_key?: string;
  level?: number | string;
  metadata?: OperationMetadata;
}
 */

interface OperationSeedNonceRevelation {
  kind: OperationKind.SeedNonceRevelation;
  level: number | string;
  nonce: string;
}

interface OperationEndorsement {
  kind: OperationKind.Endorsement;
  level: number | string;
  nonce: string;
}

declare interface OperationDoubleEndorsementEvidence {
  kind: OperationKind.DoubleEndorsementEvidence;
}

declare interface OperationDoubleBakingEvidence {
  kind: OperationKind.DoubleBakingEvidence;
}

declare interface OperationActivateAccount {
  kind: OperationKind.ActivateAccount;
  pkh: string;
  secret: string;
}

declare interface OperationProposals {
  kind: OperationKind.Proposals;
  source: string;
  period: number | string;
  proposal: string;
  ballot: 'yay' | 'nay';
}

declare interface OperationBallot {
  kind: OperationKind.Ballot;
  source: string;
  period: number | string;
  proposal: string;
  ballot: 'yay' | 'nay';
}

declare interface OperationBase {
  source: string;
  fee?: number | string;
  counter: number | string;
  gas_limit: number | string;
  storage_limit: number | string;
}

declare interface OperationReveal extends OperationBase {
  kind: OperationKind.Reveal;
  public_key: string;
}

declare interface OperationTransaction extends OperationBase {
  kind: OperationKind.Transaction;
  amount: bigint | number | string;
  destination: string;
  parameters?: OperationParameter | OperationParameter[];
}

declare interface OperationOrigination extends OperationBase {
  kind: OperationKind.Origination;
  manager_pubkey: string;
  balance: bigint | number | string;
  spendable: boolean;
  delegatable: boolean;
  delegate?: string;
  script?: OperationScript;
}

declare interface OperationDelegation extends OperationBase {
  kind: OperationKind.Delegation;
  delegate: string | undefined;
}

declare interface OperationScript {
  code: OperationParameter[];
  storage: OperationParameter;
}

declare type OperationParameter = {
  prim?: string;
  annots?: Uint8Array | string[];
  args?: OperationParameter[];
  bytes?: string | Uint8Array;
  int?: number | string;
  string?: string;
};

declare interface ContractInfo {
  balance: bigint | string;
  counter: string;
  delegate: { setable: boolean };
  manager: string;
  script: OperationScript[];
  spendable: boolean;
}

declare interface ContractScript {
  code: OperationParameter[];
  storage: { string: string };
}

declare interface TypeCheckData {
  data: OperationParameter;
  type: OperationParameter;
  gas?: string;
}

declare interface EzTzKeyPair {
  // public key
  pk: any;
  // secret (private) full key
  sk: any;
  // public key hash
  pkh: string;
}

declare interface EzTzGeneratedKeyPair extends EzTzKeyPair {
  mnemonic: string;
  passphrase: string;
  seed: Uint8Array;
}

declare interface TzScanAddress {
  tz: string;
}

declare interface TzScanOperationBase {
  kind: OperationKind;
  src: TzScanAddress;
  failed: boolean;
  internal: boolean;
  counter: string | number;
  fee: number | string;
  gas_limit: string | number;
  storage_limit: string | number;
  op_level: number;
  timestamp: string;
}

declare interface TzScanOperationTransaction extends TzScanOperationBase {
  kind: OperationKind.Transaction;
  amount: bigint | number | string;
  destination: TzScanAddress;
}

declare interface TzScanOperationReveal extends TzScanOperationBase {
  kind: OperationKind.Reveal;
  public_key: string;
}

declare type TzScanOperation = TzScanOperationTransaction | TzScanOperationReveal;

declare type TzScanOperations = {
  [K in OperationKind]: TzScanOperationMap[K];
};

declare type TzScanOperationMap = {
  [OperationKind.ActivateAccount]: TzScanOperationBase;
  [OperationKind.Ballot]: TzScanOperationBase;
  [OperationKind.Delegation]: TzScanOperationBase;
  [OperationKind.DoubleBakingEvidence]: TzScanOperationBase;
  [OperationKind.DoubleEndorsementEvidence]: TzScanOperationBase;
  [OperationKind.Endorsement]: TzScanOperationBase;
  [OperationKind.Origination]: TzScanOperationBase;
  [OperationKind.Proposals]: TzScanOperationBase;
  [OperationKind.Reveal]: TzScanOperationReveal;
  [OperationKind.SeedNonceRevelation]: TzScanOperationBase;
  [OperationKind.Transaction]: TzScanOperationTransaction;
};

declare interface TzScanOperationEnvelope {
  hash: string;
  block_hash: string;
  network_hash: string;
  type: {
    kind: string;
    source: TzScanAddress;
    operations?: TzScanOperationBase[] | null;
  };
}

declare interface TzScanOperationEnvelopeOf<Kind extends OperationKind> extends TzScanOperationEnvelope {
  hash: string;
  block_hash: string;
  network_hash: string;
  type: {
    kind: string;
    source: TzScanAddress;
    operations?: TzScanOperations[Kind][] | null;
  };
}

declare interface TzScanAccountStatus {
  hash: TzScanAddress & { alias?: string };
  revelation?: string;
  origination?: string;
}
