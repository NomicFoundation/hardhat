// reused from ethers.js
import { BN } from "ethereumjs-util";

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
