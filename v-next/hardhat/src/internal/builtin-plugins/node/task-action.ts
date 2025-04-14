import type { BuildInfo } from "../../../types/artifacts.js";
import type { EdrNetworkConfigOverride } from "../../../types/config.js";
import type { SolidityBuildInfoOutput } from "../../../types/solidity.js";
import type { NewTaskActionFunction } from "../../../types/tasks.js";
import type { WatcherEvent } from "@nomicfoundation/hardhat-utils/watch";

import path from "node:path";


import {
  assertHardhatInvariant,
  HardhatError,
} from "@nomicfoundation/hardhat-errors";
import { exists, readJsonFile } from "@nomicfoundation/hardhat-utils/fs";
import { Watcher } from "@nomicfoundation/hardhat-utils/watch";
import chalk from "chalk";
import chokidar from "chokidar";
import debug from "debug";

import { BUILD_INFO_DIR_NAME } from "../artifacts/artifact-manager.js";
import { isEdrSupportedChainType } from "../network-manager/edr/utils/chain-type.js";

import { formatEdrNetworkConfigAccounts } from "./helpers.js";
import { JsonRpcServerImplementation } from "./json-rpc/server.js";

const log = debug("hardhat:core:tasks:node");

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
  const networkConfigOverride: EdrNetworkConfigOverride = {};

  if (args.chainType !== "") {
    if (!isEdrSupportedChainType(args.chainType)) {
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
    networkConfigOverride.forking = {
      enabled: true,
      url: args.fork,
      ...(args.forkBlockNumber !== -1
        ? { blockNumber: args.forkBlockNumber }
        : undefined),
    };
  } else if (args.forkBlockNumber !== -1) {
    // NOTE: We could make the error more specific here.
    throw new HardhatError(
      HardhatError.ERRORS.ARGUMENTS.MISSING_VALUE_FOR_ARGUMENT,
      {
        argument: "fork",
      },
    );
  }

  // NOTE: This is where we initialize the network; the connect method returns
  // a fully resolved networkConfig object which might be useful for display
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

  const server: JsonRpcServerImplementation = new JsonRpcServerImplementation({
    hostname,
    port: args.port,
    provider,
  });

  const { port: actualPort, address: actualHostname } = await server.listen();

  console.log(
    chalk.green(
      `Started HTTP and WebSocket JSON-RPC server at http://${actualHostname}:${actualPort}/`,
    ),
  );

  console.log();

  const buildInfoPath = path.join(
    hre.config.paths.artifacts,
    BUILD_INFO_DIR_NAME,
  );
  const addCompilationResult = async (modifiedPath: string) => {
    log(`Detected change in ${modifiedPath}`);

    // NOTE: We're ignoring the output file here, because the build info files
    // are modified after the output files
    if (modifiedPath.endsWith(".output.json") === true) {
      return;
    }

    const artifactPath = path.join(buildInfoPath, modifiedPath);
    if (!(await exists(artifactPath))) {
      return;
    }

    const outputPath = artifactPath.replace(".json", ".output.json");
    if (!(await exists(outputPath))) {
      return;
    }

    try {
      const buildInfo: BuildInfo = await readJsonFile(artifactPath);
      const buildInfoOutput: SolidityBuildInfoOutput =
        await readJsonFile(outputPath);

      await provider.request({
        method: "hardhat_addCompilationResult",
        params: [
          buildInfo.solcVersion,
          buildInfo.input,
          buildInfoOutput.output,
        ],
      });

      log(`Added compilation result for ${modifiedPath}`);
    } catch (error) {
      log(error);
    }
  };

  const watcher = chokidar.watch(buildInfoPath, {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 250,
      pollInterval: 50,
    },
  });
  watcher.on("add", addCompilationResult);
  watcher.on("change", addCompilationResult);

  // NOTE: Before creating the node, we check if the input network config is of type edr.
  // We only proceed if it is. Hence, we can assume that the output network config is of type edr as well.
  assertHardhatInvariant(
    networkConfig.type === "edr",
    "Network config type should be edr",
  );

  console.log(await formatEdrNetworkConfigAccounts(networkConfig.accounts));

  await server.waitUntilClosed();

  await watcher.close();
};

export default nodeAction;
