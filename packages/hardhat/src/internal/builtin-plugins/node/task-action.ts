import type { NewTaskActionFunction } from "../../../types/tasks.js";

import path from "node:path";
import { styleText } from "node:util";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@nomicfoundation/hardhat-errors";
import { createDebug } from "@nomicfoundation/hardhat-utils/debug";
import { ensureDir, exists } from "@nomicfoundation/hardhat-utils/fs";

import { BUILD_INFO_DIR_NAME } from "../artifacts/artifact-manager.js";
import { EdrProvider } from "../network-manager/edr/edr-provider.js";

import { watchBuildInfo } from "./artifacts/build-info-watcher.js";
import {
  createBuildInfoUploadHandlerFrom,
  formatEdrNetworkConfigAccounts,
} from "./helpers.js";
import { JsonRpcServerImplementation } from "./json-rpc/server.js";
import { resolveNodeConnectionParams } from "./utils/resolve-node-connection-params.js";

const log = createDebug("hardhat:core:tasks:node");

interface NodeActionArguments {
  hostname?: string;
  port: number;
  chainType?: string;
  chainId: number;
  fork?: string;
  forkBlockNumber: number;
}

const nodeAction: NewTaskActionFunction<NodeActionArguments> = async (
  args,
  hre,
) => {
  const network =
    hre.globalOptions.network !== undefined
      ? hre.globalOptions.network
      : "node";

  if (!(network in hre.config.networks)) {
    throw new HardhatError(HardhatError.ERRORS.CORE.NETWORK.NETWORK_NOT_FOUND, {
      networkName: network,
    });
  }

  if (hre.config.networks[network].type !== "edr-simulated") {
    throw new HardhatError(HardhatError.ERRORS.CORE.NODE.INVALID_NETWORK_TYPE, {
      networkType: hre.config.networks[network].type,
      networkName: network,
    });
  }

  const connectionParams = resolveNodeConnectionParams(network, args);

  // NOTE: This is where we initialize the network; the create method returns
  // a fully resolved networkConfig object which might be useful for display
  const { networkConfig, provider } =
    await hre.network.create(connectionParams);

  assertHardhatInvariant(
    provider instanceof EdrProvider,
    "Provider must be EdrProvider, since only edr networks are supported",
  );

  // NOTE: We enable logging for the node
  await provider.request({
    method: "hardhat_setLoggingEnabled",
    params: [true],
  });

  // the default hostname is "127.0.0.1" unless we are inside a docker
  // container, in that case we use "0.0.0.0"
  let hostname = args.hostname;
  if (hostname === undefined) {
    const insideDocker = await exists("/.dockerenv");
    if (insideDocker) {
      hostname = "0.0.0.0";
    } else {
      hostname = "127.0.0.1";
    }
  }

  const server = new JsonRpcServerImplementation({
    hostname,
    port: args.port,
    provider,
  });

  const { port: actualPort, address: actualHostname } = await server.listen();

  console.log(
    styleText(
      "green",
      `Started HTTP and WebSocket JSON-RPC server at http://${actualHostname}:${actualPort}/`,
    ),
  );

  console.log();

  const buildInfoDirPath = path.join(
    hre.config.paths.artifacts,
    BUILD_INFO_DIR_NAME,
  );
  await ensureDir(buildInfoDirPath);

  const buildInfoWatcher = await watchBuildInfo(
    buildInfoDirPath,
    createBuildInfoUploadHandlerFrom(buildInfoDirPath, provider, log),
  );

  // NOTE: Before creating the node, we check if the input network config is of type edr.
  // We only proceed if it is. Hence, we can assume that the output network config is of type edr as well.
  assertHardhatInvariant(
    networkConfig.type === "edr-simulated",
    "Network config type should be edr",
  );

  console.log(await formatEdrNetworkConfigAccounts(networkConfig.accounts));

  await server.afterClosed();
  await buildInfoWatcher.close();
};

export default nodeAction;
