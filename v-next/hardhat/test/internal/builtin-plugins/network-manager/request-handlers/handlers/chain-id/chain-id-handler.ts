import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import {
  assertRejects,
  assertRejectsWithHardhatError,
} from "@nomicfoundation/hardhat-test-utils";

import { getJsonRpcRequest } from "../../../../../../../src/internal/builtin-plugins/network-manager/json-rpc.js";
import { ChainIdValidatorHandler } from "../../../../../../../src/internal/builtin-plugins/network-manager/request-handlers/handlers/chain-id/chain-id-handler.js";
import { EthereumMockedProvider } from "../../ethereum-mocked-provider.js";

describe("ChainIdValidatorHandler", () => {
  let mockedProvider: EthereumMockedProvider;

  const jsonRpcRequest = getJsonRpcRequest(1, "eth_sendTransaction", [
    {
      from: "0x0000000000000000000000000000000000000011",
      to: "0x0000000000000000000000000000000000000011",
    },
  ]);

  beforeEach(() => {
    mockedProvider = new EthereumMockedProvider();
  });

  it("should fail when the configured chain id does not match the real chain id", async () => {
    mockedProvider.setReturnValue("eth_chainId", () => "0x1");

    const chainIdValidatorHandler = new ChainIdValidatorHandler(
      mockedProvider,
      123,
    );

    await assertRejectsWithHardhatError(
      chainIdValidatorHandler.handle(jsonRpcRequest),
      HardhatError.ERRORS.NETWORK.INVALID_GLOBAL_CHAIN_ID,
      {
        configChainId: 123,
        connectionChainId: 1,
      },
    );
  });

  it("should call the provider only once", async () => {
    mockedProvider.setReturnValue("eth_chainId", () => "0x1");

    const chainIdValidatorHandler = new ChainIdValidatorHandler(
      mockedProvider,
      1,
    );

    await chainIdValidatorHandler.handle(jsonRpcRequest);
    await chainIdValidatorHandler.handle(jsonRpcRequest);

    assert.equal(mockedProvider.getTotalNumberOfCalls(), 1);
  });

  it("should use eth_chainId if supported", async () => {
    mockedProvider.setReturnValue("eth_chainId", "0x1");
    mockedProvider.setReturnValue("net_version", "0x2");

    const chainIdValidatorHandler = new ChainIdValidatorHandler(
      mockedProvider,
      1,
    );

    await chainIdValidatorHandler.handle(jsonRpcRequest);

    // It should not fail because the chain id is the same as the one returned by eth_chainId
  });

  it("should use net_version if eth_chainId is not supported", async () => {
    mockedProvider.setReturnValue("eth_chainId", () => {
      throw new Error("Unsupported method");
    });
    mockedProvider.setReturnValue("net_version", "0x2");

    const chainIdValidatorHandler = new ChainIdValidatorHandler(
      mockedProvider,
      2,
    );

    await chainIdValidatorHandler.handle(jsonRpcRequest);

    // It should not fail because the chain id is the same as the one returned by net_version
  });

  it("should throw if both eth_chainId and net_version fail", async () => {
    mockedProvider.setReturnValue("eth_chainId", () => {
      throw new Error("Unsupported method");
    });

    mockedProvider.setReturnValue("net_version", () => {
      throw new Error("Unsupported method");
    });

    const chainIdValidatorHandler = new ChainIdValidatorHandler(
      mockedProvider,
      1,
    );

    await assertRejects(() => chainIdValidatorHandler.handle(jsonRpcRequest));
  });
});
