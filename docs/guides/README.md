---
prev: false
---

# Getting started

In this guide, we’ll explore how to start using Buidler in your Ethereum project.

**What makes Buidler special? What can you achieve with it?**

Buidler allows you to streamline your development workflow by making it easy to incorporate other tools into your process, as well as granting you all the flexibility you need to adapt the tools to your exact needs. What dependencies and tools you use is up to you. Buidler will only help you orchestrate them.

Out of the box, you can compile your Solidity code, install plugins and create your own tasks.

Let’s install it to try it out:

```bash
npm install @nomiclabs/buidler
```

To create a Buidler project just run `npx buidler` in your project folder:

![](https://cdn-images-1.medium.com/max/1600/1*Ri6bdhh0eIJTJT31dy6DhQ.png)

Let’s create the sample project and go through the steps to try out the sample task, compile, test and deploy the sample contract.

To first get a quick sense of what's available and what's going on, run `npx buidler` in your project folder:
```
$ npx buidler
Buidler version 1.0.0-beta.9

Usage: buidler [GLOBAL OPTIONS] <TASK> [TASK OPTIONS]

GLOBAL OPTIONS:

  --config              A Buidler config file.
  --emoji               Use emoji in messages.
  --help                Shows this message.
  --network             The network to connect to. (default: "develop")
  --show-stack-traces   Show stack traces.
  --version             Shows buidler's version.


AVAILABLE TASKS:

  accounts      Prints a list of the available accounts
  clean         Clears the cache and deletes all artifacts
  compile       Compiles the entire project, building all artifacts
  console       Opens a buidler console
  flatten       Flattens and prints all contracts and their dependencies
  help          Prints this message
  run           Runs a user-defined script after compiling the project
  test          Runs mocha tests

To get help for a specific task run: buidler help [task]
```

This is the list of built-in tasks, and the sample `accounts` task. Further ahead, when you start using plugins to add more functionality, tasks defined by those will also show up here. This is your starting point to find out what tasks are available to run. 

If you take a look at `buidler.config.js`, you will find the definition of the task `accounts`:

```js
task("accounts", "Prints a list of the available accounts", async () => {
  const accounts = await ethereum.send("eth_accounts");

  console.log("Accounts:", accounts);
});

module.exports = {};
```

_NOTE: in the Buidler 1.0.0 beta release we’ve disabled the automatic ganache instance feature to keep working on its stability, so you’ll need to run it manually. This feature will be back by the time we ship the stable release. Please run `ganache-cli` in a separate terminal to keep going._

To run it, try `npx buidler accounts`:

```
$ npx buidler accounts
Accounts: [ '0x9d6bd5939d6e2629f2bdffac5417ba22e31ea6a5',
  '0xdb981036cf05c2219121c778578300cc6b91bd34',
  '0xdc66201940a7ced201b1e4ed9fa72047fa029dc1',
  '0x6a0ead959f30e51e86bb2285ab5e36a68ac22d98',
  '0x9bc40d79da06d28d57982eb9e40cd0ba095cdae8',
  '0xcff265234958dfe27e7e1bbfcbd253ac4882bcae',
  '0x13447a4658db5f9bdab4f82656958b7688c4435f',
  '0x7dce2d4229cb4ccbcd050ffe7bc405d936314a73',
  '0x2f52b335f53f16a5d9727da8d2231923fa04f0c5',
  '0x23024feafd6587ef4576496484fee2796ba66e3c' ]
```

You will learn how to create your own tasks in the [next guide](/guides/create-task.md).

Next, if you take a look at `contracts/`, you should be able to find `Greeter.sol:`

```js
pragma solidity ^0.5.1;

contract Greeter {

    string greeting;

    constructor(string memory _greeting) public {
        greeting = _greeting;
    }

    function greet() public view returns (string memory) {
        return greeting;
    }

}
```

To compile it, simply run:

```bash
npx buidler compile
```

Now, you’ll likely want to run some tests. Out of the box Buidler provides an [EIP1193-compatible provider](https://eips.ethereum.org/EIPS/eip-1193), which is the new standard for an Ethereum JavaScript interface, but it can be somewhat rough to use directly. That's what the Ethereum libraries plugins are for. Take a look at the [plugins section](/plugins/) for the full list.

The sample project comes with a test written using the Ethereum provider directly, but let’s also install `buidler-truffle5` and test out the Truffle 5 integration:

```bash
npm install @nomiclabs/buidler-truffle5 @nomiclabs/buidler-web3 web3
```

Add `usePlugin("@nomiclabs/buidler-truffle5")` to the top of your `buidler.config.js`, so that it looks like this:
```js
usePlugin("@nomiclabs/buidler-truffle5")

task("accounts", "Prints a list of the available accounts", async () => {
  const accounts = await ethereum.send("eth_accounts");

  console.log("Accounts:", accounts);
});

module.exports = {};
```

Change `test/sample-test.js` to:

```js
const assert = require("assert");

describe("Ethereum provider", function() {
  it("Should return the accounts", async function() {
    const accounts = await ethereum.send("eth_accounts");
    assert(accounts.length !== 0, "No account was returned");
  });
});

contract("Greeter", function() {
  it("Should give the correct greeting", async function() {
    const Greeter = artifacts.require("Greeter");
    const greeter = await Greeter.new("Hello, Buidler!");

    assert.equal(await greeter.greet(), "Hello, Buidler!");
  });
});
```

And run `npx buidler test`

```
$ npx buidler test
Compiling...
Compiled 1 contract successfully


  Ethereum provider
    ✓ Should return the accounts

  Greeter
    ✓ Should give the correct greeting (376ms)


  2 passing (383ms)
```

Next, to deploy the contract we will use the Truffle plugin again. Create a file `deploy.js` in `scripts/`:

```js
async function main() {
  const Greeter = artifacts.require("Greeter");

  const greeter = await Greeter.new("Hello, Buidler!");
  console.log("Greeter deployed to:", greeter.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
```
And run it with `npx buidler run scripts/deploy.js`:
```
$ npx buidler run scripts/deploy.js
All contracts have already been compiled, skipping compilation.
Greeter deployed to: 0x080f632fB4211CFc19d1E795F3f3109f221D44C9
```

Congrats! You have created a project, ran a Buidler task, compiled a smart contract, installed a Truffle integration plugin, wrote and ran a test using the Truffle plugin, and deployed a contract.

These cover the basics to start using Buidler. Move on to the next section to learn more.

For any questions or feedback you may have, you can find us in the [Buidler Support Telegram group](http://t.me/BuidlerSupport).
