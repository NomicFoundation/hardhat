import chalk from "chalk";
import debug from "debug";
import type EthereumjsUtilT from "ethereumjs-util";
import fsExtra from "fs-extra";

import { HARDHAT_NETWORK_NAME } from "../internal/constants";
import { subtask, task, types } from "../internal/core/config/config-env";
import { HardhatError } from "../internal/core/errors";
import { ERRORS } from "../internal/core/errors-list";
import { createProvider } from "../internal/core/providers/construction";
import { normalizeHardhatNetworkAccountsConfig } from "../internal/core/providers/util";
import {
  JsonRpcServer as JsonRpcServerImpl,
  JsonRpcServerConfig,
} from "../internal/hardhat-network/jsonrpc/server";
import { Reporter } from "../internal/sentry/reporter";
import {
  EthereumProvider,
  HardhatNetworkConfig,
  JsonRpcServer,
} from "../types";

import {
  TASK_NODE,
  TASK_NODE_CREATE_SERVER,
  TASK_NODE_GET_PROVIDER,
  TASK_NODE_SERVER_CREATED,
  TASK_NODE_SERVER_READY,
} from "./task-names";
import { watchCompilerOutput } from "./utils/watch";

const log = debug("hardhat:core:tasks:node");

function logHardhatNetworkAccounts(networkConfig: HardhatNetworkConfig) {
  if (networkConfig.accounts === undefined) {
    return;
  }

  const {
    BN,
    bufferToHex,
    privateToAddress,
    toBuffer,
  } = require("ethereumjs-util") as typeof EthereumjsUtilT;

  console.log("Accounts");
  console.log("========");

  const accounts = normalizeHardhatNetworkAccountsConfig(
    networkConfig.accounts
  );

  for (const [index, account] of accounts.entries()) {
    const address = bufferToHex(privateToAddress(toBuffer(account.privateKey)));
    const privateKey = bufferToHex(toBuffer(account.privateKey));
    const balance = new BN(account.balance)
      .div(new BN(10).pow(new BN(18)))
      .toString(10);

    console.log(`Account #${index}: ${address} (${balance} ETH)
Private Key: ${privateKey}
`);
  }
}

subtask(TASK_NODE_GET_PROVIDER)
  .addOptionalParam("forkUrl", undefined, undefined, types.string)
  .addOptionalParam("forkBlockNumber", undefined, undefined, types.int)
  .addOptionalParam("forkNetwork", undefined, undefined, types.string)
  .setAction(
    async (
      {
        forkBlockNumber: forkBlockNumberParam,
        forkUrl: forkUrlParam,
        forkNetwork: forkNetworkParam,
      }: {
        forkBlockNumber?: number;
        forkUrl?: string;
        forkNetwork?: string;
      },
      { artifacts, config, network }
    ): Promise<EthereumProvider> => {
      let provider = network.provider;

      if (network.name !== HARDHAT_NETWORK_NAME) {
        const networkConfig = config.networks[HARDHAT_NETWORK_NAME];

        log(`Creating hardhat provider for JSON-RPC server`);
        provider = createProvider(
          HARDHAT_NETWORK_NAME,
          networkConfig,
          config.paths,
          artifacts
        );
      }

      const hardhatNetworkConfig = config.networks[HARDHAT_NETWORK_NAME];

      const forkNetworkConfig =
        hardhatNetworkConfig.forking !== undefined &&
        "network" in hardhatNetworkConfig.forking
          ? hardhatNetworkConfig.forking?.network
          : undefined;
      let forkUrlConfig =
        hardhatNetworkConfig.forking !== undefined &&
        "url" in hardhatNetworkConfig.forking
          ? hardhatNetworkConfig.forking?.url
          : undefined;
      const forkBlockNumberConfig = hardhatNetworkConfig.forking?.blockNumber;

      if (forkNetworkParam === undefined && forkNetworkConfig !== undefined) {
        const networkConfig = config.networks[forkNetworkConfig];
        if (networkConfig === undefined) {
          throw new HardhatError(ERRORS.NETWORK.FORK_NETWORK_NOT_EXISTS);
        }
        if (!("url" in networkConfig)) {
          throw new HardhatError(ERRORS.NETWORK.FORK_NETWORK_WITHOUT_URL);
        }
        forkUrlConfig = networkConfig.url;
      }

      const forkNetwork = forkNetworkParam ?? forkNetworkConfig;
      let forkUrl = forkUrlParam ?? forkUrlConfig;
      const forkBlockNumber = forkBlockNumberParam ?? forkBlockNumberConfig;

      if (forkNetwork !== undefined) {
        const networkConfig = config.networks[forkNetwork];
        if (networkConfig === undefined) {
          throw new HardhatError(ERRORS.NETWORK.FORK_NETWORK_NOT_EXISTS);
        }
        if (!("url" in networkConfig)) {
          throw new HardhatError(ERRORS.NETWORK.FORK_NETWORK_WITHOUT_URL);
        }
        forkUrl = networkConfig.url;
      }

      if (forkUrl !== undefined) {
        // assign the fork settings to the network object so plugin can retrive the network used as fork
        hardhatNetworkConfig.forking = {
          ...hardhatNetworkConfig.forking,

          url: forkUrl,
          network: forkNetwork,
          enabled: true,
        };
      }

      // we throw an error if the user specified a forkBlockNumber but not a
      // forkUrl
      if (forkBlockNumber !== undefined && forkUrl === undefined) {
        throw new HardhatError(
          ERRORS.BUILTIN_TASKS.NODE_FORK_BLOCK_NUMBER_WITHOUT_URL
        );
      }

      // if the url or the block is different to the one in the configuration,
      // we use hardhat_reset to set the fork
      if (
        forkUrl !== forkUrlConfig ||
        forkBlockNumber !== forkBlockNumberConfig
      ) {
        await provider.request({
          method: "hardhat_reset",
          params: [
            {
              forking: {
                jsonRpcUrl: forkUrl,
                blockNumber: forkBlockNumber,
              },
            },
          ],
        });
      }

      // enable logging
      await provider.request({
        method: "hardhat_setLoggingEnabled",
        params: [true],
      });

      return provider;
    }
  );

subtask(TASK_NODE_CREATE_SERVER)
  .addParam("hostname", undefined, undefined, types.string)
  .addParam("port", undefined, undefined, types.int)
  .addParam("provider", undefined, undefined, types.any)
  .setAction(
    async ({
      hostname,
      port,
      provider,
    }: {
      hostname: string;
      port: number;
      provider: EthereumProvider;
    }): Promise<JsonRpcServer> => {
      const serverConfig: JsonRpcServerConfig = {
        hostname,
        port,
        provider,
      };

      const server = new JsonRpcServerImpl(serverConfig);

      return server;
    }
  );

/**
 * This task will be called when the server was successfully created, but it's
 * not ready for receiving requests yet.
 */
subtask(TASK_NODE_SERVER_CREATED)
  .addParam("hostname", undefined, undefined, types.string)
  .addParam("port", undefined, undefined, types.int)
  .addParam("provider", undefined, undefined, types.any)
  .addParam("server", undefined, undefined, types.any)
  .setAction(
    async ({}: {
      hostname: string;
      port: number;
      provider: EthereumProvider;
      server: JsonRpcServer;
    }) => {
      // this task is meant to be overriden by plugin writers
    }
  );

/**
 * This subtask will be run when the server is ready to accept requests
 */
subtask(TASK_NODE_SERVER_READY)
  .addParam("address", undefined, undefined, types.string)
  .addParam("port", undefined, undefined, types.int)
  .addParam("provider", undefined, undefined, types.any)
  .addParam("server", undefined, undefined, types.any)
  .setAction(
    async (
      {
        address,
        port,
      }: {
        address: string;
        port: number;
        provider: EthereumProvider;
        server: JsonRpcServer;
      },
      { config }
    ) => {
      console.log(
        chalk.green(
          `Started HTTP and WebSocket JSON-RPC server at http://${address}:${port}/`
        )
      );

      console.log();

      const networkConfig = config.networks[HARDHAT_NETWORK_NAME];
      logHardhatNetworkAccounts(networkConfig);
    }
  );

task(TASK_NODE, "Starts a JSON-RPC server on top of Hardhat Network")
  .addOptionalParam(
    "hostname",
    "The host to which to bind to for new connections (Defaults to 127.0.0.1 running locally, and 0.0.0.0 in Docker)",
    undefined,
    types.string
  )
  .addOptionalParam(
    "port",
    "The port on which to listen for new connections",
    8545,
    types.int
  )
  .addOptionalParam(
    "fork",
    "The URL of the JSON-RPC server to fork from",
    undefined,
    types.string
  )
  .addOptionalParam(
    "forkBlockNumber",
    "The block number to fork from",
    undefined,
    types.int
  )
  .setAction(
    async (
      {
        forkBlockNumber,
        fork,
        hostname: hostnameParam,
        port,
      }: {
        forkBlockNumber?: number;
        fork?: string;
        hostname?: string;
        port: number;
      },
      { config, hardhatArguments, network, run }
    ) => {
      // we throw if the user specified a network argument and it's not hardhat
      if (
        network.name !== HARDHAT_NETWORK_NAME &&
        hardhatArguments.network !== undefined
      ) {
        throw new HardhatError(
          ERRORS.BUILTIN_TASKS.JSONRPC_UNSUPPORTED_NETWORK
        );
      }

      const urlSchemes = ["http", "https", "ws", "wss"];
      let forkUrl: string | undefined;
      let forkNetwork: string | undefined;
      if (
        urlSchemes.reduce<boolean>(
          (prev, curr) =>
            prev || (fork !== undefined ? fork.startsWith(`${curr}:`) : false),
          false
        )
      ) {
        forkUrl = fork;
      } else {
        forkNetwork = fork;
      }

      try {
        const provider: EthereumProvider = await run(TASK_NODE_GET_PROVIDER, {
          forkBlockNumber,
          forkUrl,
          forkNetwork,
        });

        // the default hostname is "localhost" unless we are inside a docker
        // container, in that case we use "0.0.0.0"
        let hostname: string;
        if (hostnameParam !== undefined) {
          hostname = hostnameParam;
        } else {
          const insideDocker = fsExtra.existsSync("/.dockerenv");
          if (insideDocker) {
            hostname = "0.0.0.0";
          } else {
            hostname = "localhost";
          }
        }

        const server: JsonRpcServer = await run(TASK_NODE_CREATE_SERVER, {
          hostname,
          port,
          provider,
        });

        await run(TASK_NODE_SERVER_CREATED, {
          hostname,
          port,
          provider,
          server,
        });

        const { port: actualPort, address } = await server.listen();

        try {
          await watchCompilerOutput(provider, config.paths);
        } catch (error) {
          console.warn(
            chalk.yellow(
              "There was a problem watching the compiler output, changes in the contracts won't be reflected in the Hardhat Network. Run Hardhat with --verbose to learn more."
            )
          );

          log(
            "Compilation output can't be watched. Please report this to help us improve Hardhat.\n",
            error
          );

          Reporter.reportError(error);
        }

        await run(TASK_NODE_SERVER_READY, {
          address,
          port: actualPort,
          provider,
          server,
        });

        await server.waitUntilClosed();
      } catch (error) {
        if (HardhatError.isHardhatError(error)) {
          throw error;
        }

        throw new HardhatError(
          ERRORS.BUILTIN_TASKS.JSONRPC_SERVER_ERROR,
          {
            error: error.message,
          },
          error
        );
      }
    }
  );
