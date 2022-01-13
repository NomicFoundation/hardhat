import * as t from "io-ts";
export declare const rpcFilterRequest: t.TypeC<{
    fromBlock: t.Type<import("bn.js") | "pending" | "earliest" | "latest" | undefined, import("bn.js") | "pending" | "earliest" | "latest" | undefined, unknown>;
    toBlock: t.Type<import("bn.js") | "pending" | "earliest" | "latest" | undefined, import("bn.js") | "pending" | "earliest" | "latest" | undefined, unknown>;
    address: t.Type<Buffer | Buffer[] | undefined, Buffer | Buffer[] | undefined, unknown>;
    topics: t.Type<(Buffer | (Buffer | null)[] | null)[] | undefined, (Buffer | (Buffer | null)[] | null)[] | undefined, unknown>;
    blockHash: t.Type<Buffer | undefined, Buffer | undefined, unknown>;
}>;
export declare type RpcFilterRequest = t.TypeOf<typeof rpcFilterRequest>;
export declare const optionalRpcFilterRequest: t.Type<{
    fromBlock: import("bn.js") | "pending" | "earliest" | "latest" | undefined;
    toBlock: import("bn.js") | "pending" | "earliest" | "latest" | undefined;
    address: Buffer | Buffer[] | undefined;
    topics: (Buffer | (Buffer | null)[] | null)[] | undefined;
    blockHash: Buffer | undefined;
} | undefined, {
    fromBlock: import("bn.js") | "pending" | "earliest" | "latest" | undefined;
    toBlock: import("bn.js") | "pending" | "earliest" | "latest" | undefined;
    address: Buffer | Buffer[] | undefined;
    topics: (Buffer | (Buffer | null)[] | null)[] | undefined;
    blockHash: Buffer | undefined;
} | undefined, unknown>;
export declare type OptionalRpcFilterRequest = t.TypeOf<typeof optionalRpcFilterRequest>;
//# sourceMappingURL=filterRequest.d.ts.map