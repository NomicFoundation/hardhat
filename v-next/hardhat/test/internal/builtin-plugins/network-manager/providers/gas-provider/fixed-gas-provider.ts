import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { assertHardhatInvariant } from "@ignored/hardhat-vnext-errors";
import { numberToHexString } from "@ignored/hardhat-vnext-utils/hex";

import { FixedGasProvider } from "../../../../../../src/internal/builtin-plugins/network-manager/providers/gas-providers/fixed-gas-provider.js";
import { createJsonRpcRequest, createNetworkConfig } from "../helpers.js";

describe("FixedGasProvider", () => {
  let fixedGasProvider: FixedGasProvider;

  const FIXED_GAS_LIMIT = 1233n;

  beforeEach(() => {
    const networkConfig = createNetworkConfig({ gas: FIXED_GAS_LIMIT });

    fixedGasProvider = new FixedGasProvider(networkConfig);
  });

  it("should set the fixed gas if not present", async () => {
    const jsonRpcRequest = createJsonRpcRequest("eth_sendTransaction", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1,
      },
    ]);

    fixedGasProvider.modifyRequest(jsonRpcRequest);

    assertHardhatInvariant(
      Array.isArray(jsonRpcRequest.params),
      "params should be an array",
    );

    assert.equal(
      jsonRpcRequest.params[0].gas,
      numberToHexString(FIXED_GAS_LIMIT),
    );
  });

  it("shouldn't replace the provided gas", async () => {
    const jsonRpcRequest = createJsonRpcRequest("eth_sendTransaction", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1,
        gas: 1456,
      },
    ]);

    fixedGasProvider.modifyRequest(jsonRpcRequest);

    assertHardhatInvariant(
      Array.isArray(jsonRpcRequest.params),
      "params should be an array",
    );

    assert.equal(jsonRpcRequest.params[0].gas, 1456);
  });

  it("should forward the other calls and not modify the gas", async () => {
    const jsonRpcRequest = createJsonRpcRequest("eth_estimateGas", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1,
      },
    ]);

    fixedGasProvider.modifyRequest(jsonRpcRequest);

    assertHardhatInvariant(
      Array.isArray(jsonRpcRequest.params),
      "params should be an array",
    );

    assert.equal(jsonRpcRequest.params[0].gas, undefined);
  });
});
