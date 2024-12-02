# Testing contracts

After [compiling your contracts](./compile-contracts.md), the next step is to write some tests to verify that they work as intended.

This guide explains our recommended approach for testing contracts in Hardhat. It relies on [ethers](https://docs.ethers.org/v6/) to connect to [Hardhat Network](/hardhat-network) and on [Mocha](https://mochajs.org/) and [Chai](https://www.chaijs.com/) for the tests. It also uses our custom [Chai matchers](/hardhat-chai-matchers) and our [Hardhat Network Helpers](/hardhat-network-helpers) to make it easier to write clean test code. These packages are part of the Hardhat Toolbox plugin; if you followed the previous guides, you should already have them installed.

While this is our recommended test setup, Hardhat is flexible: you can customize the approach or take a completely different path with other tools.

### Initial setup

In this guide we’ll write some tests for the sample project. If you haven’t done it yet, go and [initialize it](./project-setup.md).

We recommend you [use TypeScript](./typescript.md) to get better autocompletion and catch possible errors earlier. This guide will assume you are using TypeScript, but you can click the tabs of the code examples to see the Javascript counterpart.

The setup includes some example tests in the `test/Lock.ts` file, but ignore them for now. Instead, create a `test/my-tests.ts` file. During this guide we'll only run those, by running `npx hardhat test test/my-tests.ts`, instead of just `npx hardhat test`.

### A simple test

In the following sections we'll write some tests for the `Lock` contract that comes with the sample project. If you haven't read it yet, please take a look at the `contracts/Lock.sol` file.

For our first test we’ll deploy the `Lock` contract and assert that the unlock time returned by the `unlockTime()` getter is the same one that we passed in the constructor:

::::tabsgroup{options="TypeScript,JavaScript"}

:::tab{value="TypeScript"}

```ts
import { expect } from "chai";
import hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Lock", function () {
  it("Should set the right unlockTime", async function () {
    const lockedAmount = 1_000_000_000;
    const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
    const unlockTime = (await time.latest()) + ONE_YEAR_IN_SECS;

    // deploy a lock contract where funds can be withdrawn
    // one year in the future
    const lock = await hre.ethers.deployContract("Lock", [unlockTime], {
      value: lockedAmount,
    });

    // assert that the value is correct
    expect(await lock.unlockTime()).to.equal(unlockTime);
  });
});
```

:::

:::tab{value="JavaScript"}

```js
const { expect } = require("chai");
const hre = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Lock", function () {
  it("Should set the right unlockTime", async function () {
    const lockedAmount = 1_000_000_000;
    const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
    const unlockTime = (await time.latest()) + ONE_YEAR_IN_SECS;

    // deploy a lock contract where funds can be withdrawn
    // one year in the future
    const lock = await hre.ethers.deployContract("Lock", [unlockTime], {
      value: lockedAmount,
    });

    // assert that the value is correct
    expect(await lock.unlockTime()).to.equal(unlockTime);
  });
});
```

:::

::::

First we import the things we are going to use: the [`expect`](https://www.chaijs.com/api/bdd/) function from `chai` to write our assertions, the [Hardhat Runtime Environment](../advanced/hardhat-runtime-environment.md) (`hre`), and the [network helpers](/hardhat-network-helpers) to interact with the Hardhat Network. After that we use the `describe` and `it` functions, which are global Mocha functions used to describe and group your tests. (You can read more about Mocha [here](https://mochajs.org/#getting-started).)

The test itself is what’s inside the callback argument to the `it` function. First we set the values for the amount we want to lock (in [wei](https://ethereum.org/en/glossary/#wei)) and the unlock time. For the latter we use [`time.latest`](</hardhat-network-helpers/docs/reference#latest()>), a network helper that returns the timestamp of the last mined block. Then we deploy the contract itself: we call `ethers.deployContract` with the name of the contract we want to deploy and an array of constructor arguments that has the unlock time. We also pass an object with the transaction parameters. This is optional, but we'll use it to send some ETH by setting its `value` field.

Finally, we check that the value returned by the `unlockTime()` [getter](https://docs.soliditylang.org/en/v0.8.13/contracts.html#getter-functions) in the contract matches the value that we used when we deployed it. Since all the functions on a contract are async, we have to use the `await` keyword to get its value; otherwise, we would be comparing a promise with a number and this would always fail.

### Testing a function that reverts

In the previous test we checked that a getter function returned the correct value. This was a read-only function that can be called without paying a fee and without any risk. Other functions, however, can modify the state of the contract, like the `withdraw` function in the `Lock` contract. This means that we want some pre-conditions to be met for this function to be called successfully. If you look at its first lines you’ll see a couple of `require` checks for that purpose:

```solidity
function withdraw() public {
  require(block.timestamp >= unlockTime, "You can't withdraw yet");
  require(msg.sender == owner, "You aren't the owner");
```

The first statement checks that the unlock time has been reached, and the second one checks that the address calling the contract is its owner. Let’s start by writing a test for the first pre-condition:

```ts
it("Should revert with the right error if called too soon", async function () {
  // ...deploy the contract as before...

  await expect(lock.withdraw()).to.be.revertedWith("You can't withdraw yet");
});
```

In the previous test we used `.to.equal`, which is part of Chai and is used to compare two values. Here we are using [`.to.be.revertedWith`](/hardhat-chai-matchers/docs/reference#.revertedwith), which asserts that a transaction reverts, and that the reason string of the revert is equal to the given string. The `.to.be.revertedWith` matcher is not part of Chai itself; instead, it’s added by the [Hardhat Chai Matchers](/hardhat-chai-matchers) plugin, which is included in the sample project we are using.

Notice that in the previous test we wrote `expect(await ...)` but now we are doing `await expect(...)`. In the first case we were comparing two values in a synchronous way; the inner await is just there to wait for the value to be retrieved. In the second case, the whole assertion is async because it has to wait until the transaction is mined. This means that the `expect` call returns a promise that we have to await.

### Manipulating the time of the network

We are deploying our `Lock` contract with an unlock time of one year. If we want to write a test that checks what happens after the unlock time has passed, we can’t wait that amount of time. We could use a shorter unlock time, like 5 seconds, but that’s a less realistic value and it's still a long time to wait in a test.

The solution is to simulate the passage of time. This can be done with the [`time.increaseTo`](</hardhat-network-helpers/docs/reference#increaseto(timestamp)>) network helper, which mines a new block with the given timestamp:

```ts
it("Should transfer the funds to the owner", async function () {
  // ...deploy the contract...

  await time.increaseTo(unlockTime);

  // this will throw if the transaction reverts
  await lock.withdraw();
});
```

As we mentioned, calling `lock.withdraw()` returns a Promise. If the transaction fails, the promise will be rejected. Using `await` will throw in that case, so the test will fail if the transaction reverts.

### Using a different address

The second check done by the `withdraw` function is that the function was called by the owner of the contract. By default, deployments and function calls are done with the first [configured account](/hardhat-network/docs/reference.md#accounts). If we want to check that only the owner can call some function, we need to use a different account and verify that it fails.

The `ethers.getSigners()` returns an array with all the configured accounts. We can use the `.connect` method of the contract to call the function with a different account and check that the transaction reverts:

```ts
it("Should revert with the right error if called from another account", async function () {
  // ...deploy the contract...

  const [owner, otherAccount] = await hre.ethers.getSigners();

  // we increase the time of the chain to pass the first check
  await time.increaseTo(unlockTime);

  // We use lock.connect() to send a transaction from another account
  await expect(lock.connect(otherAccount).withdraw()).to.be.revertedWith(
    "You aren't the owner"
  );
});
```

Here again we are calling a function and asserting that it reverts with the correct reason string. The difference is that we are using `.connect(anotherAccount)` to call the method from a different address.

### Using fixtures

So far we've deployed the `Lock` contract in each test. This means that at the beginning of each test we have to get the contract factory and then deploy the contract. This might be fine for a single contract but, if you have a more complicated setup, each test will have several lines at the beginning just to set up the desired state, and most of the time these lines will be the same.

In a typical Mocha test, this duplication of code is handled with a `beforeEach` hook:

::::tabsgroup{options="TypeScript,JavaScript"}

:::tab{value="TypeScript"}

```ts
import hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Lock", function () {
  let lock: any;
  let unlockTime: number;
  let lockedAmount = 1_000_000_000;

  beforeEach(async function () {
    const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
    unlockTime = (await time.latest()) + ONE_YEAR_IN_SECS;

    lock = await hre.ethers.deployContract("Lock", [unlockTime], {
      value: lockedAmount,
    });
  });

  it("some test", async function () {
    // use the deployed contract
  });
});
```

:::

:::tab{value="JavaScript"}

```js
const hre = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Lock", function () {
  let lock;
  let unlockTime;
  let lockedAmount = 1_000_000_000;

  beforeEach(async function () {
    const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
    unlockTime = (await time.latest()) + ONE_YEAR_IN_SECS;

    lock = await hre.ethers.deployContract("Lock", [unlockTime], {
      value: lockedAmount,
    });
  });

  it("some test", async function () {
    // use the deployed contract
  });
});
```

:::

::::

However, there are two problems with this approach:

- If you have to deploy many contracts, your tests will be slower because each one has to send multiple transactions as part of its setup.
- Sharing the variables like this between the `beforeEach` hook and your tests is ugly and error-prone.

The `loadFixture` helper in the Hardhat Network Helpers fixes both of these problems. This helper receives a _fixture_, a function that sets up the chain to some desired state. The first time `loadFixture` is called, the fixture is executed. But the second time, instead of executing the fixture again, `loadFixture` will reset the state of the network to the point where it was right after the fixture was executed. This is faster, and it undoes any state changes done by the previous test.

This is how our tests look like when a fixture is used:

::::tabsgroup{options="TypeScript,JavaScript"}

:::tab{value="TypeScript"}

```ts
import { expect } from "chai";
import hre from "hardhat";
import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Lock", function () {
  async function deployOneYearLockFixture() {
    const lockedAmount = 1_000_000_000;
    const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
    const unlockTime = (await time.latest()) + ONE_YEAR_IN_SECS;

    const lock = await hre.ethers.deployContract("Lock", [unlockTime], {
      value: lockedAmount,
    });

    return { lock, unlockTime, lockedAmount };
  }

  it("Should set the right unlockTime", async function () {
    const { lock, unlockTime } = await loadFixture(deployOneYearLockFixture);

    // assert that the value is correct
    expect(await lock.unlockTime()).to.equal(unlockTime);
  });

  it("Should revert with the right error if called too soon", async function () {
    const { lock } = await loadFixture(deployOneYearLockFixture);

    await expect(lock.withdraw()).to.be.revertedWith("You can't withdraw yet");
  });

  it("Should transfer the funds to the owner", async function () {
    const { lock, unlockTime } = await loadFixture(deployOneYearLockFixture);

    await time.increaseTo(unlockTime);

    // this will throw if the transaction reverts
    await lock.withdraw();
  });

  it("Should revert with the right error if called from another account", async function () {
    const { lock, unlockTime } = await loadFixture(deployOneYearLockFixture);

    const [owner, otherAccount] = await hre.ethers.getSigners();

    // we increase the time of the chain to pass the first check
    await time.increaseTo(unlockTime);

    // We use lock.connect() to send a transaction from another account
    await expect(lock.connect(otherAccount).withdraw()).to.be.revertedWith(
      "You aren't the owner"
    );
  });
});
```

:::

:::tab{value="JavaScript"}

```js
const { expect } = require("chai");
const hre = require("hardhat");
const {
  loadFixture,
  time,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Lock", function () {
  async function deployOneYearLockFixture() {
    const lockedAmount = 1_000_000_000;
    const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
    const unlockTime = (await time.latest()) + ONE_YEAR_IN_SECS;

    const lock = await hre.ethers.deployContract("Lock", [unlockTime], {
      value: lockedAmount,
    });

    return { lock, unlockTime, lockedAmount };
  }

  it("Should set the right unlockTime", async function () {
    const { lock, unlockTime } = await loadFixture(deployOneYearLockFixture);

    // assert that the value is correct
    expect(await lock.unlockTime()).to.equal(unlockTime);
  });

  it("Should revert with the right error if called too soon", async function () {
    const { lock } = await loadFixture(deployOneYearLockFixture);

    await expect(lock.withdraw()).to.be.revertedWith("You can't withdraw yet");
  });

  it("Should transfer the funds to the owner", async function () {
    const { lock, unlockTime } = await loadFixture(deployOneYearLockFixture);

    await time.increaseTo(unlockTime);

    // this will throw if the transaction reverts
    await lock.withdraw();
  });

  it("Should revert with the right error if called from another account", async function () {
    const { lock, unlockTime } = await loadFixture(deployOneYearLockFixture);

    const [owner, otherAccount] = await hre.ethers.getSigners();

    // we increase the time of the chain to pass the first check
    await time.increaseTo(unlockTime);

    // We use lock.connect() to send a transaction from another account
    await expect(lock.connect(otherAccount).withdraw()).to.be.revertedWith(
      "You aren't the owner"
    );
  });
});
```

:::

::::

The fixture function can return anything you want, and the `loadFixture` helper will return it. We recommend returning an object like we did here, so you can extract only the values you care about for that test.

### Other tests

There are several other things you can test, like [which events are emitted](/hardhat-chai-matchers/docs/reference#.emit) or [how the balances of the involved addresses change](/hardhat-chai-matchers/docs/reference#balance-change). Check the `test/Lock.ts` file to see the other examples.

### Measuring code coverage

The Hardhat Toolbox includes the [`solidity-coverage`](https://github.com/sc-forks/solidity-coverage) plugin to measure the test coverage in your project. Just run the `coverage` task and you'll get a report:

```
npx hardhat coverage
```

### Using the gas reporter

The Hardhat Toolbox also includes the [`hardhat-gas-reporter`](https://github.com/cgewecke/hardhat-gas-reporter) plugin to get metrics of how much gas is used, based on the execution of your tests. The gas reporter is run when the `test` task is executed and the `REPORT_GAS` environment variable is set:

```
REPORT_GAS=true npx hardhat test
```

For Windows users, set the environment variable for the PowerShell session with `$env:REPORT_GAS="true"`:

```
$env:REPORT_GAS="true"; npx hardhat test
```

### Running tests in parallel

You can run your tests in parallel by using the `--parallel` flag:

```
npx hardhat test --parallel
```

Alternatively, use `parallel: true` in the `mocha` section of your Hardhat config.

Most of the time, running your tests serially or in parallel should produce the same results, but there are some scenarios where tests run in parallel will behave differently:

- In serial mode all the test files share the same instance of the Hardhat Runtime Environment, but in parallel mode this is not always the case. Mocha uses a pool of workers to execute the tests, and each worker starts with its own instance of the HRE. This means that if one test file deploys a contract, then that deployment will exist in some of the other test files and it won't in others.
- The `.only` modifier doesn't work in parallel mode. As an alternative, you can use `--grep` to run specific tests.
- Because parallel mode uses more system resources, the duration of individual tests might be longer, so there's a chance that some tests start timing out for that reason. If you run into this problem, you can increase the tests timeout in the Mocha section of your Hardhat config or using `this.timeout()` in your tests.
- The order in which tests are executed is non-deterministic.

There are some other limitations related to parallel mode. You can read more about them in Mocha's docs. And if you are running into some issue when using parallel mode, you can check their Troubleshooting parallel mode section.
