import * as t from "io-ts";
export declare const rpcDebugTracingConfig: t.Type<{
    disableStorage: boolean | undefined;
    disableMemory: boolean | undefined;
    disableStack: boolean | undefined;
} | undefined, {
    disableStorage: boolean | undefined;
    disableMemory: boolean | undefined;
    disableStack: boolean | undefined;
} | undefined, unknown>;
export declare type RpcDebugTracingConfig = t.TypeOf<typeof rpcDebugTracingConfig>;
//# sourceMappingURL=debugTraceTransaction.d.ts.map