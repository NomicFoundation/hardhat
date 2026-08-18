import type { EdrNetworkConfig } from "../../../../../src/types/config.js";
import type { NetworkConnection } from "../../../../../src/types/network.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { numberToHexString } from "@nomicfoundation/hardhat-utils/hex";
import { isObject } from "@nomicfoundation/hardhat-utils/lang";

import { EIP_7825_TRANSACTION_GAS_CAP } from "../../../../../src/internal/builtin-plugins/network-manager/edr/edr-constants.js";
import { L1HardforkName } from "../../../../../src/internal/builtin-plugins/network-manager/edr/types/hardfork.js";
import {
  getJsonRpcRequest,
  getRequestParams,
} from "../../../../../src/internal/builtin-plugins/network-manager/json-rpc.js";
import { InternalCallOutOfGasError } from "../../../../../src/internal/builtin-plugins/network-manager/provider-errors.js";
import { AutomaticGasHandler } from "../../../../../src/internal/builtin-plugins/network-manager/request-handlers/handlers/gas/automatic-gas-handler.js";
import { createHandlersArray } from "../../../../../src/internal/builtin-plugins/network-manager/request-handlers/handlers-array.js";

import { EthereumMockedProvider } from "./ethereum-mocked-provider.js";

// Mimics the shape of EdrProvider, which exposes the default transaction gas
// limit it was configured with.
class MockedProviderWithDefaultTransactionGasLimit extends EthereumMockedProvider {
  public readonly defaultTransactionGasLimit: bigint;

  constructor(defaultTransactionGasLimit: bigint) {
    super();
    this.defaultTransactionGasLimit = defaultTransactionGasLimit;
  }
}

describe("createHandlersArray", () => {
  const BLOCK_GAS_LIMIT = 60_000_000;

  function makeEdrConnection(
    provider: EthereumMockedProvider,
  ): NetworkConnection<"l1"> {
    provider.setReturnValue("eth_getBlockByNumber", {
      gasLimit: numberToHexString(BLOCK_GAS_LIMIT),
    });

    provider.setReturnValue("eth_estimateGas", () => {
      throw new InternalCallOutOfGasError();
    });

    const networkConfig: EdrNetworkConfig = {
      type: "edr-simulated",
      accounts: [],
      chainId: 31337,
      chainType: "l1",
      gas: "auto",
      gasMultiplier: 1,
      gasPrice: "auto",
      allowBlocksWithSameTimestamp: false,
      coinbase: new Uint8Array(20),
      gasEstimationMode: "noInternalOutOfGas",
      hardfork: L1HardforkName.OSAKA,
      initialDate: new Date(),
      loggingEnabled: false,
      minGasPrice: 0n,
      mining: { auto: true, interval: 0, mempool: { order: "priority" } },
      networkId: 31337,
      throwOnCallFailures: true,
      throwOnTransactionFailures: true,
    };

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
    only the fields used by createHandlersArray and the gas handlers are
    needed in this test */
    return {
      chainType: "l1",
      networkConfig,
      provider,
    } as unknown as NetworkConnection<"l1">;
  }

  async function getAutomaticGasFallback(
    provider: EthereumMockedProvider,
  ): Promise<unknown> {
    const connection = makeEdrConnection(provider);
    const handlers = await createHandlersArray(connection);

    const automaticGasHandler = handlers.find(
      (handler): handler is AutomaticGasHandler =>
        handler instanceof AutomaticGasHandler,
    );
    assert.ok(
      automaticGasHandler !== undefined,
      "An AutomaticGasHandler should be created for gas: 'auto'",
    );

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

    return tx.gas;
  }

  it("uses the provider's default transaction gas limit as the automatic gas fallback", async () => {
    // A value below the EIP-7825 cap: the expected value differs from the
    // handler's no-fallback default (the EIP-7825 cap), so this test fails
    // if the fallback isn't wired at all
    const DEFAULT_TRANSACTION_GAS_LIMIT = 5_000_000n;

    assert.equal(
      await getAutomaticGasFallback(
        new MockedProviderWithDefaultTransactionGasLimit(
          DEFAULT_TRANSACTION_GAS_LIMIT,
        ),
      ),
      numberToHexString(DEFAULT_TRANSACTION_GAS_LIMIT),
    );
  });

  it("falls back to the EIP-7825 cap when the provider doesn't expose a default transaction gas limit", async () => {
    // E.g. an http connection to a `hardhat node` server: the remote
    // provider's configured default isn't observable, so the handler
    // applies the EIP-7825 cap
    assert.equal(
      await getAutomaticGasFallback(new EthereumMockedProvider()),
      numberToHexString(EIP_7825_TRANSACTION_GAS_CAP),
    );
  });
});
