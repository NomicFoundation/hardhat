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

  for (let [i, expectedLog] of expected.structLogs.entries()) {
    // Deep copy because we modify the logs
    expectedLog = JSON.parse(JSON.stringify(expectedLog));
    const actualLog = JSON.parse(JSON.stringify(actual.structLogs[i]));

    // we ignore the gasCost of the last step because
    // we don't guarantee that it's correct
    if (i === expected.structLogs.length - 1) {
      actualLog.gasCost = 0;
      expectedLog.gasCost = 0;
    }

    if (expectedLog.op === "STATICCALL") {
      // We don't support STATICCALL gas calculation in EDR currently, just return 0.
      expectedLog.gasCost = 0;
    }

    // Fixture has deprecated name for KECCAK256
    if (actualLog.op === "KECCAK256") {
      actualLog.op = "SHA3";
    }

    // REVM doesn't include memory expansion, but the fixture does
    if (
      i > 1 &&
      (expectedLog.op === "MSTORE" ||
        expectedLog.op === "STATICCALL" ||
        expectedLog.op === "CALLDATACOPY" ||
        expectedLog.op === "CODECOPY" ||
        expectedLog.op === "REVERT") &&
      expectedLog.memory &&
      actualLog.memory &&
      expected.structLogs[i - 1].memory
    ) {
      // Check for memory expansion
      if (
        expectedLog.memory!.length > expected.structLogs[i - 1].memory!.length
      ) {
        while (expectedLog.memory!.length > actualLog.memory!.length) {
          actualLog.memory!.push("0".repeat(64));
        }
      }
    }

    assert.deepEqual(
      actualLog,
      expectedLog,
      `Different logs at ${i} (pc: ${expectedLog.pc}, opcode: ${expectedLog.op}, gas: ${expectedLog.gas})`
    );
  }
}
