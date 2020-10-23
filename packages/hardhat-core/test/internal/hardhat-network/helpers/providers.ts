import { BN, bufferToHex, privateToAddress, toBuffer } from "ethereumjs-util";

import { ALCHEMY_URL, INFURA_URL } from "../../../setup";

import { REMOTE_CHAIN_ID, REMOTE_NETWORK_ID } from "./constants";
import { useProvider } from "./useProvider";

export const DEFAULT_HARDFORK = "istanbul";
export const DEFAULT_NETWORK_NAME = "TestNet";
export const DEFAULT_CHAIN_ID = 123;
export const DEFAULT_NETWORK_ID = 234;
export const DEFAULT_BLOCK_GAS_LIMIT = 6000000;
export const DEFAULT_USE_JSON_RPC = false;
export const DEFAULT_ALLOW_UNLIMITED_CONTRACT_SIZE = false;
export const DEFAULT_AUTOMINE = true;
export const DEFAULT_ACCOUNTS = [
  {
    privateKey:
      "0xe331b6d69882b4cb4ea581d88e0b604039a3de5967688d3dcffdd2270c0fd109",
    balance: new BN(10).pow(new BN(18)),
  },
  {
    privateKey:
      "0xe331b6d69882b4cb4ea581d88e0b604039a3de5967688d3dcffdd2270c0fd10a",
    balance: new BN(10).pow(new BN(18)),
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
    networkId: DEFAULT_NETWORK_ID,
    chainId: DEFAULT_CHAIN_ID,
    useProvider: () => {
      useProvider(false);
    },
  },
  {
    name: "JSON-RPC",
    isFork: false,
    networkId: DEFAULT_NETWORK_ID,
    chainId: DEFAULT_CHAIN_ID,
    useProvider: () => {
      useProvider(true);
    },
  },
];

export const FORKED_PROVIDERS: Array<{
  rpcProvider: string;
  jsonRpcUrl: string;
  useProvider: () => void;
}> = [];

if (ALCHEMY_URL !== undefined && ALCHEMY_URL !== "") {
  const url = ALCHEMY_URL;

  PROVIDERS.push({
    name: "Alchemy Forked",
    isFork: true,
    networkId: REMOTE_NETWORK_ID,
    chainId: REMOTE_CHAIN_ID,
    useProvider: () => {
      useProvider(false, { jsonRpcUrl: url });
    },
  });

  FORKED_PROVIDERS.push({
    rpcProvider: "Alchemy",
    jsonRpcUrl: url,
    useProvider: () => {
      useProvider(false, { jsonRpcUrl: url });
    },
  });
}

if (INFURA_URL !== undefined && INFURA_URL !== "") {
  const url = INFURA_URL;

  FORKED_PROVIDERS.push({
    rpcProvider: "Infura",
    jsonRpcUrl: url,
    useProvider: () => {
      useProvider(false, { jsonRpcUrl: url });
    },
  });
}
