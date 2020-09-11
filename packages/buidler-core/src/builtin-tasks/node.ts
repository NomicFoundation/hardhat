import chalk from "chalk";
import debug from "debug";
import { BN, bufferToHex, privateToAddress, toBuffer } from "ethereumjs-util";

import {
  JsonRpcServer,
  JsonRpcServerConfig,
} from "../internal/buidler-evm/jsonrpc/server";
import { BUIDLEREVM_NETWORK_NAME } from "../internal/constants";
import { task, types } from "../internal/core/config/config-env";
import { BuidlerError } from "../internal/core/errors";
import { ERRORS } from "../internal/core/errors-list";
import { createProvider } from "../internal/core/providers/construction";
import { Reporter } from "../internal/sentry/reporter";
import { lazyObject } from "../internal/util/lazy";
import {
  BuidlerNetworkConfig,
  EthereumProvider,
  ResolvedBuidlerConfig,
} from "../types";

import { TASK_NODE } from "./task-names";
import { watchCompilerOutput } from "./utils/watch";

const log = debug("buidler:core:tasks:node");

function _createBuidlerEVMProvider(
  config: ResolvedBuidlerConfig
): EthereumProvider {
  log("Creating BuidlerEVM Provider");

  const networkName = BUIDLEREVM_NETWORK_NAME;
  const networkConfig = config.networks[networkName] as BuidlerNetworkConfig;

  return lazyObject(() => {
    log(`Creating buidlerevm provider for JSON-RPC sever`);
    return createProvider(
      networkName,
      { loggingEnabled: true, ...networkConfig },
      config.solc.version,
      config.paths
    );
  });
}

function logBuidlerEvmAccounts(networkConfig: BuidlerNetworkConfig) {
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
  task(TASK_NODE, "Starts a JSON-RPC server on top of Buidler EVM")
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
      async ({ hostname, port }, { network, buidlerArguments, config }) => {
        if (
          network.name !== BUIDLEREVM_NETWORK_NAME &&
          // We normally set the default network as buidlerArguments.network,
          // so this check isn't enough, and we add the next one. This has the
          // effect of `--network <defaultNetwork>` being a false negative, but
          // not a big deal.
          buidlerArguments.network !== undefined &&
          buidlerArguments.network !== config.defaultNetwork
        ) {
          throw new BuidlerError(
            ERRORS.BUILTIN_TASKS.JSONRPC_UNSUPPORTED_NETWORK
          );
        }

        try {
          const serverConfig: JsonRpcServerConfig = {
            hostname,
            port,
            provider: _createBuidlerEVMProvider(config),
          };

          const server = new JsonRpcServer(serverConfig);

          const { port: actualPort, address } = await server.listen();

          console.log(
            chalk.green(
              `Started HTTP and WebSocket JSON-RPC server at http://${address}:${actualPort}/`
            )
          );

          console.log();

          try {
            await watchCompilerOutput(
              server.getProvider(),
              config.solc,
              config.paths
            );
          } catch (error) {
            console.warn(
              chalk.yellow(
                "There was a problem watching the compiler output, changes in the contracts won't be reflected in the Buidler EVM. Run Buidler with --verbose to learn more."
              )
            );

            log(
              "Compilation output can't be watched. Please report this to help us improve Buidler.\n",
              error
            );

            Reporter.reportError(error);
          }

          const networkConfig = config.networks[
            BUIDLEREVM_NETWORK_NAME
          ] as BuidlerNetworkConfig;
          logBuidlerEvmAccounts(networkConfig);

          await server.waitUntilClosed();
        } catch (error) {
          if (BuidlerError.isBuidlerError(error)) {
            throw error;
          }

          throw new BuidlerError(
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
