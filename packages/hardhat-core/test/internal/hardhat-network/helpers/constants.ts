// reused from ethers.js
import { BN, toBuffer } from "ethereumjs-util";

export const DAI_ADDRESS = toBuffer(
  "0x6b175474e89094c44da98b954eedeac495271d0f"
);

export const DAI_CONTRACT_LENGTH = 7904;

export const WETH_ADDRESS = toBuffer(
  "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
);

export const UNISWAP_FACTORY_ADDRESS = toBuffer(
  "0xc0a47dFe034B400B47bDaD5FecDa2621de6c4d95"
);

export const EMPTY_ACCOUNT_ADDRESS = toBuffer(
  "0x1234567890abcdef1234567890abcdef12345678"
);

// top Ether holder as of 24.08.2020
export const BITFINEX_WALLET_ADDRESS = toBuffer(
  "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
);

export const DAI_TOTAL_SUPPLY_STORAGE_POSITION = toBuffer([1]);

// 10496585 block number was chosen for no particular reason
export const BLOCK_NUMBER_OF_10496585 = new BN(10496585);
export const BLOCK_HASH_OF_10496585 = toBuffer(
  "0x71d5e7c8ff9ea737034c16e333a75575a4a94d29482e0c2b88f0a6a8369c1812"
);
export const TOTAL_DIFFICULTY_OF_BLOCK_10496585 = new BN(
  "16430631039734293348166"
);
export const FIRST_TX_HASH_OF_10496585 = toBuffer(
  "0xed0b0b132bd693ef34a72084f090df07c5c3a2ec019d76316da040d4222cdfb8"
);
export const LAST_TX_HASH_OF_10496585 = toBuffer(
  "0xd809fb6f7060abc8de068c7a38e9b2b04530baf0cc4ce9a2420d59388be10ee7"
);

export const NULL_BYTES_32 = toBuffer(`0x${"0".repeat(64)}`);
