import type { JsonRpcTransactionData } from "../../../../../../../src/internal/builtin-plugins/network-manager/request-handlers/handlers/accounts/types.js";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { numberToHexString } from "@ignored/hardhat-vnext-utils/hex";

import {
  getJsonRpcRequest,
  getRequestParams,
} from "../../../../../../../src/internal/builtin-plugins/network-manager/json-rpc.js";
import { AutomaticSenderHandler } from "../../../../../../../src/internal/builtin-plugins/network-manager/request-handlers/handlers/accounts/automatic-sender-handler.js";
import { EthereumMockedProvider } from "../../ethereum-mocked-provider.js";

describe("AutomaticSenderHandler", function () {
  let automaticSenderHandler: AutomaticSenderHandler;
  let mockedProvider: EthereumMockedProvider;
  let tx: JsonRpcTransactionData;

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

    assert.equal(
      getRequestParams(jsonRpcRequest)[0].from,
      "0x123006d4548a3ac17d72b372ae1e416bf65b8eaf",
    );
  });

  it("should not replace transaction's from", async () => {
    tx.from = "0x000006d4548a3ac17d72b372ae1e416bf65b8ead";

    const jsonRpcRequest = getJsonRpcRequest(1, "eth_sendTransaction", [tx]);

    assert.equal(
      getRequestParams(jsonRpcRequest)[0].from,
      "0x000006d4548a3ac17d72b372ae1e416bf65b8ead",
    );
  });

  it("should not fail on eth_calls if provider doesn't have any accounts", async () => {
    mockedProvider.setReturnValue("eth_accounts", []);

    tx.value = "asd";

    const jsonRpcRequest = getJsonRpcRequest(1, "eth_call", [tx]);

    await automaticSenderHandler.handle(jsonRpcRequest);

    assert.equal(getRequestParams(jsonRpcRequest)[0].value, "asd");
  });
});
