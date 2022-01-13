import * as t from "io-ts";
export declare type RpcTransactionReceipt = t.TypeOf<typeof rpcTransactionReceipt>;
export declare const rpcTransactionReceipt: t.TypeC<{
    transactionHash: t.Type<Buffer, Buffer, unknown>;
    transactionIndex: t.Type<import("bn.js"), import("bn.js"), unknown>;
    blockHash: t.Type<Buffer, Buffer, unknown>;
    blockNumber: t.Type<import("bn.js"), import("bn.js"), unknown>;
    from: t.Type<Buffer, Buffer, unknown>;
    to: t.Type<Buffer | null, Buffer | null, unknown>;
    cumulativeGasUsed: t.Type<import("bn.js"), import("bn.js"), unknown>;
    gasUsed: t.Type<import("bn.js"), import("bn.js"), unknown>;
    contractAddress: t.Type<Buffer | null, Buffer | null, unknown>;
    logs: t.ArrayC<t.TypeC<{
        logIndex: t.Type<import("bn.js") | null, import("bn.js") | null, unknown>;
        transactionIndex: t.Type<import("bn.js") | null, import("bn.js") | null, unknown>;
        transactionHash: t.Type<Buffer | null, Buffer | null, unknown>;
        blockHash: t.Type<Buffer | null, Buffer | null, unknown>;
        blockNumber: t.Type<import("bn.js") | null, import("bn.js") | null, unknown>;
        address: t.Type<Buffer, Buffer, unknown>;
        data: t.Type<Buffer, Buffer, unknown>;
        topics: t.ArrayC<t.Type<Buffer, Buffer, unknown>>;
    }>>;
    logsBloom: t.Type<Buffer, Buffer, unknown>;
    status: t.Type<import("bn.js") | null | undefined, import("bn.js") | null | undefined, unknown>;
    root: t.Type<Buffer | undefined, Buffer | undefined, unknown>;
    type: t.Type<import("bn.js") | undefined, import("bn.js") | undefined, unknown>;
    effectiveGasPrice: t.Type<import("bn.js") | undefined, import("bn.js") | undefined, unknown>;
}>;
//# sourceMappingURL=receipt.d.ts.map