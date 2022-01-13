import * as t from "io-ts";
export declare const rpcNewBlockTagObjectWithNumber: t.TypeC<{
    blockNumber: t.Type<import("bn.js"), import("bn.js"), unknown>;
}>;
export declare const rpcNewBlockTagObjectWithHash: t.TypeC<{
    blockHash: t.Type<Buffer, Buffer, unknown>;
    requireCanonical: t.Type<boolean | undefined, boolean | undefined, unknown>;
}>;
export declare const rpcBlockTagName: t.KeyofC<{
    earliest: null;
    latest: null;
    pending: null;
}>;
export declare const rpcNewBlockTag: t.UnionC<[t.Type<import("bn.js"), import("bn.js"), unknown>, t.TypeC<{
    blockNumber: t.Type<import("bn.js"), import("bn.js"), unknown>;
}>, t.TypeC<{
    blockHash: t.Type<Buffer, Buffer, unknown>;
    requireCanonical: t.Type<boolean | undefined, boolean | undefined, unknown>;
}>, t.KeyofC<{
    earliest: null;
    latest: null;
    pending: null;
}>]>;
export declare type RpcNewBlockTag = t.TypeOf<typeof rpcNewBlockTag>;
export declare const optionalRpcNewBlockTag: t.Type<import("bn.js") | "pending" | "earliest" | "latest" | {
    blockNumber: import("bn.js");
} | {
    blockHash: Buffer;
    requireCanonical: boolean | undefined;
} | undefined, import("bn.js") | "pending" | "earliest" | "latest" | {
    blockNumber: import("bn.js");
} | {
    blockHash: Buffer;
    requireCanonical: boolean | undefined;
} | undefined, unknown>;
export declare type OptionalRpcNewBlockTag = t.TypeOf<typeof optionalRpcNewBlockTag>;
export declare const rpcOldBlockTag: t.UnionC<[t.Type<import("bn.js"), import("bn.js"), unknown>, t.KeyofC<{
    earliest: null;
    latest: null;
    pending: null;
}>]>;
export declare type RpcOldBlockTag = t.TypeOf<typeof rpcOldBlockTag>;
export declare const optionalRpcOldBlockTag: t.Type<import("bn.js") | "pending" | "earliest" | "latest" | undefined, import("bn.js") | "pending" | "earliest" | "latest" | undefined, unknown>;
export declare type OptionalRpcOldBlockTag = t.TypeOf<typeof optionalRpcOldBlockTag>;
//# sourceMappingURL=blockTag.d.ts.map