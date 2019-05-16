import { AnyARecord } from "dns";

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
        status: string,
        errors?: any // TODO: string[]? {...}[]?
    }
    source: string
    storage_limit: string
}

interface ManagerKey {
    manager: string
}

interface Operation {
    source?: Source | string | any
    counter?: string | number
    kind: string
    balance?: string | number
    fee?: string | number
    gas_limit?: string | number
    storage_limit?: string | number
    amount?: string | number
    destination?: Source | string | any
    delegatable?: boolean
    delegate?: string 
    spendable?: boolean
    managerPubkey?: string | any
    manager_pubkey?: string | any
    parameters?: OperationParameter | Uint8Array
    signature?: string
    script?: OperationScript
    secret?: string
    public_key?: string
}

interface OperationScript {
    code: OperationParameter[]
    storage: OperationParameter
}

interface OperationParameter {
    prim?: string,
    annots?: Uint8Array | string[],
    args?: OperationParameter[],
    bytes?: string | Uint8Array,
    int?: number | string,
    string?: string
}

interface ContractInfo {
    balance: string
    counter: string
    delegate: { setable: boolean }
    manager: string
    script: OperationScript[]
    spendable: boolean
}

interface ContractScript {
    code: OperationParameter[]
    storage: { string: string }
}

interface KeyPair {
    pk: any,
    sk: any,
    // public key hash
    pkh: string
}

interface TypeCheckData {
    data: OperationParameter
    type: OperationParameter
    gas?: string
}
