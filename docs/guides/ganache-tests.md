# Running tests with Ganache

We recommend using the built-in [Buidler EVM](../buidler-evm/README.md) network to test your
smart contracts, as it generates [combined JavaScript and Solidity stack traces](../buidler-evm/README.md#solidity-stack-traces),
making debugging easier.

If you still want to run your tests using Ganache, you can do it in two ways.

## Manually running Ganache

You don't need to do anything especial to use Ganache if you don't want to.

Just start Ganache and run Buidler with

```
npx buidler --network localhost test
```

## Using the `buidler-ganache` plugin

If you don't want to manually start and stop Ganache every time, you can use
the `buidler-ganache` plugin.

This plugin creates a network called `ganache`, and automatically
starts and stops Ganache before and after running your tests and scripts.

To use it, you have to install it with `npm`

```
npm install --save-dev @nomiclabs/buidler-ganache
```

and add this line at the beginning of your `hardhat.config.js`

```js
usePlugin("@nomiclabs/buidler-ganache");
```

Finally, you can run your tests with
 
```
npx buidler --network ganache test
```
