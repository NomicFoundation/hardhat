import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { assertHardhatInvariant } from "@ignored/hardhat-vnext-errors";
import { numberToHexString } from "@ignored/hardhat-vnext-utils/hex";

import { FixedGasPriceProvider } from "../../../../../../src/internal/builtin-plugins/network-manager/providers/gas-providers/fixed-gas-price-provider.js";
import { createJsonRpcRequest, createNetworkConfig } from "../helpers.js";

describe("FixedGasPriceProvider", () => {
  let fixedGasPriceProvider: FixedGasPriceProvider;

  const FIXED_GAS_PRICE = 1234n;

  beforeEach(() => {
    const networkConfig = createNetworkConfig({ gasPrice: FIXED_GAS_PRICE });

    fixedGasPriceProvider = new FixedGasPriceProvider(networkConfig);
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

    assertHardhatInvariant(
      Array.isArray(jsonRpcRequest.params),
      "params should be an array",
    );

    assert.equal(
      jsonRpcRequest.params[0].gasPrice,
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

    assertHardhatInvariant(
      Array.isArray(jsonRpcRequest.params),
      "params should be an array",
    );

    assert.equal(jsonRpcRequest.params[0].gasPrice, 14567);
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

    assertHardhatInvariant(
      Array.isArray(jsonRpcRequest.params),
      "params should be an array",
    );

    assert.equal(jsonRpcRequest.params[0].gas, undefined);
  });
});
