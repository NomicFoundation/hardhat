# Configuration

Hardhat Ignition has configuration options at both the global and network level.

## Configuration options

You can use the `ignition` field in the Hardhat config to customize how Hardhat Ignition behaves:

```js
// hardhat.config.js
module.exports = {
  ignition: {
    blockPollingInterval: 1_000,
    timeBeforeBumpingFees: 3 * 60 * 1_000,
    maxFeeBumps: 4,
    requiredConfirmations: 5,
  },
};
```

These are the different options you can add to your Hardhat config file.

### `blockPollingInterval`

The time in milliseconds that Hardhat Ignition will wait between checks that a new block has been minted.

Default value: 1000 milliseconds (1 second).

### `timeBeforeBumpingFees`

The time in milliseconds to wait before bumping the fee for an unconfirmed transaction.

Default value: 180,000 milliseconds (3 minutes).

### `maxFeeBumps`

The number of times an unconfirmed transaction will have its fee bumped before Hardhat Ignition considers it timed out.

Default value: 4.

### `requiredConfirmations`

The number of confirmations Hardhat Ignition waits before considering a transaction as complete. This provides control over block re-org risk.

Default value: 5

## Network configuration options

You can use the `ignition` field under specific network configurations to customize deployments on a per-network basis:

```js
// hardhat.config.js
module.exports = {
  networks: {
    sepolia: {
      // ...
      ignition: {
        maxFeePerGasLimit: 50_000_000_000n, // 50 gwei
      },
      // ...
    },
  },
};
```

These are the different options you can add to the per-network `ignition` config.

### `maxFeePerGasLimit`

If set, places a limit on the maximum fee per gas that Hardhat Ignition will allow when sending transactions. If Hardhat Ignition's calculated max fee per gas is higher than the limit, the deployment will be stopped with an error. This is useful for preventing accidental high fees during busy periods.

Default value: undefined
