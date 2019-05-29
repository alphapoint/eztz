interface TzScanOperation {
    hash: string
    block_hash: string
    network_hash: string
    type: {
        operations: {
            kind: string
            level: number
            nonce: string
        }[]
    }
}
