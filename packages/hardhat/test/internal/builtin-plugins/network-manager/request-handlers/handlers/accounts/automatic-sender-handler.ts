import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { numberToHexString } from "@nomicfoundation/hardhat-utils/hex";
import { isObject } from "@nomicfoundation/hardhat-utils/lang";

import {
  getJsonRpcRequest,
  getRequestParams,
  isJsonRpcResponse,
  isFailedJsonRpcResponse,
} from "../../../../../../../src/internal/builtin-plugins/network-manager/json-rpc.js";
import { AutomaticSenderHandler } from "../../../../../../../src/internal/builtin-plugins/network-manager/request-handlers/handlers/accounts/automatic-sender-handler.js";
import { EthereumMockedProvider } from "../../ethereum-mocked-provider.js";

describe("AutomaticSenderHandler", function () {
  let automaticSenderHandler: AutomaticSenderHandler;
  let mockedProvider: EthereumMockedProvider;
  let tx: {
    from?: string;
    to: string;
    gas: string;
    gasPrice: string;
    value: string;
    nonce: string;
  };

  before(() => {
    mockedProvider = new EthereumMockedProvider();

    mockedProvider.setReturnValue("eth_accounts", [
      "0x123006d4548a3ac17d72b372ae1e416bf65b8eaf",
    ]);

    automaticSenderHandler = new AutomaticSenderHandler(mockedProvider);

    tx = {
      to: "0xb5bc06d4548a3ac17d72b372ae1e416bf65b8ead",
      gas: numberToHexString(21000),
      gasPrice: numberToHexString(678912),
      nonce: numberToHexString(0),
      value: numberToHexString(1),
    };
  });

  it("should set the from value into the transaction", async () => {
    const jsonRpcRequest = getJsonRpcRequest(1, "eth_sendTransaction", [tx]);

    await automaticSenderHandler.handle(jsonRpcRequest);

    const [requestTx] = getRequestParams(jsonRpcRequest);
    assert.ok(isObject(requestTx), "tx is not an object");
    assert.equal(requestTx.from, "0x123006d4548a3ac17d72b372ae1e416bf65b8eaf");
  });

  it("should not replace transaction's from", async () => {
    tx.from = "0x000006d4548a3ac17d72b372ae1e416bf65b8ead";

    const jsonRpcRequest = getJsonRpcRequest(1, "eth_sendTransaction", [tx]);

    const [requestTx] = getRequestParams(jsonRpcRequest);
    assert.ok(isObject(requestTx), "tx is not an object");
    assert.equal(requestTx.from, "0x000006d4548a3ac17d72b372ae1e416bf65b8ead");
  });

  it("should not fail on eth_calls if provider doesn't have any accounts", async () => {
    mockedProvider.setReturnValue("eth_accounts", []);

    tx.value = "asd";

    const jsonRpcRequest = getJsonRpcRequest(1, "eth_call", [tx]);

    await automaticSenderHandler.handle(jsonRpcRequest);

    const [requestTx] = getRequestParams(jsonRpcRequest);
    assert.ok(isObject(requestTx), "tx is not an object");
    assert.equal(requestTx.value, "asd");
  });

  it("should return a failed JSON-RPC response if eth_accounts returns a non-array", async () => {
    const badProvider = new EthereumMockedProvider();
    badProvider.setReturnValue("eth_accounts", "not-an-array");

    const handler = new AutomaticSenderHandler(badProvider);

    const jsonRpcRequest = getJsonRpcRequest(1, "eth_sendTransaction", [
      {
        to: "0xa5bc06d4548a3ac17d72b372ae1e416bf65b8eac",
        gas: numberToHexString(21000),
        gasPrice: numberToHexString(678912),
        nonce: numberToHexString(0),
        value: numberToHexString(1),
      },
    ]);

    const result = await handler.handle(jsonRpcRequest);

    assert.ok(
      isJsonRpcResponse(result),
      "expected a JSON-RPC response, not a request",
    );
    assert.ok(
      isFailedJsonRpcResponse(result),
      "expected a failed JSON-RPC response",
    );
    assert.equal(result.error.code, -32603, "error code should be Internal error (-32603)");
    assert.ok(
      result.error.message.includes("eth_accounts"),
      "error message should mention eth_accounts",
    );
  });
});
