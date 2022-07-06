# Migrating away from hardhat-waffle

Our recommended setup used to include [Waffle] using our [`hardhat-waffle`] plugin.

We now recommend using our [Hardhat Chai Matchers] and [Hardhat Network Helpers] instead.

If you migrate to these packages, you'll get more functionality, like support for Solidity custom errors and native `bigint`, and a more reliable testing experience.

To learn how to start using them, read [this guide](../../../hardhat-chai-matchers/docs/migrate-from-waffle.md).

## Using the Hardhat Toolbox

You can get our recommended setup by installing [`@nomicfoundation/hardhat-toolbox`], a single plugin that has everything you need.

When you use it, you'll be able to:

- Deploy and interact with your contracts using [ethers.js](https://docs.ethers.io/v5/) and the [`hardhat-ethers`](/hardhat-runner/plugins/nomiclabs-hardhat-ethers) plugin.
- Test your contracts with [Mocha](https://mochajs.org/), [Chai](https://chaijs.com/) and our own [Hardhat Chai Matchers](/hardhat-chai-matchers) plugin.
- Interact with Hardhat Network with our [Hardhat Network Helpers](/hardhat-network-helpers).
- Verify the source code of your contracts with the [hardhat-etherscan](/hardhat-runner/plugins/nomiclabs-hardhat-etherscan) plugin.
- Get metrics on the gas used by your contracts with the [hardhat-gas-reporter](https://github.com/cgewecke/hardhat-gas-reporter) plugin.
- Measure your tests coverage with [solidity-coverage](https://github.com/sc-forks/solidity-coverage).
- And, if you are using TypeScript, get type bindings for your contracts with [Typechain](https://github.com/dethcrypto/TypeChain/).

[waffle]: https://getwaffle.io
[`hardhat-waffle`]: ../../plugins/nomiclabs-hardhat-waffle
[`@nomicfoundation/hardhat-toolbox`]: ../../plugins/nomicfoundation-hardhat-toolbox
[hardhat chai matchers]: /hardhat-chai-matchers
[hardhat network helpers]: /hardhat-network-helpers
