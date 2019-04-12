---
prev: false
next: 'create-task'
---
# Getting started

In this guide, we’ll explore how to start using Buidler in your Ethereum project.

**What makes Buidler special? What can you achieve with it?**

Buidler allows you to streamline your development workflow by making it easy to incorporate other tools into your process, as well as granting you all the flexibility you need to adapt the tools to your exact needs. What dependencies and tools you use is up to you. Buidler will only help you orchestrate them.

Out of the box, you can compile your Solidity code, install plugins and create your own tasks.

Let’s install it to try it out:

`npm install @nomiclabs/buidler`

To create a Buidler project just run `npx buidler` in your project folder:

![](https://cdn-images-1.medium.com/max/1600/1*Ri6bdhh0eIJTJT31dy6DhQ.png)

Let’s create the sample project and go through the steps to try out the sample task, compile, test and deploy the sample contract.

If you take a look at `buidler.config.js`, you will find the definition of the task `accounts`:

```js
task("accounts", "Prints a list of the available accounts", async () => {
  const accounts = await ethereum.send("eth_accounts");

  console.log("Accounts:", accounts);
});

module.exports = {};
```

*NOTE: in the Buidler 1.0.0 beta release we’ve disabled the automatic ganache instance feature to keep working on its stability, so you’ll need to run it manually. This feature will be back by the time we ship the stable release. Run `ganache-cli.`*

To run it, try `npx buidler accounts`:

![](https://cdn-images-1.medium.com/max/1600/1*2bJCtJV4kjvmWt85mY3wTg.png)

If you would like to learn how to create your own tasks, take a look at our [task creation guide](https://medium.com/nomic-labs-blog/how-to-create-a-buidler-task-55658aa89aff).

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

`npx buidler compile`

Now, you’ll likely want to run some tests. Out of the box Buidler provides an [EIP1193-compatible provider](https://eips.ethereum.org/EIPS/eip-1193), which is the new standard for an Ethereum JavaScript interface, but it can be somewhat rough to use directly. For a fully featured development tool with a nice interface, you’ll need to install one of the core plugins that we’ve built.

These are:

- [@nomiclabs/buidler-truffle4](https://github.com/nomiclabs/buidler-truffle4) Integration with TruffleContract from Truffle 4.
- [@nomiclabs/buidler-truffle5](https://github.com/nomiclabs/buidler-truffle5) Integration with TruffleContract from Truffle 5.
- [@nomiclabs/buidler-web3](https://github.com/nomiclabs/buidler-web3) Injects the Web3 1.x module and a live instance into the Buidler Runtime Environment.
- [@nomiclabs/buidler-web3-legacy](https://github.com/nomiclabs/buidler-web3-legacy) Injects the Web3 0.20.x module and a live instance into the Buidler Runtime Environment.
- [@nomiclabs/buidler-ethers](https://github.com/nomiclabs/buidler-ethers) Injects ethers.js into the Buidler Runtime Environment.

The sample project comes with a test written using the Ethereum provider, but let’s also install `buidler-truffle5` and test out the Truffle 5 integration:

`npm install @nomiclabs/buidler-truffle5 @nomiclabs/buidler-web3 web3@1.0.0-beta.37`

Add `require("@nomiclabs/buidler-truffle5")` to the top of your buidler.config.js, and let’s change `test/sample-test.js` to:

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

![](https://cdn-images-1.medium.com/max/1600/1*jI5V8qIjm6_iz7mFxxsFPg.png)

You can then deploy by writing a deployment script `deploy.js` with the Truffle 5 plugin:

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

`npx buidler run scripts/deploy.js`

![](https://cdn-images-1.medium.com/max/1600/1*QQFgWhKhpnpLeU4FX18sSg.png)

Congrats! You have created a project, ran a Buidler task, compiled a smart contract, installed a Truffle integration plugin, wrote and ran a test using the Truffle plugin, and deployed a contract.

These cover the basics to start using Buidler. Head over to [Github](https://github.com/nomiclabs/buidler) for more guides that cover the more advanced usage that allow your process and dev toolkit to be amazingly flexible.

For any questions or feedback you may have, you can find us in the [Buidler Support Telegram group](http://t.me/BuidlerSupport).