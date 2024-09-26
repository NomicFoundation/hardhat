# Hardhat Network Helpers

Hardhat Network Helpers is a library that provides a set of utility functions to interact with the [Hardhat Network](https://hardhat.org/hardhat-network/docs).

### Usage

```javascript
const { networkHelpers } = await hre.network.connect();

// Network helpers methods exposed via `networkHelpers`
await networkHelpers.mine();

// Time methods exposed via `time`
await networkHelpers.time.increase(1);

// Duration methods exposed via `duration`
networkHelpers.time.duration.days(1);
```

### Tests

Temporary solution to run manual tests until the V3 node is ready.

1. Start a node in Hardhat V2: `npx hardhat node`
2. Run the tests: `pnpm test:tmp`
