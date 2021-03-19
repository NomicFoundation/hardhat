import { assert } from "chai";

import { RpcDebugTraceOutput } from "../../../../../src/internal/hardhat-network/provider/output";

export function assertEqualTraces(
  expected: RpcDebugTraceOutput,
  actual: RpcDebugTraceOutput
) {
  assert.equal(actual.failed, expected.failed);
  assert.equal(actual.gas, expected.gas);

  // geth doesn't seem to include the returnValue
  // assert.equal(actual.returnValue, expected.returnValue);

  assert.equal(actual.structLogs.length, expected.structLogs.length);

  for (const [i, log] of expected.structLogs.entries()) {
    if (actual.structLogs[i].op === log.op && log.op.endsWith("CALL")) {
      continue;
    }

    assert.deepEqual(
      actual.structLogs[i],
      log,
      `Different logs at ${i} (opcode: ${log.op}, gas: ${log.gas})`
    );
  }
}
