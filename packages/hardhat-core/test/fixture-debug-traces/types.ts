import {
  RpcDebugTraceOutput,
  RpcStructLog,
} from "../../src/internal/hardhat-network/provider/output";

export type GethTrace = Omit<RpcDebugTraceOutput, "structLogs"> & {
  structLogs: Array<Omit<RpcStructLog, "memSize">>;
};

export type TurboGethTrace = GethTrace;
