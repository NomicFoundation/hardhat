import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { assertHardhatInvariant } from "@ignored/hardhat-vnext-errors";
import { numberToHexString } from "@ignored/hardhat-vnext-utils/hex";

import {
  AutomaticGasProvider,
  DEFAULT_GAS_MULTIPLIER,
} from "../../../../../../src/internal/builtin-plugins/network-manager/providers/gas-providers/automatic-gas-provider.js";
import { createJsonRpcRequest } from "../helpers.js";
import { EthereumMockedProvider } from "../mocked-provider.js";

describe("AutomaticGasProvider", () => {
  let automaticGasProvider: AutomaticGasProvider;
  let mockedProvider: EthereumMockedProvider;

  const FIXED_GAS_LIMIT = 1231;
  const GAS_MULTIPLIER = 1.337;

  beforeEach(() => {
    mockedProvider = new EthereumMockedProvider();

    mockedProvider.setReturnValue("eth_getBlockByNumber", {
      gasLimit: numberToHexString(FIXED_GAS_LIMIT * 1000),
    });

    mockedProvider.setReturnValue(
      "eth_estimateGas",
      numberToHexString(FIXED_GAS_LIMIT),
    );

    automaticGasProvider = new AutomaticGasProvider(
      mockedProvider,
      GAS_MULTIPLIER,
    );
  });

  it("should estimate gas automatically if not present", async () => {
    const jsonRpcRequest = createJsonRpcRequest("eth_sendTransaction", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1,
      },
    ]);

    await automaticGasProvider.modifyRequest(jsonRpcRequest);

    assertHardhatInvariant(
      Array.isArray(jsonRpcRequest.params),
      "params should be an array",
    );

    assert.equal(
      jsonRpcRequest.params[0].gas,
      numberToHexString(Math.floor(FIXED_GAS_LIMIT * GAS_MULTIPLIER)),
    );
  });

  it("should support different gas multipliers", async () => {
    const GAS_MULTIPLIER2 = 123;

    const jsonRpcRequest = createJsonRpcRequest("eth_sendTransaction", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1,
      },
    ]);

    automaticGasProvider = new AutomaticGasProvider(
      mockedProvider,
      GAS_MULTIPLIER2,
    );

    await automaticGasProvider.modifyRequest(jsonRpcRequest);

    assertHardhatInvariant(
      Array.isArray(jsonRpcRequest.params),
      "params should be an array",
    );

    assert.equal(
      jsonRpcRequest.params[0].gas,
      numberToHexString(Math.floor(FIXED_GAS_LIMIT * GAS_MULTIPLIER2)),
    );
  });

  it("should have a default multiplier", async () => {
    const jsonRpcRequest = createJsonRpcRequest("eth_sendTransaction", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1,
      },
    ]);

    automaticGasProvider = new AutomaticGasProvider(mockedProvider);

    await automaticGasProvider.modifyRequest(jsonRpcRequest);

    assertHardhatInvariant(
      Array.isArray(jsonRpcRequest.params),
      "params should be an array",
    );

    assert.equal(
      jsonRpcRequest.params[0].gas,
      numberToHexString(Math.floor(FIXED_GAS_LIMIT * DEFAULT_GAS_MULTIPLIER)),
    );
  });

  it("Shouldn't replace the provided gas", async () => {
    const jsonRpcRequest = createJsonRpcRequest("eth_sendTransaction", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1,
        gas: 567,
      },
    ]);

    await automaticGasProvider.modifyRequest(jsonRpcRequest);

    assertHardhatInvariant(
      Array.isArray(jsonRpcRequest.params),
      "params should be an array",
    );

    assert.equal(jsonRpcRequest.params[0].gas, 567);
  });

  it("should forward the other calls", async () => {
    const jsonRpcRequest = createJsonRpcRequest("eth_randomMethod", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1,
      },
    ]);

    await automaticGasProvider.modifyRequest(jsonRpcRequest);

    assertHardhatInvariant(
      Array.isArray(jsonRpcRequest.params),
      "params should be an array",
    );

    assert.equal(jsonRpcRequest.params[0].gas, undefined);
  });
});
