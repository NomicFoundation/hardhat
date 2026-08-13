import type { EdrNetworkConfig } from "../../../../../src/types/config.js";
import type { NetworkConnection } from "../../../../../src/types/network.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { numberToHexString } from "@nomicfoundation/hardhat-utils/hex";
import { isObject } from "@nomicfoundation/hardhat-utils/lang";

import { L1HardforkName } from "../../../../../src/internal/builtin-plugins/network-manager/edr/types/hardfork.js";
import {
  getJsonRpcRequest,
  getRequestParams,
} from "../../../../../src/internal/builtin-plugins/network-manager/json-rpc.js";
import { InternalCallOutOfGasError } from "../../../../../src/internal/builtin-plugins/network-manager/provider-errors.js";
import { AutomaticGasHandler } from "../../../../../src/internal/builtin-plugins/network-manager/request-handlers/handlers/gas/automatic-gas-handler.js";
import { createHandlersArray } from "../../../../../src/internal/builtin-plugins/network-manager/request-handlers/handlers-array.js";

import { EthereumMockedProvider } from "./ethereum-mocked-provider.js";

describe("createHandlersArray", () => {
  const BLOCK_GAS_LIMIT = 60_000_000;

  function makeEdrConnection(
    configOverrides: Partial<EdrNetworkConfig> = {},
  ): NetworkConnection<"l1"> {
    const provider = new EthereumMockedProvider();

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
      ...configOverrides,
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
    shouldEnableCoverage: boolean,
    configOverrides: Partial<EdrNetworkConfig> = {},
  ): Promise<unknown> {
    const connection = makeEdrConnection(configOverrides);
    const handlers = await createHandlersArray(
      connection,
      shouldEnableCoverage,
    );

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

  it("uses the network's default transaction gas limit as the automatic gas fallback", async () => {
    // An explicit transactionGasCap below the EIP-7825 cap: the expected
    // value differs from the handler's no-fallback default (the EIP-7825
    // cap), so this test fails if the fallback isn't wired at all
    const USER_TX_GAS_CAP = 5_000_000n;

    assert.equal(
      await getAutomaticGasFallback(false, {
        transactionGasCap: USER_TX_GAS_CAP,
      }),
      numberToHexString(USER_TX_GAS_CAP),
    );
  });

  it("applies the coverage network overrides to the automatic gas fallback", async () => {
    // Under coverage, blockGasLimit and transactionGasCap default to false,
    // so the provider's default transaction gas limit is the default block
    // gas limit; the fallback must match it
    assert.equal(
      await getAutomaticGasFallback(true),
      numberToHexString(60_000_000n),
    );
  });
});
