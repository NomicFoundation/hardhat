import chalk from "chalk";
import debug from "debug";
import { BN, bufferToHex, privateToAddress, toBuffer } from "ethereumjs-util";

import { HARDHAT_NETWORK_NAME } from "../internal/constants";
import { subtask, task, types } from "../internal/core/config/config-env";
import { HardhatError } from "../internal/core/errors";
import { ERRORS } from "../internal/core/errors-list";
import { createProvider } from "../internal/core/providers/construction";
import {
  JsonRpcServer,
  JsonRpcServerConfig,
} from "../internal/hardhat-network/jsonrpc/server";
import { Reporter } from "../internal/sentry/reporter";
import { lazyObject } from "../internal/util/lazy";
import { EthereumProvider, HardhatNetworkConfig } from "../types";

import {
  TASK_NODE,
  TASK_NODE_CREATE_SERVER,
  TASK_NODE_GET_PROVIDER,
} from "./task-names";
import { watchCompilerOutput } from "./utils/watch";

const log = debug("hardhat:core:tasks:node");

function logHardhatNetworkAccounts(networkConfig: HardhatNetworkConfig) {
  if (networkConfig.accounts === undefined) {
    return;
  }

  console.log("Accounts");
  console.log("========");

  for (const [index, account] of networkConfig.accounts.entries()) {
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

export default function () {
  subtask(TASK_NODE_GET_PROVIDER).setAction(
    async (_, { artifacts, config, network }): Promise<EthereumProvider> => {
      if (network.name === HARDHAT_NETWORK_NAME) {
        // enable logging for in-memory hardhat network provider
        await network.provider.request({
          method: "hardhat_setLoggingEnabled",
          params: [true],
        });
        return network.provider;
      }

      log("Creating HardhatNetworkProvider");

      const networkName = HARDHAT_NETWORK_NAME;
      const networkConfig = config.networks[HARDHAT_NETWORK_NAME];

      return lazyObject(() => {
        log(`Creating hardhat provider for JSON-RPC sever`);
        return createProvider(
          networkName,
          { ...networkConfig, loggingEnabled: true },
          config.paths,
          artifacts
        );
      });
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

        const server = new JsonRpcServer(serverConfig);

        return server;
      }
    );

  task(TASK_NODE, "Starts a JSON-RPC server on top of Hardhat Network")
    .addOptionalParam(
      "hostname",
      "The host to which to bind to for new connections",
      "localhost",
      types.string
    )
    .addOptionalParam(
      "port",
      "The port on which to listen for new connections",
      8545,
      types.int
    )
    .setAction(
      async (
        { hostname, port },
        { config, hardhatArguments, network, run }
      ) => {
        if (
          network.name !== HARDHAT_NETWORK_NAME &&
          // We normally set the default network as hardhatArguments.network,
          // so this check isn't enough, and we add the next one. This has the
          // effect of `--network <defaultNetwork>` being a false negative, but
          // not a big deal.
          hardhatArguments.network !== undefined &&
          hardhatArguments.network !== config.defaultNetwork
        ) {
          throw new HardhatError(
            ERRORS.BUILTIN_TASKS.JSONRPC_UNSUPPORTED_NETWORK
          );
        }

        try {
          const provider: EthereumProvider = await run(TASK_NODE_GET_PROVIDER);

          const server: JsonRpcServer = await run(TASK_NODE_CREATE_SERVER, {
            hostname,
            port,
            provider,
          });

          const { port: actualPort, address } = await server.listen();

          console.log(
            chalk.green(
              `Started HTTP and WebSocket JSON-RPC server at http://${address}:${actualPort}/`
            )
          );

          console.log();

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

          const networkConfig = config.networks[HARDHAT_NETWORK_NAME];
          logHardhatNetworkAccounts(networkConfig);

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
}
