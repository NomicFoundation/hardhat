import { BackwardsCompatibilityProviderAdapter } from "../src/internal/core/providers/backwards-compatibility";
import { ModulesLogger } from "../src/internal/hardhat-network/provider/modules/logger";
import { ForkConfig } from "../src/internal/hardhat-network/provider/node-types";
import { RpcDebugTraceOutput } from "../src/internal/hardhat-network/provider/output";
import { HardhatNetworkProvider } from "../src/internal/hardhat-network/provider/provider";
import { makeForkClient } from "../src/internal/hardhat-network/provider/utils/makeForkClient";
import { FORK_TESTS_CACHE_PATH } from "../test/internal/hardhat-network/helpers/constants";
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_ALLOW_UNLIMITED_CONTRACT_SIZE,
  DEFAULT_CHAIN_ID,
  DEFAULT_HARDFORK,
  DEFAULT_NETWORK_ID,
} from "../test/internal/hardhat-network/helpers/providers";
import { assertEqualTraces } from "../test/internal/hardhat-network/provider/utils/assertEqualTraces";

async function main(
  rpcUrl: string,
  txHash: string,
  blockNumber: string | undefined
) {
  const forkConfig: ForkConfig = {
    jsonRpcUrl: rpcUrl,
    blockNumber: blockNumber !== undefined ? +blockNumber : undefined,
  };

  const { forkClient } = await makeForkClient(forkConfig);

  const txHashBuffer = Buffer.from(strip0x(txHash), "hex");

  const hardhatNetworkProvider = new HardhatNetworkProvider(
    {
      hardfork: DEFAULT_HARDFORK,
      chainId: DEFAULT_CHAIN_ID,
      networkId: DEFAULT_NETWORK_ID,
      blockGasLimit: 100000000,
      minGasPrice: 0n,
      throwOnTransactionFailures: true,
      throwOnCallFailures: true,
      automine: false,
      intervalMining: 0,
      genesisAccounts: DEFAULT_ACCOUNTS,
      allowUnlimitedContractSize: DEFAULT_ALLOW_UNLIMITED_CONTRACT_SIZE,
      forkConfig,
      forkCachePath: FORK_TESTS_CACHE_PATH,
      allowBlocksWithSameTimestamp: false,
    },
    new ModulesLogger(true)
  );

  const provider = new BackwardsCompatibilityProviderAdapter(
    hardhatNetworkProvider
  );

  const trace: RpcDebugTraceOutput = await provider.send(
    "debug_traceTransaction",
    [add0x(txHash)]
  );

  const expectedTrace = await forkClient.getDebugTraceTransaction(txHashBuffer);

  assertEqualTraces(trace, expectedTrace);
}

const rpcUrlArg = process.argv[2];
const txHashArg = process.argv[3];
const blockNumberArg = process.argv[4];

if (rpcUrlArg === undefined) {
  console.warn(
    "No rpcUrl given. Add the URL of an archive node with support for debug_traceTransaction."
  );
  usage();
}
if (txHashArg === undefined) {
  console.warn("No txHash given");
  usage();
}
if (blockNumberArg === undefined) {
  console.warn("No blockNumber given. Caching will be disabled.");
}

main(rpcUrlArg, txHashArg, blockNumberArg)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

function usage() {
  console.warn(
    "ts-node test-debug-trace-transaction.ts <rpcUrl> <txHash> <blockNumber>"
  );
  process.exit(1);
}

function add0x(s: string) {
  return s.toLowerCase().startsWith("0x") ? s : `0x${s}`;
}

function strip0x(s: string) {
  return s.toLowerCase().startsWith("0x") ? s.slice(2) : s;
}
