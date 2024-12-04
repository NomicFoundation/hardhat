import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { numberToHexString } from "@ignored/hardhat-vnext-utils/hex";

import { getJsonRpcRequest } from "../../../../../../../src/internal/builtin-plugins/network-manager/json-rpc.js";
import { createMockedNetworkHre } from "../../hooks-mock.js";

// Test that the request and its additional sub-request (when present)
// are correctly modified in the "onRequest" hook handler.
// These tests simulate a real scenario where the user calls "await connection.provider.request(jsonRpcRequest)".
describe("e2e - FixedSender", () => {
  it("should set the from value into the transaction", async () => {
    const hre = await createMockedNetworkHre({
      networks: {
        hardhat: {
          type: "edr",
          from: "0x2a97a65d5673a2c61e95ce33cecadf24f654f96d",
        },
      },
    });

    const connection = await hre.network.connect();

    const tx = {
      to: "0xb5bc06d4548a3ac17d72b372ae1e416bf65b8ead",
      gas: numberToHexString(21000),
      gasPrice: numberToHexString(678912),
      nonce: numberToHexString(0),
      value: numberToHexString(1),
    };

    const jsonRpcRequest = getJsonRpcRequest(1, "eth_sendTransaction", [tx]);

    const res = await connection.provider.request(jsonRpcRequest);

    assert.ok(Array.isArray(res), "res should be an array");

    assert.equal(res[0].from, "0x2a97a65d5673a2c61e95ce33cecadf24f654f96d");
  });
});
