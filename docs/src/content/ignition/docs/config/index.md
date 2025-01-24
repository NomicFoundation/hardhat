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
    disableFeeBumping: false,
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

### `disableFeeBumping`

If set to `true`, Hardhat Ignition will not bump the fee for unconfirmed transactions. Overrides the `disableFeeBumping` option in the network configuration.

Default value: false

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
        maxPriorityFeePerGas: 2_000_000_000n, // 2 gwei
        gasPrice: 50_000_000_000n, // 50 gwei
        disableFeeBumping: false,
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

### `maxPriorityFeePerGas`

The maximum priority fee per gas, in wei, that Hardhat Ignition will use for gas fee calculations when sending transactions. If not set then Hardhat Ignition will try to use `eth_maxPriorityFeePerGas` if available, or default to 1 gwei.

Default value: undefined

### `gasPrice`

The gas price, in wei, that Hardhat Ignition will use for gas fee calculations when sending transactions. **This field only applies to deployments on the Polygon network. It will not be used on other networks even if set.**

Default value: undefined

### `disableFeeBumping`

If set to `true`, Hardhat Ignition will not bump the fee for unconfirmed transactions on this network. Is overridden by the top-level `disableFeeBumping` option.

Default value: false
