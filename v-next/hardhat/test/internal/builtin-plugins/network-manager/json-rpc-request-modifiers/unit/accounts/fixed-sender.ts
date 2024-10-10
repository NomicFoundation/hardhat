import type { JsonRpcTransactionData } from "../../../../../../../src/internal/builtin-plugins/network-manager/json-rpc-request-modifiers/accounts/types.js";
import type { EthereumProvider } from "../../../../../../../src/types/providers.js";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { numberToHexString } from "@ignored/hardhat-vnext-utils/hex";

import { FixedSender } from "../../../../../../../src/internal/builtin-plugins/network-manager/json-rpc-request-modifiers/accounts/fixed-sender-provider.js";
import { createJsonRpcRequest, getParams } from "../../helpers.js";

describe("FixedSender", function () {
  let fixedSender: FixedSender;
  let tx: JsonRpcTransactionData;

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- |TODO
  const provider = {} as EthereumProvider;

  before(() => {
    fixedSender = new FixedSender(
      provider,
      "0x2a97a65d5673a2c61e95ce33cecadf24f654f96d",
    );

    tx = {
      to: "0xb5bc06d4548a3ac17d72b372ae1e416bf65b8ead",
      gas: numberToHexString(21000),
      gasPrice: numberToHexString(678912),
      nonce: numberToHexString(0),
      value: numberToHexString(1),
    };
  });

  it("should set the from value into the transaction", async () => {
    const jsonRpcRequest = createJsonRpcRequest("eth_sendTransaction", [tx]);

    await fixedSender.modifyRequest(jsonRpcRequest);

    assert.equal(
      getParams(jsonRpcRequest)[0].from,
      "0x2a97a65d5673a2c61e95ce33cecadf24f654f96d",
    );
  });

  it("should not replace transaction's from", async () => {
    tx.from = "0x000006d4548a3ac17d72b372ae1e416bf65b8ead";

    const jsonRpcRequest = createJsonRpcRequest("eth_sendTransaction", [tx]);

    await fixedSender.modifyRequest(jsonRpcRequest);

    assert.equal(
      getParams(jsonRpcRequest)[0].from,
      "0x000006d4548a3ac17d72b372ae1e416bf65b8ead",
    );
  });
});
