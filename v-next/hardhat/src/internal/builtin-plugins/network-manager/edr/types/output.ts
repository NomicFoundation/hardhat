export interface RpcStructLog {
  depth: number;
  gas: number;
  gasCost: number;
  op: string;
  pc: number;
  memory?: string[];
  stack?: string[];
  storage?: Record<string, string>;
  memSize?: number;
  error?: Record<string, string>;
}

export interface RpcDebugTraceOutput {
  failed: boolean;
  gas: number;
  returnValue: string;
  structLogs: RpcStructLog[];
}
