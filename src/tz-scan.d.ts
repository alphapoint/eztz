declare const enum OperationType {
    Endorsement = "Endorsement",
    Transaction = "Transaction",
    Origination = "Origination",
    Delegation = "Delegation",
    Activation = "Activation",
    Reveal = "Reveal",
}

interface TzScanAddress {
    tz: string;
}

interface TzScanOperationsEntity {
    kind: string;
    src: TzScanAddress;
    amount: number | string;
    destination: TzScanAddress;
    failed: boolean;
    internal: boolean;
    burn: number | string;
    counter: string | number;
    fee: number | string;
    gas_limit: string | number;
    storage_limit: string | number;
    op_level: number;
    timestamp: string;
}

interface TzScanOperation {
    hash: string;
    block_hash: string;
    network_hash: string;
    type: {
        kind: string;
        source: TzScanAddress;
        operations?: TzScanOperationsEntity[] | null;
    };
}


