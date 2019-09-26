# Migrating from Truffle

To migrate an existing Truffle project onto Buidler there are two main things to consider: testing and deployment.

When it comes to unit tests, there are two Buidler plugins that support the Truffle testing APIs: `buidler-truffle4` and `buidler-truffle5`. Both plugins support Solidity 5. Generally, using these you can run your existing tests with Buidler.

If your project uses [Truffle Migrations](https://www.trufflesuite.com/docs/truffle/getting-started/running-migrations) to initialize your testing environment (i.e. your tests call `deployed()`), then there's some more work to do to be able to run your tests.

The Truffle plugin currently doesn't fully support Migrations. Instead, you need to adapt your Migrations to become `buidler-truffle5` fixtures. Generally this entails calling `setAsDeployed()` on each of the contract abstractions you want to test to set an instance of the deployed contract.

For this migration
```js
const Greeter = artifacts.require("Greeter");

module.exports = function(deployer) {
  deployer.deploy(Greeter);
};
```
this is what the `buidler-truffle5` fixture would look like
```js
const Greeter = artifacts.require("Greeter");

module.exports = async () => {
  const greeter = await Greeter.new();
  Greeter.setAsDeployed(greeter);
}
```

These fixtures will run on Mocha's `before`, which runs before each `contract()` function is run -- just like Truffle does.

When it comes to deploying, there are no plugins that implement a deployment system for Buidler yet, but there's [an open issue](https://github.com/nomiclabs/buidler/issues/381) with some ideas and we'd value your opinion on how to best design it.

For any help or feedback you may have, you can find us in the [Buidler Support Telegram group](http://t.me/BuidlerSupport).