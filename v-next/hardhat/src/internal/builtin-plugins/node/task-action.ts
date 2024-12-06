import type { WatcherEvent } from "./watcher.js";
import type { BuildInfo } from "../../../types/artifacts.js";
import type { EdrNetworkConfig } from "../../../types/config.js";
import type { NewTaskActionFunction } from "../../../types/tasks.js";

import path from "node:path";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { exists, readJsonFile } from "@ignored/hardhat-vnext-utils/fs";
import chalk from "chalk";
import debug from "debug";

import { BUILD_INFO_DIR_NAME } from "../artifacts/artifacts-manager.js";

import { printEdrNetworkConfigAccounts } from "./helpers.js";
import { JsonRpcServer } from "./json-rpc/server.js";
import { Watcher } from "./watcher.js";

const log = debug("hardhat:core:tasks:node:task-action");

interface NodeActionArguments {
  hostname: string;
  port: number;
  chainType: string;
  chainId: number;
  fork: string;
  forkBlockNumber: number;
}

const nodeAction: NewTaskActionFunction<NodeActionArguments> = async (
  args,
  hre,
) => {
  // NOTE: In v2, we would wrap the entire task in a try/catch block and wrap
  // non-Hardhat errors that had messages in a HardhatErrror.

  const network =
    hre.globalOptions.network !== ""
      ? hre.globalOptions.network
      : hre.config.defaultNetwork;

  if (!(network in hre.config.networks)) {
    throw new HardhatError(HardhatError.ERRORS.NETWORK.NETWORK_NOT_FOUND, {
      networkName: network,
    });
  }

  if (hre.config.networks[network].type !== "edr") {
    throw new HardhatError(HardhatError.ERRORS.NODE.INVALID_NETWORK_TYPE, {
      networkType: hre.config.networks[network].type,
      networkName: network,
    });
  }

  // NOTE: We create an empty network config override here. We add to it based
  // on the result of arguments parsing. We can expand the list of arguments
  // as much as needed.
  const networkConfigOverride: Partial<EdrNetworkConfig> = {};

  if (args.chainType !== "") {
    if (
      args.chainType !== "generic" &&
      args.chainType !== "l1" &&
      args.chainType !== "optimism"
    ) {
      // NOTE: We could make the error more specific here.
      throw new HardhatError(
        HardhatError.ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE,
        {
          value: args.chainType,
          type: "ChainType",
          name: "chainType",
        },
      );
    }
    networkConfigOverride.chainType = args.chainType;
  }

  if (args.chainId !== -1) {
    networkConfigOverride.chainId = args.chainId;
  }

  // NOTE: --fork-block-number is only valid if --fork is specified
  if (args.fork !== "") {
    networkConfigOverride.forkConfig = {
      jsonRpcUrl: args.fork,
    };
    if (args.forkBlockNumber !== -1) {
      networkConfigOverride.forkConfig.blockNumber = BigInt(
        args.forkBlockNumber,
      );
    }
  } else if (args.forkBlockNumber !== -1) {
    // NOTE: We could make the error more specific here.
    throw new HardhatError(
      HardhatError.ERRORS.ARGUMENTS.MISSING_VALUE_FOR_ARGUMENT,
      {
        argument: "fork",
      },
    );
  }

  // NOTE: This is where we initialize the network
  const { networkConfig, provider } = await hre.network.connect(
    network,
    undefined,
    networkConfigOverride,
  );

  // NOTE: We enable logging for the node
  await provider.request({
    method: "hardhat_setLoggingEnabled",
    params: [true],
  });

  // the default hostname is "127.0.0.1" unless we are inside a docker
  // container, in that case we use "0.0.0.0"
  let hostname = args.hostname;
  if (hostname === "") {
    const insideDocker = await exists("/.dockerenv");
    if (insideDocker) {
      hostname = "0.0.0.0";
    } else {
      hostname = "127.0.0.1";
    }
  }

  const server: JsonRpcServer = new JsonRpcServer({
    hostname,
    port: args.port,
    provider,
  });

  const { port: actualPort, address: actualHostname } = await server.listen();

  const watcher = new Watcher(
    path.join(hre.config.paths.artifacts, BUILD_INFO_DIR_NAME),
    async ({ eventType, filename }: WatcherEvent) => {
      log(`Detected ${eventType} in ${filename}`);

      if (
        filename === null ||
        filename.endsWith(".output.json") ||
        !(await exists(filename))
      ) {
        return;
      }

      const filenameOutput = filename.replace(".json", ".output.json");
      if (await exists(filenameOutput)) {
        return;
      }

      const buildInfo: BuildInfo = await readJsonFile(filename);
      const buildInfoOutput = await readJsonFile(filenameOutput);

      try {
        await provider.request({
          method: "hardhat_addCompilationResult",
          params: [buildInfo.solcVersion, buildInfo.input, buildInfoOutput],
        });
      } catch (error) {
        log(error);
      }
    },
  );

  console.log(
    chalk.green(
      `Started HTTP and WebSocket JSON-RPC server at http://${actualHostname}:${actualPort}/`,
    ),
  );

  console.log();

  log(networkConfig);

  // NOTE: We print the genesis accounts here. Is that correct?
  if (networkConfig.type === "edr") {
    printEdrNetworkConfigAccounts(networkConfig.genesisAccounts);
  }

  await server.waitUntilClosed();
  await watcher.close();
};

export default nodeAction;
