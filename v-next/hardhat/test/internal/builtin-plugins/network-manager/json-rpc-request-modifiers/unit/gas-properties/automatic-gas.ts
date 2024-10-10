import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { numberToHexString } from "@ignored/hardhat-vnext-utils/hex";

import {
  AutomaticGas,
  DEFAULT_GAS_MULTIPLIER,
} from "../../../../../../../src/internal/builtin-plugins/network-manager/json-rpc-request-modifiers/gas-properties/automatic-gas.js";
import { EthereumMockedProvider } from "../../ethereum-mocked-provider.js";
import { createJsonRpcRequest, getParams } from "../../helpers.js";

describe("AutomaticGas", () => {
  let automaticGas: AutomaticGas;
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

    automaticGas = new AutomaticGas(mockedProvider, GAS_MULTIPLIER);
  });

  it("should estimate gas automatically if not present", async () => {
    const jsonRpcRequest = createJsonRpcRequest("eth_sendTransaction", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1,
      },
    ]);

    await automaticGas.modifyRequest(jsonRpcRequest);

    assert.equal(
      getParams(jsonRpcRequest)[0].gas,
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

    automaticGas = new AutomaticGas(mockedProvider, GAS_MULTIPLIER2);

    await automaticGas.modifyRequest(jsonRpcRequest);

    assert.equal(
      getParams(jsonRpcRequest)[0].gas,
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

    automaticGas = new AutomaticGas(mockedProvider);

    await automaticGas.modifyRequest(jsonRpcRequest);

    assert.equal(
      getParams(jsonRpcRequest)[0].gas,
      numberToHexString(Math.floor(FIXED_GAS_LIMIT * DEFAULT_GAS_MULTIPLIER)),
    );
  });

  it("shouldn't replace the provided gas", async () => {
    const jsonRpcRequest = createJsonRpcRequest("eth_sendTransaction", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1,
        gas: 567,
      },
    ]);

    await automaticGas.modifyRequest(jsonRpcRequest);

    assert.equal(getParams(jsonRpcRequest)[0].gas, 567);
  });

  it("should forward the other calls", async () => {
    const jsonRpcRequest = createJsonRpcRequest("eth_randomMethod", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1,
      },
    ]);

    await automaticGas.modifyRequest(jsonRpcRequest);

    assert.equal(getParams(jsonRpcRequest)[0].gas, undefined);
  });
});
