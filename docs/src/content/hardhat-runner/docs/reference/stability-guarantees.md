# Stability guarantees

Hardhat doesn't follow semver strictly, but it still aims to be a stable and easy-to-use platform, and we won't introduce breaking changes without notice. Instead, we may introduce breaking changes in some minor versions.

Those breaking changes are part of these categories:

- Changing the default config of Hardhat Network
- Dropping support for unmaintained Node.js versions

## Hardhat Network default config

Hardhat Network should closely resemble Ethereum Mainnet by default. Given that Ethereum does introduce breaking changes in the form of hardforks or network upgrades, we need to do the same with its default config. For example, we would eventually change the default `hardfork` config field in the network `hardhat`.

We will only introduce these changes when a hardfork activates on Mainnet. This will be introduced in a minor version that changes the default `hardfork`, but will also modify other fields, like `blockGasLimit`, to match those of Mainnet.

## Node.js versions support

Hardhat supports every currently maintained LTS Node.js version, up to two months after its end-of-life. After that period of time, we will stop testing against it, and print a warning when trying to use it. At that point, we will release a new minor version.

We recommend running Hardhat using the current LTS Node.js version. You can learn about it [here](https://nodejs.org/en/about/previous-releases).

## How to avoid the breaking changes introduced by Hardhat

In general, there's no need to avoid them. Using Hardhat with any actively maintained Node.js version means that you'd be running with defaults that closely resemble Ethereum Mainnet.

If you want to play extra-safe, and make sure your project will continue running years down the road using the same Node.js version, please install Hardhat using a [tilde range](https://docs.npmjs.com/cli/v6/using-npm/semver#tilde-ranges-123-12-1).
