import chalk from "chalk";

import { HARDHAT_NETWORK_NAME } from "../../../constants";
import { assertHardhatInvariant } from "../../../core/errors";
import {
  numberToRpcQuantity,
  rpcQuantityToNumber,
} from "../../../core/jsonrpc/types/base-types";
import { HttpProvider } from "../../../core/providers/http";
import { JsonRpcClient } from "../../jsonrpc/client";
import { ForkConfig } from "../node-types";
import { RpcBlockOutput } from "../output";

import {
  FALLBACK_MAX_REORG,
  getLargestPossibleReorg,
} from "./reorgs-protection";

// TODO: This is a temporarily measure.
//  We must investigate why this timeouts so much. Apparently
//  node-fetch doesn't handle timeouts so well. The option was
//  removed in its new major version. UPDATE: we aren't even using node-fetch
//  anymore, so this really should be revisited.
const FORK_HTTP_TIMEOUT = 35000;

export async function makeForkClient(
  forkConfig: ForkConfig,
  forkCachePath?: string
): Promise<{
  forkClient: JsonRpcClient;
  forkBlockNumber: bigint;
  forkBlockTimestamp: number;
  forkBlockHash: string;
}> {
  const provider = new HttpProvider(
    forkConfig.jsonRpcUrl,
    HARDHAT_NETWORK_NAME,
    forkConfig.httpHeaders,
    FORK_HTTP_TIMEOUT
  );

  const networkId = await getNetworkId(provider);
  const actualMaxReorg = getLargestPossibleReorg(networkId);
  const maxReorg = actualMaxReorg ?? FALLBACK_MAX_REORG;

  const latestBlock = await getLatestBlockNumber(provider);
  const lastSafeBlock = getLastSafeBlock(latestBlock, maxReorg);

  let forkBlockNumber;
  if (forkConfig.blockNumber !== undefined) {
    if (forkConfig.blockNumber > latestBlock) {
      // eslint-disable-next-line @nomicfoundation/hardhat-internal-rules/only-hardhat-error
      throw new Error(
        `Trying to initialize a provider with block ${forkConfig.blockNumber} but the current block is ${latestBlock}`
      );
    }

    if (forkConfig.blockNumber > lastSafeBlock) {
      const confirmations = latestBlock - BigInt(forkConfig.blockNumber) + 1n;
      const requiredConfirmations = maxReorg + 1n;
      console.warn(
        chalk.yellow(
          `You are forking from block ${
            forkConfig.blockNumber
          }, which has less than ${requiredConfirmations} confirmations, and will affect Hardhat Network's performance.
Please use block number ${lastSafeBlock} or wait for the block to get ${
            requiredConfirmations - confirmations
          } more confirmations.`
        )
      );
    }

    forkBlockNumber = BigInt(forkConfig.blockNumber);
  } else {
    forkBlockNumber = BigInt(lastSafeBlock);
  }

  const block = await getBlockByNumber(provider, forkBlockNumber);

  const forkBlockTimestamp = rpcQuantityToNumber(block.timestamp) * 1000;

  const cacheToDiskEnabled =
    forkConfig.blockNumber !== undefined && forkCachePath !== undefined;

  const forkClient = new JsonRpcClient(
    provider,
    networkId,
    latestBlock,
    maxReorg,
    cacheToDiskEnabled ? forkCachePath : undefined
  );

  const forkBlockHash = block.hash;

  assertHardhatInvariant(
    forkBlockHash !== null,
    "Forked block should have a hash"
  );

  return { forkClient, forkBlockNumber, forkBlockTimestamp, forkBlockHash };
}

async function getBlockByNumber(
  provider: HttpProvider,
  blockNumber: bigint
): Promise<RpcBlockOutput> {
  const rpcBlockOutput = (await provider.request({
    method: "eth_getBlockByNumber",
    params: [numberToRpcQuantity(blockNumber), false],
  })) as RpcBlockOutput;

  return rpcBlockOutput;
}

async function getNetworkId(provider: HttpProvider) {
  const networkIdString = (await provider.request({
    method: "net_version",
  })) as string;
  return parseInt(networkIdString, 10);
}

async function getLatestBlockNumber(provider: HttpProvider) {
  const latestBlockString = (await provider.request({
    method: "eth_blockNumber",
  })) as string;

  const latestBlock = BigInt(latestBlockString);
  return latestBlock;
}

export function getLastSafeBlock(
  latestBlock: bigint,
  maxReorg: bigint
): bigint {
  // Design choice: if latestBlock - maxReorg results in a negative number then the latestBlock block will be used.
  // This decision is based on the assumption that if maxReorg > latestBlock then there is a high probability that the fork is occurring on a devnet.
  return latestBlock - maxReorg >= 0 ? latestBlock - maxReorg : latestBlock;
}
