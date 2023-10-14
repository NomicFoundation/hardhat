# Configuration

You can customize how Hardhat Ignition works by modifying your Hardhat config.

To do so, you can set different config properties in the `ignition` field. For example:

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

## Configuration options

These are the different options you can add to your Hardhat config file.

### `blockPollingInterval`

The value of `blockPollingInterval` is the time in milliseconds between checks that a new block has been minted. The default value is 1000 milliseconds (aka 1 second).

### `timeBeforeBumpingFees`

The value of `timeBeforeBumpingFees` sets the time in milliseconds to wait for a transaction to be confirmed on-chain before bumping its fee. The default is 180.000 milliseconds (aka 3min).

### `maxFeeBumps`

The value of `maxFeeBumps` determines the number of times a transaction will have its fee bumped before Hardhat Ignition considers it timed out. The default is 4.

### `requiredConfirmations`

The value of `requiredConfirmations` is the number of confirmations Hardhat Ignition waits before considering a transaction as complete. This provides control over block re-org risk. The default number of confirmations is 5.
