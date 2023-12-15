import { HardhatNetworkChainsConfig } from "../../../../src/types/config";
import { defaultHardhatNetworkParams } from "../../../../src/internal/core/config/default-config";
import { BackwardsCompatibilityProviderAdapter } from "../../../../src/internal/core/providers/backwards-compatibility";
import { JsonRpcServer } from "../../../../src/internal/hardhat-network/jsonrpc/server";
import {
  ForkConfig,
  MempoolOrder,
} from "../../../../src/internal/hardhat-network/provider/node-types";
import { createHardhatNetworkProvider } from "../../../../src/internal/hardhat-network/provider/provider";
import {
  EIP1193Provider,
  EthereumProvider,
  HardhatNetworkMempoolConfig,
  HardhatNetworkMiningConfig,
} from "../../../../src/types";

import { FakeModulesLogger } from "./fakeLogger";
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_ALLOW_UNLIMITED_CONTRACT_SIZE,
  DEFAULT_BLOCK_GAS_LIMIT,
  DEFAULT_CHAIN_ID,
  DEFAULT_HARDFORK,
  DEFAULT_MINING_CONFIG,
  DEFAULT_NETWORK_ID,
  DEFAULT_MEMPOOL_CONFIG,
  DEFAULT_USE_JSON_RPC,
} from "./providers";
import { sleep } from "./sleep";
import { spawnEdrProvider } from "./spawnEdrProvider";
import { isEdrProvider } from "./isEdrProvider";

declare module "mocha" {
  interface Context {
    logger: FakeModulesLogger;
    provider: EthereumProvider;
    hardhatNetworkProvider: EIP1193Provider;
    server?: JsonRpcServer;
    serverInfo?: { address: string; port: number };
  }
}

export interface UseProviderOptions {
  useJsonRpc?: boolean;
  edrBinary?: string;
  loggerEnabled?: boolean;
  forkConfig?: ForkConfig;
  mining?: HardhatNetworkMiningConfig;
  hardfork?: string;
  chainId?: number;
  networkId?: number;
  blockGasLimit?: bigint;
  accounts?: Array<{ privateKey: string; balance: bigint }>;
  allowUnlimitedContractSize?: boolean;
  allowBlocksWithSameTimestamp?: boolean;
  initialBaseFeePerGas?: bigint;
  mempool?: HardhatNetworkMempoolConfig;
  coinbase?: string;
  chains?: HardhatNetworkChainsConfig;
  forkBlockNumber?: number;
}

export function useProvider({
  useJsonRpc = DEFAULT_USE_JSON_RPC,
  edrBinary = undefined,
  loggerEnabled = true,
  forkConfig,
  mining = DEFAULT_MINING_CONFIG,
  hardfork = DEFAULT_HARDFORK,
  chainId = DEFAULT_CHAIN_ID,
  networkId = DEFAULT_NETWORK_ID,
  blockGasLimit = DEFAULT_BLOCK_GAS_LIMIT,
  accounts = DEFAULT_ACCOUNTS,
  allowUnlimitedContractSize = DEFAULT_ALLOW_UNLIMITED_CONTRACT_SIZE,
  allowBlocksWithSameTimestamp = false,
  initialBaseFeePerGas,
  mempool = DEFAULT_MEMPOOL_CONFIG,
  coinbase,
  chains = defaultHardhatNetworkParams.chains,
}: UseProviderOptions = {}) {
  beforeEach("Initialize provider", async function () {
    this.logger = new FakeModulesLogger(loggerEnabled);
    this.hardhatNetworkProvider = await createHardhatNetworkProvider(
      {
        hardfork,
        chainId,
        networkId,
        blockGasLimit: Number(blockGasLimit),
        initialBaseFeePerGas:
          initialBaseFeePerGas === undefined
            ? undefined
            : Number(initialBaseFeePerGas),
        minGasPrice: 0n,
        throwOnTransactionFailures: true,
        throwOnCallFailures: true,
        automine: mining.auto,
        intervalMining: mining.interval,
        mempoolOrder: mempool.order as MempoolOrder,
        chains,
        genesisAccounts: accounts,
        allowUnlimitedContractSize,
        forkConfig,
        coinbase,
        allowBlocksWithSameTimestamp,
        enableTransientStorage: false,
      },
      this.logger
    );

    const provider = new BackwardsCompatibilityProviderAdapter(
      this.hardhatNetworkProvider
    );
    this.provider = provider;

    if (useJsonRpc) {
      this.server = new JsonRpcServer({
        port: 0,
        hostname: "127.0.0.1",
        provider: this.provider,
      });
      this.serverInfo = await this.server.listen();

      this.provider = new BackwardsCompatibilityProviderAdapter(
        this.server.getProvider()
      );
    }

    if (edrBinary !== undefined) {
      const { childProcess, isReady, httpProvider } = spawnEdrProvider(
        edrBinary,
        { coinbase, chainId, networkId }
      );

      this.edrProcess = childProcess;

      // wait for the server to initialize:
      await sleep(250);

      this.provider = new BackwardsCompatibilityProviderAdapter(httpProvider);

      await isReady;
    }

    this.isEdr = () => {
      return this.edrProcess !== undefined || isEdrProvider(provider);
    };
  });

  afterEach("Remove provider", async function () {
    // These two deletes are unsafe, but we use this properties
    // in very locally and are ok with the risk.
    // To make this safe the properties should be optional, which
    // would be really uncomfortable for testing.
    delete (this as any).provider;
    delete (this as any).hardhatNetworkProvider;

    if (this.server !== undefined) {
      // close server and fail if it takes too long
      const beforeClose = Date.now();
      await this.server.close();
      const afterClose = Date.now();
      const elapsedTime = afterClose - beforeClose;
      if (elapsedTime > 1500) {
        throw new Error(
          `Closing the server took more than 1 second (${elapsedTime}ms), which can lead to incredibly slow tests. Please fix it.`
        );
      }

      delete this.server;
      delete this.serverInfo;
    }

    if (this.edrProcess !== undefined) {
      this.edrProcess.kill();
    }
  });
}
