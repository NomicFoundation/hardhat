import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { numberToHexString } from "@ignored/hardhat-vnext-utils/hex";

import {
  getJsonRpcRequest,
  getRequestParams,
} from "../../../../../../../src/internal/builtin-plugins/network-manager/json-rpc.js";
import { FixedGasHandler } from "../../../../../../../src/internal/builtin-plugins/network-manager/request-handlers/handlers/gas/fixed-gas-handler.js";

describe("FixedGasHandler", () => {
  let fixedGasHandler: FixedGasHandler;

  const FIXED_GAS_LIMIT = 1233n;

  beforeEach(() => {
    fixedGasHandler = new FixedGasHandler(numberToHexString(FIXED_GAS_LIMIT));
  });

  it("should set the fixed gas if not present", async () => {
    const jsonRpcRequest = getJsonRpcRequest(1, "eth_sendTransaction", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1,
      },
    ]);

    fixedGasHandler.handle(jsonRpcRequest);

    assert.equal(
      getRequestParams(jsonRpcRequest)[0].gas,
      numberToHexString(FIXED_GAS_LIMIT),
    );
  });

  it("shouldn't replace the provided gas", async () => {
    const jsonRpcRequest = getJsonRpcRequest(1, "eth_sendTransaction", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1,
        gas: 1456,
      },
    ]);

    fixedGasHandler.handle(jsonRpcRequest);

    assert.equal(getRequestParams(jsonRpcRequest)[0].gas, 1456);
  });

  it("should forward the other calls and not modify the gas", async () => {
    const jsonRpcRequest = getJsonRpcRequest(1, "eth_estimateGas", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1,
      },
    ]);

    fixedGasHandler.handle(jsonRpcRequest);

    assert.equal(getRequestParams(jsonRpcRequest)[0].gas, undefined);
  });
});
