import {
  RpcDebugTraceOutput,
  RpcStructLog,
} from "../../src/internal/hardhat-network/provider/output";

export type TurboGethTrace = Omit<RpcDebugTraceOutput, "structLogs"> & {
  structLogs: Array<Omit<RpcStructLog, "memSize">>;
};
