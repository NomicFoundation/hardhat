import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { numberToHexString } from "@ignored/hardhat-vnext-utils/hex";

import { FixedGasPrice } from "../../../../../../../src/internal/builtin-plugins/network-manager/json-rpc-request-modifiers/gas-properties/fixed-gas-price.js";
import { createJsonRpcRequest, getParams } from "../../helpers.js";

describe("FixedGasPrice", () => {
  let fixedGasPriceProvider: FixedGasPrice;

  const FIXED_GAS_PRICE = 1234n;

  beforeEach(() => {
    fixedGasPriceProvider = new FixedGasPrice(FIXED_GAS_PRICE);
  });

  it("should set the fixed gasPrice if not present", async () => {
    const jsonRpcRequest = createJsonRpcRequest("eth_sendTransaction", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1,
      },
    ]);

    fixedGasPriceProvider.modifyRequest(jsonRpcRequest);

    assert.equal(
      getParams(jsonRpcRequest)[0].gasPrice,
      numberToHexString(FIXED_GAS_PRICE),
    );
  });

  it("shouldn't replace the provided gasPrice", async () => {
    const jsonRpcRequest = createJsonRpcRequest("eth_sendTransaction", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1,
        gasPrice: 14567,
      },
    ]);

    fixedGasPriceProvider.modifyRequest(jsonRpcRequest);

    assert.equal(getParams(jsonRpcRequest)[0].gasPrice, 14567);
  });

  it("should forward the other calls and not modify the gasPrice", async () => {
    const jsonRpcRequest = createJsonRpcRequest("eth_gasPrice", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1,
      },
    ]);

    fixedGasPriceProvider.modifyRequest(jsonRpcRequest);

    assert.equal(getParams(jsonRpcRequest)[0].gas, undefined);
  });
});
