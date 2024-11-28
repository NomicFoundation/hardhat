import type { JsonRpcResponse } from "../../../../../../../src/types/providers.js";

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { assertThrowsHardhatError } from "@nomicfoundation/hardhat-test-utils";

import {
  getJsonRpcRequest,
  isJsonRpcResponse,
} from "../../../../../../../src/internal/builtin-plugins/network-manager/json-rpc.js";
import { HDWalletHandler } from "../../../../../../../src/internal/builtin-plugins/network-manager/request-handlers/handlers/accounts/hd-wallet-handler.js";
import { EthereumMockedProvider } from "../../ethereum-mocked-provider.js";

function getResult(res: JsonRpcResponse | null): string[] {
  assert.ok(res !== null, "res should not be null");
  assert.ok("result" in res, "res should have the property 'result'");
  assert.ok(Array.isArray(res.result), "res.result should be an array");

  return res.result;
}

describe("HDWalletHandler", () => {
  let hdWalletHandler: HDWalletHandler;
  let mockedProvider: EthereumMockedProvider;

  const mnemonic =
    "couch hunt wisdom giant regret supreme issue sing enroll ankle type husband";
  const hdpath = "m/44'/60'/0'/0/";

  beforeEach(() => {
    mockedProvider = new EthereumMockedProvider();

    hdWalletHandler = new HDWalletHandler(mockedProvider, mnemonic, hdpath);
  });

  it("should generate a valid address", async () => {
    const jsonRpcRequest = getJsonRpcRequest(1, "eth_accounts");

    const res = await hdWalletHandler.handle(jsonRpcRequest);

    assert.ok(isJsonRpcResponse(res), "Expected a JSON-RPC response");

    const result = getResult(res);

    assert.equal(result[0], "0x4f3e91d2cacd82fffd1f33a0d26d4078401986e9");
  });

  it("should generate a valid address with passphrase", async () => {
    const passphrase = "this is a secret";

    hdWalletHandler = new HDWalletHandler(
      mockedProvider,
      mnemonic,
      hdpath,
      0,
      10,
      passphrase,
    );

    const jsonRpcRequest = getJsonRpcRequest(1, "eth_accounts");

    const res = await hdWalletHandler.handle(jsonRpcRequest);

    assert.ok(isJsonRpcResponse(res), "Expected a JSON-RPC response");

    const result = getResult(res);

    assert.equal(result[0], "0x6955b833d195e49c07fc56fbf0ec387325facb87");
  });

  it("should generate a valid address when given a different index", async () => {
    hdWalletHandler = new HDWalletHandler(mockedProvider, mnemonic, hdpath, 1);

    const jsonRpcRequest = getJsonRpcRequest(1, "eth_accounts");

    const res = await hdWalletHandler.handle(jsonRpcRequest);

    assert.ok(isJsonRpcResponse(res), "Expected a JSON-RPC response");

    const result = getResult(res);

    assert.equal(result[0], "0x2a97a65d5673a2c61e95ce33cecadf24f654f96d");
  });

  it("should generate 2 accounts", async () => {
    hdWalletHandler = new HDWalletHandler(
      mockedProvider,
      mnemonic,
      hdpath,
      0,
      2,
    );

    const jsonRpcRequest = getJsonRpcRequest(1, "eth_accounts");

    const res = await hdWalletHandler.handle(jsonRpcRequest);

    assert.ok(isJsonRpcResponse(res), "Expected a JSON-RPC response");

    const result = getResult(res);

    assert.deepEqual(result, [
      "0x4f3e91d2cacd82fffd1f33a0d26d4078401986e9",
      "0x2a97a65d5673a2c61e95ce33cecadf24f654f96d",
    ]);
  });

  describe("HDPath formatting", () => {
    it("should work if it doesn't end in a /", async () => {
      hdWalletHandler = new HDWalletHandler(
        mockedProvider,
        mnemonic,
        "m/44'/60'/0'/0",
      );

      const jsonRpcRequest = getJsonRpcRequest(1, "eth_accounts");

      const res = await hdWalletHandler.handle(jsonRpcRequest);

      assert.ok(isJsonRpcResponse(res), "Expected a JSON-RPC response");

      const result = getResult(res);

      assert.equal(result[0], "0x4f3e91d2cacd82fffd1f33a0d26d4078401986e9");
    });

    it("should throw if the path is invalid", () => {
      assertThrowsHardhatError(
        () => new HDWalletHandler(mockedProvider, mnemonic, ""),
        HardhatError.ERRORS.NETWORK.INVALID_HD_PATH,
        { path: "" },
      );

      assertThrowsHardhatError(
        () => new HDWalletHandler(mockedProvider, mnemonic, "m/"),
        HardhatError.ERRORS.NETWORK.INVALID_HD_PATH,
        { path: "m/" },
      );

      assertThrowsHardhatError(
        () => new HDWalletHandler(mockedProvider, mnemonic, "m//"),
        HardhatError.ERRORS.NETWORK.INVALID_HD_PATH,
        { path: "m//" },
      );

      assertThrowsHardhatError(
        () => new HDWalletHandler(mockedProvider, mnemonic, "m/'"),
        HardhatError.ERRORS.NETWORK.INVALID_HD_PATH,
        { path: "m/'" },
      );

      assertThrowsHardhatError(
        () => new HDWalletHandler(mockedProvider, mnemonic, "m/0''"),
        HardhatError.ERRORS.NETWORK.INVALID_HD_PATH,
        { path: "m/0''" },
      );

      assertThrowsHardhatError(
        () => new HDWalletHandler(mockedProvider, mnemonic, "ghj"),
        HardhatError.ERRORS.NETWORK.INVALID_HD_PATH,
        { path: "ghj" },
      );
    });
  });
});
