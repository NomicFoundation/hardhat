import type { NetworkConnection } from "../../../../../../../src/types/network.js";

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import {
  hexStringToBytes,
  numberToHexString,
} from "@ignored/hardhat-vnext-utils/hex";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { addr } from "micro-eth-signer";

import { getJsonRpcRequest } from "../../../../../../../src/internal/builtin-plugins/network-manager/json-rpc.js";
import { createMockedNetworkHre } from "../../hooks-mock.js";

const MOCK_PROVIDER_CHAIN_ID = 31337;

// Test that the request and its additional sub-request (when present)
// are correctly modified or resolved in the "onRequest" hook handler.
// These tests simulate a real scenario where the user calls "await connection.provider.request(jsonRpcRequest)".
describe("e2e - LocalAccounts", () => {
  let connection: NetworkConnection;

  const accounts = [
    "0xb2e31025a2474b37e4c2d2931929a00b5752b98a3af45e3fd9a62ddc3cdf370e",
    "0x6d7229c1db5892730b84b4bc10543733b72cabf4cd3130d910faa8e459bb8eca",
    "0x6d4ec871d9b5469119bbfc891e958b6220d076a6849006098c370c8af5fc7776",
    "0xec02c2b7019e75378a05018adc30a0252ba705670acb383a1d332e57b0b792d2",
  ];

  beforeEach(async () => {
    const hre = await createMockedNetworkHre({
      net_version: numberToHexString(MOCK_PROVIDER_CHAIN_ID),
      eth_getTransactionCount: numberToHexString(0x8),
      eth_accounts: [],
    });

    connection = await hre.network.connect();
    connection.networkConfig.type = "http";
    connection.networkConfig.accounts = accounts;
  });

  it("should return the account addresses in eth_accounts", async () => {
    const jsonRpcRequest = getJsonRpcRequest(1, "eth_accounts");

    const res = await connection.provider.request(jsonRpcRequest);

    assert.ok(Array.isArray(res), "res should be an array");

    assert.equal(res[0], addr.fromPrivateKey(accounts[0]).toLowerCase());
    assert.equal(res[1], addr.fromPrivateKey(accounts[1]).toLowerCase());
  });

  it("should send eip1559 txs if the eip1559 fields are present", async () => {
    const tx = {
      from: "0xb5bc06d4548a3ac17d72b372ae1e416bf65b8ead",
      to: "0xb5bc06d4548a3ac17d72b372ae1e416bf65b8ead",
      gas: numberToHexString(30000),
      nonce: numberToHexString(0),
      value: numberToHexString(1),
      chainId: numberToHexString(MOCK_PROVIDER_CHAIN_ID),
      maxFeePerGas: numberToHexString(12),
      maxPriorityFeePerGas: numberToHexString(2),
    };

    const jsonRpcRequest = getJsonRpcRequest(1, "eth_sendTransaction", [tx]);

    const res = await connection.provider.request(jsonRpcRequest);

    assert.ok(Array.isArray(res), "params should be an array");

    const rawTransaction = hexStringToBytes(res[0]);

    // The tx type is encoded in the first byte, and it must be the EIP-1559 one
    assert.equal(rawTransaction[0], 2);
  });

  it("should throw if trying to send from an account that isn't local", async () => {
    const jsonRpcRequest = getJsonRpcRequest(1, "eth_sendTransaction", [
      {
        from: "0x000006d4548a3ac17d72b372ae1e416bf65b8ead",
        to: "0xb5bc06d4548a3ac17d72b372ae1e416bf65b8ead",
        gas: numberToHexString(21000),
        gasPrice: numberToHexString(678912),
        nonce: numberToHexString(0),
        value: numberToHexString(1),
      },
    ]);

    await assertRejectsWithHardhatError(
      () => connection.provider.request(jsonRpcRequest),
      HardhatError.ERRORS.NETWORK.NOT_LOCAL_ACCOUNT,
      { account: "0x000006d4548a3ac17d72b372ae1e416bf65b8ead" },
    );
  });

  it("should not modify the json rpc request for other methods", async () => {
    const input = [1, 2];
    const jsonRpcRequest = getJsonRpcRequest(1, "eth_sarasa", input);

    const res = await connection.provider.request(jsonRpcRequest);

    assert.deepEqual(res, jsonRpcRequest.params);
  });

  it("should not modify the json rpc request if no address is given", async () => {
    const jsonRpcRequest = getJsonRpcRequest(1, "eth_sign");

    const res = await connection.provider.request(jsonRpcRequest);

    assert.deepEqual(res, jsonRpcRequest.params);
  });

  it("should not modify the json rpc request if the address isn't one of the local ones", async () => {
    const jsonRpcRequest = getJsonRpcRequest(1, "eth_signTypedData_v4", [
      "0x000006d4548a3ac17d72b372ae1e416bf65b8ead",
      {},
    ]);

    const res = await connection.provider.request(jsonRpcRequest);

    assert.deepEqual(res, jsonRpcRequest.params);
  });
});
