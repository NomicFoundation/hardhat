# Testing contracts

In this guide, we will explore the testing of smart contracts with Buidler. For a general overview of using Buidler refer to the [Getting started guide](/guides/#getting-started).

The built-in task `test` allows smart contracts to be tested using Mocha as the test runner, and the testing framework of your choice.

For compatibility purposes with other JavaScript tools, Buidler injects the properties in the [Buidler Runtime Environment] into the global scope when running tests. Let's create a new sample project to see how this plays out.

Run these to start:
```
mkdir my-project
cd my-project
npm init --yes
npm install @nomiclabs/buidler
```

Now run `npx buidler` inside your project folder and create a sample project. This is what the file structure should look like once you're done:

```
$ ls -l
total 296
-rw-r--r--    1 fzeoli  staff     195 Aug  8 15:04 buidler.config.js
drwxr-xr-x    3 fzeoli  staff      96 Aug  8 15:04 contracts
drwxr-xr-x  378 fzeoli  staff   12096 Aug  7 16:12 node_modules
-rw-r--r--    1 fzeoli  staff  139778 Aug  7 16:12 package-lock.json
-rw-r--r--    1 fzeoli  staff     294 Aug  7 16:12 package.json
drwxr-xr-x    3 fzeoli  staff      96 Aug  8 15:04 scripts
drwxr-xr-x    3 fzeoli  staff      96 Aug  8 15:04 test
```

If you look at the file `test/sample-test.js`, you'll find this sample test:

```js
const assert = require("assert");

describe("Ethereum provider", function() {
  it("Should return the accounts", async function() {
    const accounts = await ethereum.send("eth_accounts");
    assert(accounts.length !== 0, "No account was returned");
  });
});
```

Which is a vanilla [Mocha](https://mochajs.org/) test that you can run by running `npx buidler test`
```
$ npx buidler test
All contracts have already been compiled, skipping compilation.


  Ethereum provider
    ✓ Should return the accounts (104ms)


  1 passing (113ms)
```

Now, if you look closely at the test, you can see that in this line:
```js
const accounts = await ethereum.send("eth_accounts");
```

the `ethereum` object is being accessed from the global scope. It's coming from the [Buidler Runtime Environment] injecting its properties into it. 

In a traditional Ethereum project, you most likely have your tests written using Truffle, which also injects its main testing utilities into the global scope. By using the [buidler-truffle5](https://github.com/nomiclabs/buidler/tree/master/packages/buidler-truffle5) plugin, you can get the same utilities in the global scope. Let's install it quickly:
```
$ npm install -D @nomiclabs/buidler-truffle5 @nomiclabs/buidler-web3
```
And add `usePlugin("@nomiclabs/buidler-truffle5")` to the top of `buidler.config.js`, so that it looks like this:

```js
usePlugin("@nomiclabs/buidler-truffle5");

task("accounts", "Prints a list of the available accounts", async () => {
  const accounts = await ethereum.send("eth_accounts");

  console.log("Accounts:", accounts);
});

module.exports = {};
```

Checkout the plugin's [README file](https://github.com/nomiclabs/buidler/tree/master/packages/buidler-truffle5) for more information about it.

Once you've installed the plugin, you will have access to `contract()` and `artifacts.require()` in the global scope, which you can use for a standard Truffle test. Let's add the following test to `test/sample-test.js`:

```js
const Greeter = artifacts.require("Greeter");

contract("Greeter", accounts => {
    it("should greet", async function() {
        const greeting = "Hello, Ethereum";
        const greeter = await Greeter.new(greeting);

        assert.equal(await greeter.greet(), greeting);
    });
});
```

```
$ npx buidler test
All contracts have already been compiled, skipping compilation.


  Ethereum provider
    ✓ Should return the accounts

  Greeter
    ✓ should greet (227ms)


  2 passing (236ms)
```

This setup should allow you to use your Truffle tests with Buidler, as long as they don't use the Migrations feature, which is currently under development.

[Buidler Runtime Environment]: /documentation/#buidler-runtime-environment-bre