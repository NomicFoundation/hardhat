import type * as EdrContextModule from "../../../src/internal/edr/context.js";
import type { EdrNetworkConfig } from "../../../src/types/config.js";
import type { RequireField } from "../../../src/types/utils.js";

import { describe, it } from "node:test";

import { ContractDecoder, L1_CHAIN_TYPE } from "@nomicfoundation/edr";

import { getProviderConfig } from "../../../src/internal/builtin-plugins/network-manager/edr/edr-provider.js";

const networkConfigStub: RequireField<EdrNetworkConfig, "chainType"> = {
  type: "edr-simulated",
  chainType: "l1",
  accounts: [],
  allowBlocksWithSameTimestamp: true,
  allowUnlimitedContractSize: true,
  blockGasLimit: 60_000_000n,
  chainId: 31337,
  coinbase: Buffer.from("0000000000000000000000000000000000000000", "hex"),
  gas: "auto",
  gasMultiplier: 1,
  gasPrice: "auto",
  hardfork: "osaka",
  initialDate: new Date(),
  loggingEnabled: false,
  minGasPrice: 0n,
  mining: { auto: true, interval: 0, mempool: { order: "fifo" } },
  networkId: 31337,
  throwOnCallFailures: true,
  throwOnTransactionFailures: true,
  forking: undefined,
};

const noopLoggerConfig = {
  enable: false,
  decodeConsoleLogInputsCallback: () => [],
  printLineCallback: () => {},
};

const noopSubscriptionConfig = {
  subscriptionCallback: () => {},
};

describe("getGlobalEdrContext", () => {
  it("registers all factories before any concurrent caller can use the context", async () => {
    // Import a fresh copy of the module so the test exercises lazy
    // initialization from scratch, independent of any other test in the
    // shared `isolation: "none"` process. The `?v=` query gives the tsx/esm
    // loader a distinct module instance with its own `_globalEdrContext`.
    const url =
      new URL("../../../src/internal/edr/context.js", import.meta.url).href +
      "?v=race";
    const freshContext: typeof EdrContextModule = await import(url);
    const { getGlobalEdrContext } = freshContext;

    const providerConfig = await getProviderConfig(
      networkConfigStub,
      undefined,
      undefined,
      new Map(),
    );

    const makeProvider = async () => {
      const context = await getGlobalEdrContext();
      return await context.createProvider(
        L1_CHAIN_TYPE,
        providerConfig,
        noopLoggerConfig,
        noopSubscriptionConfig,
        new ContractDecoder(),
      );
    };

    // Both concurrent callers must receive a fully-registered context. If
    // initialization ever regresses to handing out a half-initialized
    // (zero-factory) context, the second caller's createProvider would reject
    // with "Provider for provided chain type does not exist".
    await Promise.all([makeProvider(), makeProvider()]);
  });
});
