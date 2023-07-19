import type { Client as ClientT } from "undici";
import { normalize } from "node:path";
import { spawn } from "node:child_process";

import { HardhatNetworkChainsConfig } from "../../../../src/types/config";
import { defaultHardhatNetworkParams } from "../../../../src/internal/core/config/default-config";
import { BackwardsCompatibilityProviderAdapter } from "../../../../src/internal/core/providers/backwards-compatibility";
import { HttpProvider } from "../../../../src/internal/core/providers/http";
import { JsonRpcServer } from "../../../../src/internal/hardhat-network/jsonrpc/server";
import {
  ForkConfig,
  MempoolOrder,
} from "../../../../src/internal/hardhat-network/provider/node-types";
import { HardhatNetworkProvider } from "../../../../src/internal/hardhat-network/provider/provider";
import {
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

declare module "mocha" {
  interface Context {
    logger: FakeModulesLogger;
    provider: EthereumProvider;
    hardhatNetworkProvider: HardhatNetworkProvider;
    server?: JsonRpcServer;
    serverInfo?: { address: string; port: number };
  }
}

export interface UseProviderOptions {
  useJsonRpc?: boolean;
  rethnetBinary?: string;
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
  rethnetBinary = undefined,
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
    this.hardhatNetworkProvider = new HardhatNetworkProvider(
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
      },
      this.logger
    );
    this.provider = new BackwardsCompatibilityProviderAdapter(
      this.hardhatNetworkProvider
    );

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

    if (rethnetBinary !== undefined) {
      this.rethnetProcess = spawn(normalize(rethnetBinary), ["node", "-vv"]);

      let stdout = "";
      this.rethnetProcess.stdout.on("data", (data: any) => {
        stdout += data.toString();
        console.log(`rethnet subprocess ${this.rethnetProcess.pid}: ${data}`);
      });

      let stderr = "";
      this.rethnetProcess.stderr.on("data", (data: any) => {
        stderr += data.toString();
        console.log(`rethnet subprocess ${this.rethnetProcess.pid}: ${data}`);
      });

      function outputForError() {
        return `stdout:\n${stdout}\nstderr:\n${stderr}`;
      }

      const wait = new Promise((resolve) => setTimeout(resolve, 2000));

      const exit = new Promise<void>((resolve, reject) => {
        this.rethnetProcess.on("exit", (code: number, signal: string) => {
          if (signal === "SIGKILL") {
            console.log("kill");
            resolve();
          } else {
            reject(
              new Error(
                `rethnet process closed unexpectedly. return code: ${code}. signal: ${signal}. ${outputForError()}`
              )
            );
          }
        });
      });

      const error = new Promise((_resolve, reject) => {
        this.rethnetProcess.on("error", (err: Error) => {
          if (err.message.includes("ENOENT")) {
            reject(new Error("Rethnet executable not found"));
          } else {
            reject(
              new Error(`Rethnet subprocess error: ${err}. ${outputForError()}`)
            );
          }
        });
      });

      // sleep a moment to let the server initialize
      await new Promise((resolve) => setTimeout(resolve, 250));

      const { Client } = require("undici") as { Client: typeof ClientT };
      const url = "http://127.0.0.1:8545";
      this.provider = new BackwardsCompatibilityProviderAdapter(
        new HttpProvider(
          url,
          "rethnet",
          {},
          20000,
          new Client(url, {
            keepAliveTimeout: 10,
            keepAliveMaxTimeout: 10,
          })
        )
      );

      await Promise.race([wait, exit, error]);
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

    if (this.rethnetProcess !== undefined) {
      this.rethnetProcess.kill();
    }
  });
}
