import debug from "debug";

import {
  JsonRpcServer,
  JsonRpcServerConfig
} from "../internal/buidler-evm/jsonrpc/server";
import { BUIDLEREVM_NETWORK_NAME } from "../internal/constants";
import { task, types } from "../internal/core/config/config-env";
import { BuidlerError } from "../internal/core/errors";
import { ERRORS } from "../internal/core/errors-list";
import { createProvider } from "../internal/core/providers/construction";
import { lazyObject } from "../internal/util/lazy";
import { EthereumProvider, ResolvedBuidlerConfig } from "../types";

import { TASK_JSONRPC } from "./task-names";

const log = debug("buidler:core:tasks:jsonrpc");

function _createBuidlerEVMProvider(
  config: ResolvedBuidlerConfig
): EthereumProvider {
  log("Creating BuidlerEVM Provider");

  const networkName = BUIDLEREVM_NETWORK_NAME;
  const networkConfig = config.networks[networkName];

  return lazyObject(() => {
    log(`Creating buidlerevm provider for JSON-RPC sever`);
    return createProvider(
      networkName,
      networkConfig,
      config.solc.version,
      config.paths
    );
  });
}

export default function() {
  task(TASK_JSONRPC, "Starts a buidler JSON-RPC server")
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
    .setAction(async ({ hostname, port }, { config }) => {
      try {
        const serverConfig: JsonRpcServerConfig = {
          hostname,
          port,
          provider: _createBuidlerEVMProvider(config)
        };

        const server = new JsonRpcServer(serverConfig);

        process.exitCode = await server.listen();
      } catch (error) {
        if (BuidlerError.isBuidlerError(error)) {
          throw error;
        }

        throw new BuidlerError(
          ERRORS.BUILTIN_TASKS.JSONRPC_SERVER_ERROR,
          {
            error: error.message
          },
          error
        );
      }
    });
}
