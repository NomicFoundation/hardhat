# hardhat-ethers

[Hardhat](https://hardhat.org) plugin for integration with [ethers.js](https://github.com/ethers-io/ethers.js/).

### Usage

```ts
const { ethers } = await hre.network.connect();

// ethers functionalities
ethers.isAddress("0x1234567890123456789012345678901234567890");

// ethers.Provider
await ethers.provider.getBlockNumber();

// Hardhat helper methods
await ethers.getSigners();
```

### Tests

Temporary solution to run manual tests until the V3 node is ready.

1. Start a node in Hardhat V2: `npx hardhat node`
2. Run the tests: `pnpm test:tmp`
