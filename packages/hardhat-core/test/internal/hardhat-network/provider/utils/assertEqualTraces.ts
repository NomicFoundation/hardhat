import { assert } from "chai";

import { RpcDebugTraceOutput } from "../../../../../src/internal/hardhat-network/provider/output";

export function assertEqualTraces(
  actual: RpcDebugTraceOutput,
  expected: RpcDebugTraceOutput
) {
  assert.equal(actual.failed, expected.failed);
  assert.equal(actual.gas, expected.gas);

  // geth doesn't seem to include the returnValue
  // assert.equal(actual.returnValue, expected.returnValue);

  assert.equal(actual.structLogs.length, expected.structLogs.length);

  for (const [i, log] of expected.structLogs.entries()) {
    // we ignore the gasCost of the last step because
    // we don't guarantee that it's correct
    if (i === expected.structLogs.length - 1) {
      actual.structLogs[i].gasCost = 0;
      log.gasCost = 0;
    }

    assert.deepEqual(
      actual.structLogs[i],
      log,
      `Different logs at ${i} (pc: ${log.pc}, opcode: ${log.op}, gas: ${log.gas})`
    );
  }
}
