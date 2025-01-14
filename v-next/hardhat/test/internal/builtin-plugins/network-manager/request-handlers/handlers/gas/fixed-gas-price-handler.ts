import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { numberToHexString } from "@ignored/hardhat-vnext-utils/hex";
import { isObject } from "@ignored/hardhat-vnext-utils/lang";

import {
  getJsonRpcRequest,
  getRequestParams,
} from "../../../../../../../src/internal/builtin-plugins/network-manager/json-rpc.js";
import { FixedGasPriceHandler } from "../../../../../../../src/internal/builtin-plugins/network-manager/request-handlers/handlers/gas/fixed-gas-price-handler.js";

describe("FixedGasPriceHandler", () => {
  let fixedGasPriceHandler: FixedGasPriceHandler;

  const FIXED_GAS_PRICE = 1234n;

  beforeEach(() => {
    fixedGasPriceHandler = new FixedGasPriceHandler(
      numberToHexString(FIXED_GAS_PRICE),
    );
  });

  it("should set the fixed gasPrice if not present", async () => {
    const jsonRpcRequest = getJsonRpcRequest(1, "eth_sendTransaction", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1,
      },
    ]);

    fixedGasPriceHandler.handle(jsonRpcRequest);
    const [tx] = getRequestParams(jsonRpcRequest);

    assert.ok(isObject(tx), "tx is not an object");
    assert.equal(tx.gasPrice, numberToHexString(FIXED_GAS_PRICE));
  });

  it("shouldn't replace the provided gasPrice", async () => {
    const jsonRpcRequest = getJsonRpcRequest(1, "eth_sendTransaction", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1,
        gasPrice: 14567,
      },
    ]);

    fixedGasPriceHandler.handle(jsonRpcRequest);
    const [tx] = getRequestParams(jsonRpcRequest);

    assert.ok(isObject(tx), "tx is not an object");
    assert.equal(tx.gasPrice, 14567);
  });

  it("should forward the other calls and not modify the gasPrice", async () => {
    const jsonRpcRequest = getJsonRpcRequest(1, "eth_gasPrice", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1,
      },
    ]);

    fixedGasPriceHandler.handle(jsonRpcRequest);
    const [tx] = getRequestParams(jsonRpcRequest);

    assert.ok(isObject(tx), "tx is not an object");
    assert.equal(tx.gas, undefined);
  });
});
