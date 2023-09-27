# Testing with Web3.js & Truffle

:::tip

Read [this guide](/hardhat-runner/docs/guides/test-contracts.md) to learn about our recommended approach to testing contracts.

:::

Hardhat allows you to use Truffle to test your smart contracts. This mainly means compatibility with the [`@truffle/contract`](https://www.npmjs.com/package/@truffle/contract) package to interact with your smart contracts.

Truffle 4 and Truffle 5 are supported using the `@nomiclabs/hardhat-truffle4` and `@nomiclabs/hardhat-truffle5` plugins respectively.

Let's see how to do this creating a new Hardhat project.

Run these to start:

```
mkdir my-project
cd my-project
npm init --yes
npm install --save-dev hardhat
```

Now run `npx hardhat init` inside your project folder and select `Create an empty hardhat.config.js`.

Let's now install the `Truffle` and `Web3.js` plugins, as well as `web3.js` itself.

```
npm install --save-dev @nomiclabs/hardhat-truffle5 @nomiclabs/hardhat-web3 'web3@^1.0.0-beta.36'
```

Enable the Truffle 5 plugin on your Hardhat config file by requiring it:

```js{1}
require("@nomiclabs/hardhat-truffle5");

module.exports = {
  solidity: "0.7.3"
};
```

Create a folder named `contracts` inside your project. Add a file named `Greeter.sol`, and copy and paste this code:

```c
pragma solidity ^0.7.0;

contract Greeter {

    string greeting;

    constructor(string memory _greeting) {
        greeting = _greeting;
    }

    function greet() public view returns (string memory) {
        return greeting;
    }

    function setGreeting(string memory _greeting) public {
        greeting = _greeting;
    }

}
```

## Writing a test

Create a new directory called `test` inside your project root directory and create a new file called `Greeter.js`.

Let's start with the code below. We'll explain it next, but for now paste this into `Greeter.js`:

```js
const Greeter = artifacts.require("Greeter");

// Traditional Truffle test
contract("Greeter", (accounts) => {
  it("Should return the new greeting once it's changed", async function () {
    const greeter = await Greeter.new("Hello, world!");
    assert.equal(await greeter.greet(), "Hello, world!");

    await greeter.setGreeting("Hola, mundo!");

    assert.equal(await greeter.greet(), "Hola, mundo!");
  });
});

// Vanilla Mocha test. Increased compatibility with tools that integrate Mocha.
describe("Greeter contract", function () {
  let accounts;

  before(async function () {
    accounts = await web3.eth.getAccounts();
  });

  describe("Deployment", function () {
    it("Should deploy with the right greeting", async function () {
      const greeter = await Greeter.new("Hello, world!");
      assert.equal(await greeter.greet(), "Hello, world!");

      const greeter2 = await Greeter.new("Hola, mundo!");
      assert.equal(await greeter2.greet(), "Hola, mundo!");
    });
  });
});
```

As you can see in the first line, the artifacts object is present in the global scope and you can use it to access the Truffle contract abstractions.

```js
const Greeter = artifacts.require("Greeter");
```

These examples show two approaches towards testing:

- Using `contract()`, which is the traditional way to test with Truffle
- Using `describe()`, which is the traditional way to test using Mocha

Truffle runs its tests with Mocha, but a few tools that integrate Mocha don't expect `contract()` and don't always work well. We recommend using the `describe()` approach.

You can run these tests by running `npx hardhat test`:

```
$ npx hardhat test

Contract: Greeter
    ✓ Should return the new greeting once it's changed (265ms)

  Greeter contract
    Deployment
      ✓ Should deploy with the right greeting (114ms)


  2 passing (398ms)
```

If you want to use Truffle Migrations to initialize your tests and call `deployed()` on the contract abstractions, both `@nomiclabs/hardhat-truffle4` and `@nomiclabs/hardhat-truffle5` offer a fixtures feature to make this possible. Take a look at the [Truffle migration guide](./truffle-migration.md) to learn more.

## Using Web3.js

To use Web3.js in your tests, an instance of it is available in the global scope. You can see this in the `describe()` test in `Greeter.js`:

```js{20}
const Greeter = artifacts.require("Greeter");

// Traditional Truffle test
contract("Greeter", accounts => {
  it("Should return the new greeting once it's changed", async function() {
    const greeter = await Greeter.new("Hello, world!");
    assert.equal(await greeter.greet(), "Hello, world!");

    await greeter.setGreeting("Hola, mundo!");

    assert.equal(await greeter.greet(), "Hola, mundo!");
  });
});

// Vanilla Mocha test. Increased compatibility with tools that integrate Mocha.
describe("Greeter contract", function() {
  let accounts;

  before(async function() {
    accounts = await web3.eth.getAccounts();
  });

  describe("Deployment", function() {
    it("Should deploy with the right greeting", async function() {
      const greeter = await Greeter.new("Hello, world!");
      assert.equal(await greeter.greet(), "Hello, world!");

      const greeter2 = await Greeter.new("Hola, mundo!");
      assert.equal(await greeter2.greet(), "Hola, mundo!");
    });
  });
});
```

Checkout the plugin's [README file](https://github.com/NomicFoundation/hardhat/tree/main/packages/hardhat-truffle5) for more information about it.

[hardhat runtime environment]: /documentation/#hardhat-runtime-environment-hre
