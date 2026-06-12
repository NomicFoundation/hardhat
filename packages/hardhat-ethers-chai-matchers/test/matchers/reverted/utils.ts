import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isKnownEvmExecutionErrorMessage,
  isNoDataExecutionError,
} from "../../../src/internal/matchers/reverted/utils.js";

import {
  createNoDataCallException,
  createNoDataProviderExecutionError,
  createNestedNoDataProviderExecutionError,
} from "./no-data-error-fixtures.js";

describe("isNoDataExecutionError", () => {
  it("Should return true for no-data ethers call exceptions", () => {
    for (const action of ["call", "estimateGas"] as const) {
      assert.equal(
        isNoDataExecutionError(createNoDataCallException(action)),
        true,
        action,
      );
    }

    assert.equal(
      isNoDataExecutionError(
        createNoDataCallException("call", new Error("execution reverted")),
      ),
      true,
    );
  });

  it("Should return true for no-data provider execution errors", () => {
    for (const code of [3, -32000, -32003]) {
      assert.equal(
        isNoDataExecutionError(createNoDataProviderExecutionError(code)),
        true,
        `code ${code}`,
      );
    }

    assert.equal(
      isNoDataExecutionError(createNestedNoDataProviderExecutionError(-32003)),
      true,
    );
  });

  it("Should return false for values that are not no-data execution errors", () => {
    assert.equal(isNoDataExecutionError({}), false);

    assert.equal(
      isNoDataExecutionError(new Error("execution reverted")),
      false,
    );

    assert.equal(
      isNoDataExecutionError(
        createNoDataProviderExecutionError(-32003, "EVM error DatabaseError"),
      ),
      false,
    );

    // ethers call exception whose nested rpc error has a non-execution code
    assert.equal(
      isNoDataExecutionError(
        createNoDataCallException("call", {
          code: -1,
          message: "EVM error InvalidFEOpcode",
        }),
      ),
      false,
    );
  });

  it("Should return false when revert data is present", () => {
    assert.equal(
      isNoDataExecutionError(
        Object.assign(new Error("execution reverted"), {
          code: -32000,
          data: "0x08c379a0",
        }),
      ),
      false,
    );

    assert.equal(
      isNoDataExecutionError(
        createNoDataCallException("call", {
          code: -32003,
          data: "0x08c379a0",
          message: "execution reverted",
        }),
      ),
      false,
    );

    // ethers call exception that itself carries data is not a no-data error
    assert.equal(
      isNoDataExecutionError(
        Object.assign(createNoDataCallException("call"), {
          data: "0x08c379a0",
        }),
      ),
      false,
    );
  });
});

describe("isKnownEvmExecutionErrorMessage", () => {
  it("Should return true for known EVM execution error messages", () => {
    const messages = [
      "execution reverted",
      "execution reverted: reason",
      "Transaction reverted without a reason string",
      "Transaction reverted and Hardhat couldn't infer the reason.",
      "VM Exception while processing transaction: invalid opcode",
      "VM Exception while processing transaction: out of gas",
      "VM Exception while processing transaction: reverted with reason string 'x'",
      "Transaction reverted: contract call run out of gas and made the transaction revert",
      "invalid opcode: INVALID",
      "Provider error: invalid opcode",
      "EVM error InvalidFEOpcode",
      "EVM error OutOfGas",
    ];

    for (const message of messages) {
      assert.equal(isKnownEvmExecutionErrorMessage(message), true, message);
    }
  });

  it("Should return false for non-execution provider errors", () => {
    const messages = [
      "execution failed",
      "EVM error; database error: failed to get account",
      "EVM error: database error",
      "EVM error DatabaseError",
      "insufficient funds for gas * price",
      "Transaction reverted: trying to deploy a contract whose code is too large",
      "some upstream service mentioned invalid opcode",
    ];

    for (const message of messages) {
      assert.equal(isKnownEvmExecutionErrorMessage(message), false, message);
    }
  });
});
