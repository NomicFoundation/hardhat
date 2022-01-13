import { BN } from "ethereumjs-util";
import { JsonRpcClient } from "../../jsonrpc/client";
import { ForkConfig } from "../node-types";
export declare function makeForkClient(forkConfig: ForkConfig, forkCachePath?: string): Promise<{
    forkClient: JsonRpcClient;
    forkBlockNumber: BN;
    forkBlockTimestamp: number;
}>;
//# sourceMappingURL=makeForkClient.d.ts.map