import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { ChainIdValidator } from "../../../../../../src/internal/builtin-plugins/network-manager/json-request-modifiers/chain-id/chain-id.js";
import { EthereumMockedProvider } from "../ethereum-mocked-provider.js";

describe("ChainIdValidator", () => {
  let mockedProvider: EthereumMockedProvider;

  beforeEach(() => {
    mockedProvider = new EthereumMockedProvider();
  });

  it("should fail when the configured chain id does not match the real chain id", async () => {
    mockedProvider.setReturnValue("eth_chainId", () => "0x1");

    const chainIdValidatorProvider = new ChainIdValidator(mockedProvider, 666);

    await assertRejectsWithHardhatError(
      chainIdValidatorProvider.validate(),
      HardhatError.ERRORS.NETWORK.INVALID_GLOBAL_CHAIN_ID,
      {
        configChainId: 666,
        connectionChainId: 1,
      },
    );
  });

  it("should call the provider only once", async () => {
    mockedProvider.setReturnValue("eth_chainId", () => "0x1");

    const chainIdValidatorProvider = new ChainIdValidator(mockedProvider, 1);

    await chainIdValidatorProvider.validate();
    await chainIdValidatorProvider.validate();

    assert.equal(mockedProvider.getTotalNumberOfCalls(), 1);
  });

  it("should use eth_chainId if supported", async () => {
    mockedProvider.setReturnValue("eth_chainId", "0x1");
    mockedProvider.setReturnValue("net_version", "0x2");

    const chainIdValidatorProvider = new ChainIdValidator(mockedProvider, 1);

    await chainIdValidatorProvider.validate();

    // It should not fail because the chain id is the same as the one returned by eth_chainId
  });

  it("should use net_version if eth_chainId is not supported", async () => {
    mockedProvider.setReturnValue("eth_chainId", () => {
      throw new Error("Unsupported method");
    });
    mockedProvider.setReturnValue("net_version", "0x2");

    const chainIdValidatorProvider = new ChainIdValidator(mockedProvider, 2);

    await chainIdValidatorProvider.validate();

    // It should not fail because the chain id is the same as the one returned by net_version
  });

  it("should throw if both eth_chainId and net_version fail", async () => {
    mockedProvider.setReturnValue("eth_chainId", () => {
      throw new Error("Unsupported method");
    });

    mockedProvider.setReturnValue("net_version", () => {
      throw new Error("Unsupported method");
    });

    const chainIdValidatorProvider = new ChainIdValidator(mockedProvider, 1);

    // eslint-disable-next-line no-restricted-syntax -- a non hardhat error is expected
    await assert.rejects(() => chainIdValidatorProvider.validate());
  });
});
