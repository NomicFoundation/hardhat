import type { EdrNetworkConfigOverride } from "../../../types/config.js";
import type { NewTaskActionFunction } from "../../../types/tasks.js";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@nomicfoundation/hardhat-errors";
import { exists } from "@nomicfoundation/hardhat-utils/fs";
import chalk from "chalk";

import { isEdrSupportedChainType } from "../network-manager/edr/utils/chain-type.js";

import { formatEdrNetworkConfigAccounts } from "./helpers.js";
import { JsonRpcServerImplementation } from "./json-rpc/server.js";

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
    hre.globalOptions.network !== undefined
      ? hre.globalOptions.network
      : hre.config.defaultNetwork;

  if (!(network in hre.config.networks)) {
    throw new HardhatError(HardhatError.ERRORS.CORE.NETWORK.NETWORK_NOT_FOUND, {
      networkName: network,
    });
  }

  if (hre.config.networks[network].type !== "edr") {
    throw new HardhatError(HardhatError.ERRORS.CORE.NODE.INVALID_NETWORK_TYPE, {
      networkType: hre.config.networks[network].type,
      networkName: network,
    });
  }

  // NOTE: We create an empty network config override here. We add to it based
  // on the result of arguments parsing. We can expand the list of arguments
  // as much as needed.
  const networkConfigOverride: EdrNetworkConfigOverride = {};

  if (args.chainType !== undefined) {
    if (!isEdrSupportedChainType(args.chainType)) {
      // NOTE: We could make the error more specific here.
      throw new HardhatError(
        HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE_FOR_TYPE,
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
  if (args.fork !== undefined) {
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
      HardhatError.ERRORS.CORE.ARGUMENTS.MISSING_VALUE_FOR_ARGUMENT,
      {
        argument: "fork",
      },
    );
  }

  // NOTE: This is where we initialize the network; the connect method returns
  // a fully resolved networkConfig object which might be useful for display
  const { networkConfig, provider } = await hre.network.connect({
    network,
    override: networkConfigOverride,
  });

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

  // TODO(https://github.com/NomicFoundation/hardhat/issues/6040): Add build info watcher here

  // NOTE: Before creating the node, we check if the input network config is of type edr.
  // We only proceed if it is. Hence, we can assume that the output network config is of type edr as well.
  assertHardhatInvariant(
    networkConfig.type === "edr",
    "Network config type should be edr",
  );

  console.log(await formatEdrNetworkConfigAccounts(networkConfig.accounts));

  await server.waitUntilClosed();
};

export default nodeAction;
