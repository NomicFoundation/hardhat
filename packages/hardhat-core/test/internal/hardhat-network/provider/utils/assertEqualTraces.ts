import { assert } from "chai";

import { RpcDebugTraceOutput } from "../../../../../src/internal/hardhat-network/provider/output";

export function assertEqualTraces(
  actual: RpcDebugTraceOutput,
  expected: RpcDebugTraceOutput
) {
  // Deep copy because we modify the logs
  actual = JSON.parse(JSON.stringify(actual));
  expected = JSON.parse(JSON.stringify(expected));

  assert.equal(actual.failed, expected.failed);
  assert.equal(actual.gas, expected.gas);

  // geth doesn't seem to include the returnValue
  // assert.equal(actual.returnValue, expected.returnValue);

  // EthereumJS doesn't include STOP at the end when REVM does.
  if (actual.structLogs.length === expected.structLogs.length + 1) {
    if (actual.structLogs[actual.structLogs.length - 1].op === "STOP") {
      actual.structLogs.pop();
    }
  }
  assert.equal(actual.structLogs.length, expected.structLogs.length);

  // Eslint complains about not modifying `i`, but we need to modify `expectedLog`.
  // eslint-disable-next-line prefer-const
  for (let [i, expectedLog] of expected.structLogs.entries()) {
    const actualLog = actual.structLogs[i];

    // we ignore the gasCost of the last step because
    // we don't guarantee that it's correct
    if (i === expected.structLogs.length - 1) {
      actualLog.gasCost = 0;
      expectedLog.gasCost = 0;
    }

    // We don't support gas computation for these opcodes yet in EDR and always return 0.
    if (
      expectedLog.op === "CREATE" ||
      expectedLog.op === "CREATE2" ||
      expectedLog.op === "CALL" ||
      expectedLog.op === "CALLCODE" ||
      expectedLog.op === "DELEGATECALL" ||
      expectedLog.op === "STATICCALL"
    ) {
      actualLog.gasCost = 0;
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
      // Only way to make eslint happy by strict checking for both null and undefined
      expectedLog.memory !== null &&
      expectedLog.memory !== undefined &&
      actualLog.memory !== null &&
      actualLog.memory !== undefined &&
      expected.structLogs[i - 1].memory !== null &&
      expected.structLogs[i - 1].memory !== undefined
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
