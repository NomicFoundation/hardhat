import {
  bytesToHex as bufferToHex,
  privateToAddress,
  toBytes,
} from "@ethereumjs/util";

import {
  HardhatNetworkMempoolConfig,
  HardhatNetworkMiningConfig,
} from "../../../../src/types";
import { ALCHEMY_URL, INFURA_URL } from "../../../setup";

import { useProvider, UseProviderOptions } from "./useProvider";

function toBuffer(x: Parameters<typeof toBytes>[0]) {
  return Buffer.from(toBytes(x));
}

export const DEFAULT_HARDFORK = "shanghai";
export const DEFAULT_CHAIN_ID = 123;
export const DEFAULT_NETWORK_ID = 234;
export const DEFAULT_BLOCK_GAS_LIMIT = 6000000n;
export const DEFAULT_USE_JSON_RPC = false;
export const DEFAULT_ALLOW_UNLIMITED_CONTRACT_SIZE = false;

export const DEFAULT_MEMPOOL_CONFIG: HardhatNetworkMempoolConfig = {
  order: "priority",
};
export const DEFAULT_MINING_CONFIG: HardhatNetworkMiningConfig = {
  auto: true,
  interval: 0,
  mempool: DEFAULT_MEMPOOL_CONFIG,
};

// Assumptions:
// - First account has sent some transactions on mainnet
// - Second and third accounts have a 0 nonce
export const DEFAULT_ACCOUNTS = [
  {
    privateKey:
      "0xe331b6d69882b4cb4ea581d88e0b604039a3de5967688d3dcffdd2270c0fd109",
    balance: 10n ** 21n,
  },
  {
    privateKey:
      "0xe331b6d69882b4cb4ea581d88e0b604039a3de5967688d3dcffdd2270c0fd10a",
    balance: 10n ** 21n,
  },
  {
    privateKey:
      "0xe331b6d69882b4cb4ea581d88e0b604039a3de5967688d3dcffdd2270c0fd10b",
    balance: 10n ** 21n,
  },
  {
    privateKey:
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    balance: 10n ** 21n,
  },
];
export const DEFAULT_ACCOUNTS_ADDRESSES = DEFAULT_ACCOUNTS.map((account) =>
  bufferToHex(privateToAddress(toBuffer(account.privateKey))).toLowerCase()
);
export const DEFAULT_ACCOUNTS_BALANCES = DEFAULT_ACCOUNTS.map(
  (account) => account.balance
);

export const PROVIDERS = [
  {
    name: "Hardhat Network",
    isFork: false,
    isJsonRpc: false,
    networkId: DEFAULT_NETWORK_ID,
    chainId: DEFAULT_CHAIN_ID,
    useProvider: (options: UseProviderOptions = {}) => {
      useProvider({ useJsonRpc: false, loggerEnabled: true, ...options });
    },
  },
  {
    name: "JSON-RPC",
    isFork: false,
    isJsonRpc: true,
    networkId: DEFAULT_NETWORK_ID,
    chainId: DEFAULT_CHAIN_ID,
    useProvider: (options: UseProviderOptions = {}) => {
      useProvider({ useJsonRpc: true, loggerEnabled: true, ...options });
    },
  },
];

export const INTERVAL_MINING_PROVIDERS = [
  {
    name: "Hardhat Network",
    isFork: false,
    isJsonRpc: false,
    useProvider: (options: UseProviderOptions = {}) => {
      useProvider({
        useJsonRpc: false,
        loggerEnabled: true,
        mining: {
          auto: false,
          interval: 100,
          mempool: DEFAULT_MEMPOOL_CONFIG,
        },
        ...options,
      });
    },
  },
  {
    name: "JSON-RPC",
    isFork: false,
    isJsonRpc: true,
    useProvider: (options: UseProviderOptions = {}) => {
      useProvider({
        useJsonRpc: true,
        loggerEnabled: true,
        mining: {
          auto: false,
          interval: 100,
          mempool: DEFAULT_MEMPOOL_CONFIG,
        },
        ...options,
      });
    },
  },
];

export const FORKED_PROVIDERS: Array<{
  rpcProvider: string;
  jsonRpcUrl: string;
  useProvider: (options?: UseProviderOptions) => void;
}> = [];

if (ALCHEMY_URL !== undefined) {
  const url = ALCHEMY_URL;

  PROVIDERS.push({
    name: "Alchemy Forked",
    isFork: true,
    isJsonRpc: false,
    networkId: DEFAULT_NETWORK_ID,
    chainId: DEFAULT_CHAIN_ID,
    useProvider: (options: UseProviderOptions = {}) => {
      useProvider({
        useJsonRpc: false,
        loggerEnabled: true,
        forkConfig: { jsonRpcUrl: url, blockNumber: options.forkBlockNumber },
        ...options,
      });
    },
  });

  INTERVAL_MINING_PROVIDERS.push({
    name: "Alchemy Forked",
    isFork: true,
    isJsonRpc: false,
    useProvider: (options: UseProviderOptions = {}) => {
      useProvider({
        useJsonRpc: false,
        loggerEnabled: true,
        forkConfig: { jsonRpcUrl: url, blockNumber: options.forkBlockNumber },
        mining: {
          auto: false,
          interval: 100,
          mempool: DEFAULT_MEMPOOL_CONFIG,
        },
        ...options,
      });
    },
  });

  FORKED_PROVIDERS.push({
    rpcProvider: "Alchemy",
    jsonRpcUrl: url,
    useProvider: (options: UseProviderOptions = {}) => {
      useProvider({
        useJsonRpc: false,
        loggerEnabled: true,
        forkConfig: { jsonRpcUrl: url, blockNumber: options.forkBlockNumber },
        ...options,
      });
    },
  });
}

if (INFURA_URL !== undefined) {
  const url = INFURA_URL;

  FORKED_PROVIDERS.push({
    rpcProvider: "Infura",
    jsonRpcUrl: url,
    useProvider: (options: UseProviderOptions = {}) => {
      useProvider({
        useJsonRpc: false,
        loggerEnabled: true,
        forkConfig: { jsonRpcUrl: url, blockNumber: options.forkBlockNumber },
        ...options,
      });
    },
  });
}
