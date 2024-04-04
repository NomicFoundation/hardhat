# Running tests with Ganache

:::warning

Rather than using Ganache, we recommend using the built-in [Hardhat Network](../../../hardhat-network/docs/overview/index.md) network to test your smart contracts, as it generates [combined JavaScript and Solidity stack traces](../../../hardhat-network/docs/overview/index.md#solidity-stack-traces), making debugging easier.

If you still want to run your tests using Ganache, you can do it in one of the following two ways.

:::

## Manually running Ganache

You don't need to do anything special to use Ganache if you don't want to.

Just start Ganache and then run Hardhat with

```
npx hardhat --network localhost test
```

## Using the `hardhat-ganache` plugin

If you don't want to manually start and stop Ganache every time, you can use the `hardhat-ganache` plugin.

This plugin creates a network called `ganache`, and automatically starts and stops Ganache before and after running your tests.

To use it, you have to install it with npm

```
npm install --save-dev @nomiclabs/hardhat-ganache
```

and add this line at the beginning of your `hardhat.config.js`

```js
require("@nomiclabs/hardhat-ganache");
```

Finally, you can run your tests with

```
npx hardhat --network ganache test
```
