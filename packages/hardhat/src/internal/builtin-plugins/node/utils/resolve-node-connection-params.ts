import type { EdrNetworkConfigOverride } from "../../../../types/config.js";
import type { ChainType } from "../../../../types/network.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

import { isSupportedChainType } from "../../../edr/chain-type.js";

export interface NodeConnectionParams {
  network: string;
  chainType?: ChainType;
  override?: EdrNetworkConfigOverride;
}

export interface NodeConnectionArguments {
  chainType?: string;
  chainId: number;
  fork?: string;
  forkBlockNumber: number;
}

/**
 * Resolves the arguments passed to the `node` task into the connection
 * parameters used to create the underlying network connection.
 */
export function resolveNodeConnectionParams(
  network: string,
  args: NodeConnectionArguments,
): NodeConnectionParams {
  const connectionParams: NodeConnectionParams = {
    network,
  };

  // NOTE: We create an empty network config override here. We add to it based
  // on the result of arguments parsing. We can expand the list of arguments
  // as much as needed.
  const networkConfigOverride: EdrNetworkConfigOverride = {};

  if (args.chainType !== undefined) {
    if (!isSupportedChainType(args.chainType)) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE_FOR_TYPE,
        {
          value: args.chainType,
          type: "ChainType",
          name: "chainType",
        },
      );
    }

    connectionParams.chainType = args.chainType;
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

  connectionParams.override = networkConfigOverride;

  return connectionParams;
}
