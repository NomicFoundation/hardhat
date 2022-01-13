import { MessageTrace } from "../internal/hardhat-network/stack-traces/message-trace";
import { HardhatRuntimeEnvironment } from "./runtime";
export declare type ExperimentalHardhatNetworkMessageTraceHook = (hre: HardhatRuntimeEnvironment, trace: MessageTrace, isMessageTraceFromACall: boolean) => Promise<void>;
export declare type BoundExperimentalHardhatNetworkMessageTraceHook = (trace: MessageTrace, isMessageTraceFromACall: boolean) => Promise<void>;
//# sourceMappingURL=experimental.d.ts.map