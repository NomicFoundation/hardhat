import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@ignored/hardhat-vnext-errors";
import { assertThrowsHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { HDWallet } from "../../../../../../../src/internal/builtin-plugins/network-manager/json-rpc-request-modifiers/accounts/hd-wallet.js";
import { getJsonRpcRequest } from "../../../../../../../src/internal/builtin-plugins/network-manager/json-rpc.js";
import { EthereumMockedProvider } from "../../ethereum-mocked-provider.js";

describe("HDWallet", () => {
  let hdWallet: HDWallet;
  let mockedProvider: EthereumMockedProvider;

  const mnemonic =
    "couch hunt wisdom giant regret supreme issue sing enroll ankle type husband";
  const hdpath = "m/44'/60'/0'/0/";

  beforeEach(() => {
    mockedProvider = new EthereumMockedProvider();

    hdWallet = new HDWallet(mockedProvider, mnemonic, hdpath);
  });

  it("should generate a valid address", async () => {
    const jsonRpcRequest = getJsonRpcRequest(1, "eth_accounts");

    const res = await hdWallet.resolveRequest(jsonRpcRequest);

    assertHardhatInvariant(Array.isArray(res), "res should be an array");

    assert.equal(res[0], "0x4f3e91d2cacd82fffd1f33a0d26d4078401986e9");
  });

  it("should generate a valid address with passphrase", async () => {
    const passphrase = "this is a secret";

    hdWallet = new HDWallet(
      mockedProvider,
      mnemonic,
      hdpath,
      0,
      10,
      passphrase,
    );

    const jsonRpcRequest = getJsonRpcRequest(1, "eth_accounts");

    const res = await hdWallet.resolveRequest(jsonRpcRequest);

    assertHardhatInvariant(Array.isArray(res), "res should be an array");

    assert.equal(res[0], "0x6955b833d195e49c07fc56fbf0ec387325facb87");
  });

  it("should generate a valid address when given a different index", async () => {
    hdWallet = new HDWallet(mockedProvider, mnemonic, hdpath, 1);

    const jsonRpcRequest = getJsonRpcRequest(1, "eth_accounts");

    const res = await hdWallet.resolveRequest(jsonRpcRequest);

    assertHardhatInvariant(Array.isArray(res), "res should be an array");

    assert.equal(res[0], "0x2a97a65d5673a2c61e95ce33cecadf24f654f96d");
  });

  it("should generate 2 accounts", async () => {
    hdWallet = new HDWallet(mockedProvider, mnemonic, hdpath, 0, 2);

    const jsonRpcRequest = getJsonRpcRequest(1, "eth_accounts");

    const res = await hdWallet.resolveRequest(jsonRpcRequest);

    assertHardhatInvariant(Array.isArray(res), "res should be an array");

    assert.deepEqual(res, [
      "0x4f3e91d2cacd82fffd1f33a0d26d4078401986e9",
      "0x2a97a65d5673a2c61e95ce33cecadf24f654f96d",
    ]);
  });

  describe("HDPath formatting", () => {
    it("Should work if it doesn't end in a /", async () => {
      hdWallet = new HDWallet(mockedProvider, mnemonic, "m/44'/60'/0'/0");

      const jsonRpcRequest = getJsonRpcRequest(1, "eth_accounts");

      const res = await hdWallet.resolveRequest(jsonRpcRequest);

      assertHardhatInvariant(Array.isArray(res), "res should be an array");

      assert.equal(res[0], "0x4f3e91d2cacd82fffd1f33a0d26d4078401986e9");
    });

    it("Should throw if the path is invalid", () => {
      assertThrowsHardhatError(
        () => new HDWallet(mockedProvider, mnemonic, ""),
        HardhatError.ERRORS.NETWORK.INVALID_HD_PATH,
        { path: "" },
      );

      assertThrowsHardhatError(
        () => new HDWallet(mockedProvider, mnemonic, "m/"),
        HardhatError.ERRORS.NETWORK.INVALID_HD_PATH,
        { path: "m/" },
      );

      assertThrowsHardhatError(
        () => new HDWallet(mockedProvider, mnemonic, "m//"),
        HardhatError.ERRORS.NETWORK.INVALID_HD_PATH,
        { path: "m//" },
      );

      assertThrowsHardhatError(
        () => new HDWallet(mockedProvider, mnemonic, "m/'"),
        HardhatError.ERRORS.NETWORK.INVALID_HD_PATH,
        { path: "m/'" },
      );

      assertThrowsHardhatError(
        () => new HDWallet(mockedProvider, mnemonic, "m/0''"),
        HardhatError.ERRORS.NETWORK.INVALID_HD_PATH,
        { path: "m/0''" },
      );

      assertThrowsHardhatError(
        () => new HDWallet(mockedProvider, mnemonic, "ghj"),
        HardhatError.ERRORS.NETWORK.INVALID_HD_PATH,
        { path: "ghj" },
      );
    });
  });
});
