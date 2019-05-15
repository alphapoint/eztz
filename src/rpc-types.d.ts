interface Block {
    protocol: string
    chain_id: string
    header: BlockHeader
    metadata: any
    operations: [any, any, any, BlockOperation[]]
    hash: string
}

interface BlockHeader {
    context: string
    level: number
    priority: number
    proof_of_work_nonce: string
    operations_hash: string
    fitness: string[]
    proto: number
    signature: string
    timestamp: string
    validation_pass: number
    predecessor: string
}


interface BlockOperation {
    branch: string
    chain_id: string
    contents: OperationContent[]
    hash: string
    protocol: string
    signature: string
}

interface OperationContent {
    mount: string
    counter: string
    destination: string
    fee: string
    kind: string
    metadata: OperationMetadata

}

interface OperationMetadata {
    balance_updates: {
        kind: string
        level: number
        contract: string
        delegate: string
        change: string
    }[]
    operation_result: {
        balance_updates: {
            change: string
            contract: string
            kind: string
        }[]
        consumed_gas: string
        status: string
    }
    source: string
    storage_limit: string
}

interface ManagerKey {
    manager: string
}

interface Operation {
    kind: string
    balance?: string
    fee: string
    gas_limit: string
    storage_limit: string
    amount?: string
    destination?: string
    delegatable?: string
    delegate?: string
    spendable?: string
    managerPubkey?: string
    manager_pubkey?: string
    parameters?: OperationParameter
    signature?: string
    script?: OperationScript
    secret?: string
}

interface OperationScript {
    code: OperationParameter[]
    storage: OperationParameter
}

interface OperationParameter {
    prim?: string,
    annots?: Uint8Array,
    args?: OperationParameter[],
    bytes?: string | Uint8Array,
    int?: number,
    string?: string
}
