import type { RunTxResult } from "@nomicfoundation/ethereumjs-vm";
import assert, { AssertionError } from "assert";
import { ExecutionResult } from "rethnet-evm";
import { ERROR } from "@nomicfoundation/ethereumjs-evm/dist/exceptions";

import { InternalError } from "../../../core/providers/errors";

export function assertHardhatNetworkInvariant(
  invariant: boolean,
  description: string
): asserts invariant {
  if (!invariant) {
    // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
    throw new InternalError(
      `Internal Hardhat Network invariant was violated: ${description}`
    );
  }
}

export function assertEthereumJsAndRethnetResults(
  rethnetResult: ExecutionResult,
  ethereumjsResult: RunTxResult
): asserts rethnetResult {
  assertEthereumJsAndRethnetExitCodes(
    rethnetResult.exitCode,
    ethereumjsResult.execResult.exceptionError?.error
  );
  assertEqual(
    rethnetResult.gasRefunded,
    ethereumjsResult.gasRefund,
    "Gas refunded"
  );

  assertEqual(
    rethnetResult.gasUsed,
    ethereumjsResult.totalGasSpent,
    "Gas used"
  );

  const rethnetCreatedAddress = rethnetResult.output.address?.toString("hex");
  const ethereumjsCreatedAddress = ethereumjsResult.createdAddress
    ?.toString()
    .slice(2); // remove the 0x prefix

  assertEqual(
    rethnetCreatedAddress,
    ethereumjsCreatedAddress,
    "Created address"
  );

  if (ethereumjsResult.createdAddress === undefined) {
    assertEqual(
      rethnetResult.output.output?.toString("hex"),
      ethereumjsResult.execResult.returnValue.toString("hex"),
      "Return value"
    );
  }
  // TODO: Compare logs?
}

function assertEthereumJsAndRethnetExitCodes(
  rethnetExitCode: number,
  ethereumjsExitCode: ERROR | undefined
) {
  // assert(ethereumjsExitCode === undefined && !(
  //   rethnetExitCode === 0x00 ||
  //   rethnetExitCode === 0x02 ||
  //   rethnetExitCode === 0x03), "Expected a successful exit code");

  const mapping = new Map([
    [ERROR.OUT_OF_GAS, [0x50]],
    [ERROR.CODESTORE_OUT_OF_GAS, undefined],
    [ERROR.CODESIZE_EXCEEDS_MAXIMUM, undefined],
    [ERROR.STACK_UNDERFLOW, [0x57]],
    [ERROR.STACK_OVERFLOW, [0x58]],
    [ERROR.INVALID_JUMP, [0x54]],
    [ERROR.INVALID_OPCODE, [0x51, 0x53]],
    [ERROR.OUT_OF_RANGE, [0x59]], // ?
    [ERROR.REVERT, [0x20]],
    [ERROR.STATIC_STATE_CHANGE, [0x52]], // ?
    [ERROR.INTERNAL_ERROR, undefined],
    [ERROR.CREATE_COLLISION, [0x60]],
    [ERROR.STOP, [0x01]],
    [ERROR.REFUND_EXHAUSTED, undefined],
    [ERROR.VALUE_OVERFLOW, undefined],
    [ERROR.INSUFFICIENT_BALANCE, undefined],
    [ERROR.INVALID_BEGINSUB, undefined],
    [ERROR.INVALID_RETURNSUB, undefined],
    [ERROR.INVALID_JUMPSUB, undefined],
    [ERROR.INVALID_BYTECODE_RESULT, [0x53]], // ?
    [ERROR.INVALID_EOF_FORMAT, undefined],
    [ERROR.INITCODE_SIZE_VIOLATION, [0x64]], // ?
    [ERROR.AUTHCALL_UNSET, undefined],
    [ERROR.AUTHCALL_NONZERO_VALUEEXT, undefined],
    [ERROR.AUTH_INVALID_S, undefined],
    [ERROR.BLS_12_381_INVALID_INPUT_LENGTH, undefined],
    [ERROR.BLS_12_381_POINT_NOT_ON_CURVE, undefined],
    [ERROR.BLS_12_381_INPUT_EMPTY, undefined],
    [ERROR.BLS_12_381_FP_NOT_IN_FIELD, undefined],
  ]);

  if (ethereumjsExitCode !== undefined) {
    const expected = mapping.get(ethereumjsExitCode);
    if (expected !== undefined) {
      assert(
        expected.includes(rethnetExitCode),
        `Expected rethnet's exit code ${rethnetExitCode} to be included in ${expected.join(
          ", "
        )}`
      );
    }
  }
}

function assertEqual(rethnetValue: any, ethereumJsValue: any, field: string) {
  if (rethnetValue !== ethereumJsValue) {
    // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
    throw new AssertionError({
      message: `Expected '${field}' to match, but rethnet returned ${rethnetValue} and ethereumjs returned ${ethereumJsValue}`,
    });
  }
}
