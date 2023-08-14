import { RpcDebugTraceOutput } from "../../src/internal/hardhat-network/provider/output";

export const trace: RpcDebugTraceOutput = {
  gas: 21012,
  failed: false,
  returnValue: "",
  structLogs: [
    {
      pc: 0,
      op: "PUSH0",
      gas: 5979000,
      gasCost: 2,
      depth: 1,
      stack: [],
      memory: [],
      storage: {},
    },
    {
      pc: 1,
      op: "PUSH0",
      gas: 5978998,
      gasCost: 2,
      depth: 1,
      stack: [
        "0000000000000000000000000000000000000000000000000000000000000000",
      ],
      memory: [],
      storage: {},
    },
    {
      pc: 2,
      op: "MSTORE",
      gas: 5978996,
      gasCost: 6,
      depth: 1,
      stack: [
        "0000000000000000000000000000000000000000000000000000000000000000",
        "0000000000000000000000000000000000000000000000000000000000000000",
      ],
      memory: [
        "0000000000000000000000000000000000000000000000000000000000000000",
      ],
      storage: {},
    },
    {
      pc: 3,
      op: "PUSH0",
      gas: 5978990,
      gasCost: 2,
      depth: 1,
      stack: [],
      memory: [
        "0000000000000000000000000000000000000000000000000000000000000000",
      ],
      storage: {},
    },
  ],
};
