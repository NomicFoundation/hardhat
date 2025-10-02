[![npm](https://img.shields.io/npm/v/@nomiclabs/hardhat-etherscan.svg)](https://www.npmjs.com/package/@nomiclabs/hardhat-etherscan) [![hardhat](https://v2.hardhat.org/buidler-plugin-badge.svg?1)](https://hardhat.org)

# hardhat-etherscan

The `@nomiclabs/hardhat-etherscan` plugin is deprecated in favor of our new [`@nomicfoundation/hardhat-verify`](/packages/hardhat-verify) plugin.

## Migrating to `hardhat-verify`

`hardhat-verify` is a drop-in replacement of `hardhat-etherscan`. To migrate to it:

1. Uninstall the `@nomiclabs/hardhat-etherscan` package
2. Install the `@nomicfoundation/hardhat-verify` package
3. Update your Hardhat config to import `@nomicfoundation/hardhat-verify` instead of `@nomiclabs/hardhat-etherscan`
