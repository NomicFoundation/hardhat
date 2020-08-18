// reused from ethers.js
import { BN, bufferToHex, privateToAddress, toBuffer } from "ethereumjs-util";

export const INFURA_URL = `https://mainnet.infura.io/v3/84842078b09946638c03157f83405213`;

export const DAI_ADDRESS = Buffer.from(
  "6b175474e89094c44da98b954eedeac495271d0f",
  "hex"
);
export const WETH_ADDRESS = Buffer.from(
  "C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  "hex"
);
export const EMPTY_ACCOUNT_ADDRESS = Buffer.from(
  "1234567890abcdef1234567890abcdef12345678",
  "hex"
);

export const DAI_TOTAL_SUPPLY_STORAGE_POSITION = Buffer.from([1]);

// 10496585 block number was chosen for no particular reason
export const BLOCK_NUMBER_OF_10496585 = new BN(10496585);
export const BLOCK_HASH_OF_10496585 =
  "71d5e7c8ff9ea737034c16e333a75575a4a94d29482e0c2b88f0a6a8369c1812";
export const TOTAL_DIFFICULTY_OF_BLOCK_10496585 = new BN(
  "16430631039734293348166"
);
export const FIRST_TX_HASH_OF_10496585 = Buffer.from(
  "ed0b0b132bd693ef34a72084f090df07c5c3a2ec019d76316da040d4222cdfb8",
  "hex"
);

export const DEFAULT_HARDFORK = "istanbul";
export const DEFAULT_NETWORK_NAME = "TestNet";
export const DEFAULT_CHAIN_ID = 123;
export const DEFAULT_NETWORK_ID = 234;
export const DEFAULT_BLOCK_GAS_LIMIT = 6000000;
export const DEFAULT_USE_JSON_RPC = false;
export const DEFAULT_ALLOW_UNLIMITED_CONTRACT_SIZE = false;

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
