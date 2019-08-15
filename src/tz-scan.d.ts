declare const enum OperationType {
  Endorsement = 'Endorsement',
  Transaction = 'Transaction',
  Origination = 'Origination',
  Delegation = 'Delegation',
  Activation = 'Activation',
  Reveal = 'Reveal'
}

declare const enum OperationKind {
  Endorsement = 'endorsement',
  Transaction = 'transaction',
  Origination = 'origination',
  Delegation = 'delegation',
  Activation = 'activation',
  Reveal = 'reveal'
}

interface TzScanAddress {
  tz: string;
}

interface TzScanOperationBase {
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

interface TzScanOperationTransaction extends TzScanOperationBase {
  kind: OperationKind.Transaction;
  amount: number | string;
  destination: TzScanAddress;
}

interface TzScanOperationReveal extends TzScanOperationBase {
  kind: OperationKind.Reveal;
  public_key: string;
}

declare type TzScanOperation =
  | TzScanOperationTransaction
  | TzScanOperationReveal;

declare type TzScanOperations = {
  [K in OperationKind]: TzScanOperationMap[K];
};
declare type TzScanOperationMap = {
  [OperationKind.Transaction]: TzScanOperationTransaction;
  [OperationKind.Reveal]: TzScanOperationReveal;
  [OperationKind.Activation]: TzScanOperationBase;
  [OperationKind.Delegation]: TzScanOperationBase;
  [OperationKind.Endorsement]: TzScanOperationBase;
  [OperationKind.Origination]: TzScanOperationBase;
};

interface TzScanOperationEnvelope {
  hash: string;
  block_hash: string;
  network_hash: string;
  type: {
    kind: string;
    source: TzScanAddress;
    operations?: TzScanOperationBase[] | null;
  };
}

interface TzScanOperationEnvelopeOf<Kind extends OperationKind>
  extends TzScanOperationEnvelope {
  hash: string;
  block_hash: string;
  network_hash: string;
  type: {
    kind: string;
    source: TzScanAddress;
    operations?: TzScanOperations[Kind][] | null;
  };
}

interface TzScanAccountStatus {
  hash: TzScanAddress & { alias?: string };
  revelation?: string;
  origination?: string;
}
