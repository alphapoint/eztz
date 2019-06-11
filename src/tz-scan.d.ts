declare const enum OperationType {
    Endorsement = "Endorsement",
    Transaction = "Transaction",
    Origination = "Origination",
    Delegation = "Delegation",
    Activation = "Activation",
    Reveal = "Reveal",
}

declare const enum OperationKind {
    Endorsement = "endorsement",
    Transaction = "transaction",
    Origination = "origination",
    Delegation = "delegation",
    Activation = "activation",
    Reveal = "reveal",
}

interface TzScanAddress {
    tz: string;
}

interface TzScanOperation {
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

interface TzScanOperationTransaction extends TzScanOperation {
    kind: OperationKind.Transaction;
    amount: number | string;
    destination: TzScanAddress;
}

interface TzScanOperationReveal extends TzScanOperation {
    kind: OperationKind.Reveal;
    public_key: string;
}

interface TzScanOperationEnvelope {
    hash: string;
    block_hash: string;
    network_hash: string;
    type: {
        kind: string;
        source: TzScanAddress;
        operations?: TzScanOperation[] | null;
    };
}



