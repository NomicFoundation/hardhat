import { BackwardsCompatibilityProviderAdapter } from "../../../../src/internal/core/providers/backwards-compatibility";
import { JsonRpcServer } from "../../../../src/internal/hardhat-network/jsonrpc/server";
import { ForkConfig } from "../../../../src/internal/hardhat-network/provider/node-types";
import { HardhatNetworkProvider } from "../../../../src/internal/hardhat-network/provider/provider";
import { EthereumProvider } from "../../../../src/types";

import { FakeModulesLogger } from "./fakeLogger";
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_ALLOW_UNLIMITED_CONTRACT_SIZE,
  DEFAULT_BLOCK_GAS_LIMIT,
  DEFAULT_CHAIN_ID,
  DEFAULT_HARDFORK,
  DEFAULT_MINING_CONFIG,
  DEFAULT_NETWORK_ID,
  DEFAULT_NETWORK_NAME,
  DEFAULT_USE_JSON_RPC,
} from "./providers";

declare module "mocha" {
  interface Context {
    logger: FakeModulesLogger;
    provider: EthereumProvider;
    hardhatNetworkProvider: HardhatNetworkProvider;
    server?: JsonRpcServer;
  }
}

export function useProvider(
  useJsonRpc = DEFAULT_USE_JSON_RPC,
  loggerEnabled = true,
  forkConfig?: ForkConfig,
  mining = DEFAULT_MINING_CONFIG,
  hardfork = DEFAULT_HARDFORK,
  networkName = DEFAULT_NETWORK_NAME,
  chainId = DEFAULT_CHAIN_ID,
  networkId = DEFAULT_NETWORK_ID,
  blockGasLimit = DEFAULT_BLOCK_GAS_LIMIT,
  accounts = DEFAULT_ACCOUNTS,
  allowUnlimitedContractSize = DEFAULT_ALLOW_UNLIMITED_CONTRACT_SIZE
) {
  beforeEach("Initialize provider", async function () {
    this.logger = new FakeModulesLogger(loggerEnabled);
    this.hardhatNetworkProvider = new HardhatNetworkProvider(
      hardfork,
      networkName,
      chainId,
      networkId,
      blockGasLimit,
      true,
      true,
      mining.auto,
      mining.interval,
      this.logger,
      accounts,
      undefined,
      allowUnlimitedContractSize,
      undefined,
      undefined,
      forkConfig
    );
    this.provider = new BackwardsCompatibilityProviderAdapter(
      this.hardhatNetworkProvider
    );

    if (useJsonRpc) {
      this.server = new JsonRpcServer({
        port: 0,
        hostname: "localhost",
        provider: this.provider,
      });
      await this.server.listen();

      this.provider = new BackwardsCompatibilityProviderAdapter(
        this.server.getProvider()
      );
    }
  });

  afterEach("Remove provider", async function () {
    // These two deletes are unsafe, but we use this properties
    // in very locally and are ok with the risk.
    // To make this safe the properties should be optional, which
    // would be really uncomfortable for testing.
    delete (this as any).provider;
    delete (this as any).hardhatNetworkProvider;

    if (this.server !== undefined) {
      await this.server.close();
      delete this.server;
    }
  });
}
