import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { numberToHexString } from "@nomicfoundation/hardhat-utils/hex";
import { isObject } from "@nomicfoundation/hardhat-utils/lang";

import {
  getJsonRpcRequest,
  getRequestParams,
} from "../../../../../../../src/internal/builtin-plugins/network-manager/json-rpc.js";
import {
  AutomaticGasHandler,
  DEFAULT_GAS_MULTIPLIER,
} from "../../../../../../../src/internal/builtin-plugins/network-manager/request-handlers/handlers/gas/automatic-gas-handler.js";
import { EthereumMockedProvider } from "../../ethereum-mocked-provider.js";

describe("AutomaticGasHandler", () => {
  let automaticGasHandler: AutomaticGasHandler;
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

    automaticGasHandler = new AutomaticGasHandler(
      mockedProvider,
      GAS_MULTIPLIER,
    );
  });

  it("should estimate gas automatically if not present", async () => {
    const jsonRpcRequest = getJsonRpcRequest(1, "eth_sendTransaction", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1,
      },
    ]);

    await automaticGasHandler.handle(jsonRpcRequest);
    const [tx] = getRequestParams(jsonRpcRequest);

    assert.ok(isObject(tx), "tx is not an object");
    assert.equal(
      tx.gas,
      numberToHexString(Math.floor(FIXED_GAS_LIMIT * GAS_MULTIPLIER)),
    );
  });

  it("should support different gas multipliers", async () => {
    const GAS_MULTIPLIER2 = 123;

    const jsonRpcRequest = getJsonRpcRequest(1, "eth_sendTransaction", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1,
      },
    ]);

    automaticGasHandler = new AutomaticGasHandler(
      mockedProvider,
      GAS_MULTIPLIER2,
    );

    await automaticGasHandler.handle(jsonRpcRequest);
    const [tx] = getRequestParams(jsonRpcRequest);

    assert.ok(isObject(tx), "tx is not an object");
    assert.equal(
      tx.gas,
      numberToHexString(Math.floor(FIXED_GAS_LIMIT * GAS_MULTIPLIER2)),
    );
  });

  it("should have a default multiplier", async () => {
    const jsonRpcRequest = getJsonRpcRequest(1, "eth_sendTransaction", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1,
      },
    ]);

    automaticGasHandler = new AutomaticGasHandler(mockedProvider);

    await automaticGasHandler.handle(jsonRpcRequest);
    const [tx] = getRequestParams(jsonRpcRequest);

    assert.ok(isObject(tx), "tx is not an object");
    assert.equal(
      tx.gas,
      numberToHexString(Math.floor(FIXED_GAS_LIMIT * DEFAULT_GAS_MULTIPLIER)),
    );
  });

  it("shouldn't replace the provided gas", async () => {
    const jsonRpcRequest = getJsonRpcRequest(1, "eth_sendTransaction", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1,
        gas: 567,
      },
    ]);

    await automaticGasHandler.handle(jsonRpcRequest);
    const [tx] = getRequestParams(jsonRpcRequest);

    assert.ok(isObject(tx), "tx is not an object");
    assert.equal(tx.gas, 567);
  });

  it("should forward the other calls", async () => {
    const jsonRpcRequest = getJsonRpcRequest(1, "eth_randomMethod", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1,
      },
    ]);

    await automaticGasHandler.handle(jsonRpcRequest);
    const [tx] = getRequestParams(jsonRpcRequest);

    assert.ok(isObject(tx), "tx is not an object");
    assert.equal(tx.gas, undefined);
  });
});
