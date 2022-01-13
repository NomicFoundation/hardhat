import * as t from "io-ts";
export declare const rpcForkConfig: t.Type<{
    jsonRpcUrl: string;
    blockNumber: number | undefined;
} | undefined, {
    jsonRpcUrl: string;
    blockNumber: number | undefined;
} | undefined, unknown>;
export declare type RpcForkConfig = t.TypeOf<typeof rpcForkConfig>;
export declare const rpcHardhatNetworkConfig: t.TypeC<{
    forking: t.Type<{
        jsonRpcUrl: string;
        blockNumber: number | undefined;
    } | undefined, {
        jsonRpcUrl: string;
        blockNumber: number | undefined;
    } | undefined, unknown>;
}>;
export declare type RpcHardhatNetworkConfig = t.TypeOf<typeof rpcHardhatNetworkConfig>;
export declare const optionalRpcHardhatNetworkConfig: t.Type<{
    forking: {
        jsonRpcUrl: string;
        blockNumber: number | undefined;
    } | undefined;
} | undefined, {
    forking: {
        jsonRpcUrl: string;
        blockNumber: number | undefined;
    } | undefined;
} | undefined, unknown>;
export declare const rpcIntervalMining: t.UnionC<[t.Type<number, number, unknown>, t.Type<[number, number], [number, number], unknown>]>;
export declare type RpcIntervalMining = t.TypeOf<typeof rpcIntervalMining>;
//# sourceMappingURL=hardhat-network.d.ts.map