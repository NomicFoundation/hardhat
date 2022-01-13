import * as t from "io-ts";
export declare type RpcLog = t.TypeOf<typeof rpcLog>;
export declare const rpcLog: t.TypeC<{
    logIndex: t.Type<import("bn.js") | null, import("bn.js") | null, unknown>;
    transactionIndex: t.Type<import("bn.js") | null, import("bn.js") | null, unknown>;
    transactionHash: t.Type<Buffer | null, Buffer | null, unknown>;
    blockHash: t.Type<Buffer | null, Buffer | null, unknown>;
    blockNumber: t.Type<import("bn.js") | null, import("bn.js") | null, unknown>;
    address: t.Type<Buffer, Buffer, unknown>;
    data: t.Type<Buffer, Buffer, unknown>;
    topics: t.ArrayC<t.Type<Buffer, Buffer, unknown>>;
}>;
//# sourceMappingURL=log.d.ts.map