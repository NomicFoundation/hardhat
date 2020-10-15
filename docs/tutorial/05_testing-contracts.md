# 5. Testing contracts

Writing automated tests when building smart contracts is of crucial importance, as your user's money is what's at stake. For this we're going to use **Buidler EVM**, a local Ethereum network designed for development that is built-in and the default network in **Buidler**. You don't need to setup anything to use it. In our tests we're going to use ethers.js to interact with the Ethereum contract we built in the previous section, and [Mocha](https://mochajs.org/) as our test runner. 

## Writing tests
Create a new directory called `test` inside our project root directory and create a new file called `Token.js`. 

Let's start with the code below. We'll explain it next, but for now paste this into `Token.js`:

```js
const { expect } = require("chai");

describe("Token contract", function() {
  it("Deployment should assign the total supply of tokens to the owner", async function() {
    const [owner] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("Token");

    const buidlerToken = await Token.deploy();
    await buidlerToken.deployed();

    const ownerBalance = await buidlerToken.balanceOf(owner.getAddress());
    expect(await buidlerToken.totalSupply()).to.equal(ownerBalance);
  });
});
````

On your terminal run `npx buidler test`. You should see the following output:

```
$ npx buidler test
All contracts have already been compiled, skipping compilation.


  Token contract
    ✓ Deployment should assign the total supply of tokens to the owner (654ms)


  1 passing (663ms)

```

This means the test passed. Let's now explain each line:

```js
const [owner] = await ethers.getSigners();
```

A `Signer` in ethers.js is an object that represents an Ethereum account. It's used to send transactions to contracts and other accounts. Here we're getting a list of the accounts in the node we're connected to, which in this case is **Buidler EVM**, and only keeping the first one.

The `ethers` variable is available in the global scope. If you like your code always being explicit, you can add this line at the top:
```js
const { ethers } = require("@nomiclabs/buidler");
```

::: tip
To learn more about `Signer`, you can look at the [Signers documentation](https://docs.ethers.io/ethers.js/html/api-wallet.html).
:::

```js
const Token = await ethers.getContractFactory("Token");
```

A `ContractFactory` in ethers.js is an abstraction used to deploy new smart contracts, so `Token` here is a factory for instances of our token contract.

```js
const buidlerToken = await Token.deploy();
```

Calling `deploy()` on a `ContractFactory` will start the deployment, and return a `Promise` that resolves to a `Contract`. This is the object that has a method for each of your smart contract functions.

```js
await buidlerToken.deployed();
```

When you call on `deploy()` the transaction is sent, but the contract isn't actually deployed until the transaction is mined. Calling `deployed()` will return a `Promise` that resolves once this happens, so this code is blocking until the deployment finishes.

```js
const ownerBalance = await buidlerToken.balanceOf(owner.getAddress());
```

Once the contract is deployed, we can call our contract methods on `buidlerToken` and use them to get the balance of the owner account by calling `balanceOf()`.

Remember that the owner of the token who gets the entire supply is the account that makes the deployment, and when using the `buidler-ethers` plugin  `ContractFactory` and `Contract` instances are connected to the first signer by default. This means that the account in the `owner` variable executed the deployment, and `balanceOf()` should return the entire supply amount.

```js
expect(await buidlerToken.totalSupply()).to.equal(ownerBalance);
```

Here we're again using our `Contract` instance to call a smart contract function in our Solidity code. `totalSupply()` returns the token's supply amount and we're checking that it's equal to `ownerBalance`, as it should.

To do this we're using [Chai](https://www.chaijs.com/) which is an assertions library. These asserting functions are called "matchers", and the ones we're using here actually come from [Waffle](https://getwaffle.io/). This is why we're using the `buidler-waffle` plugin, which makes it easier to assert values from Ethereum. Check out [this section](https://ethereum-waffle.readthedocs.io/en/latest/matchers.html) in Waffle's documentation for the entire list of Ethereum-specific matchers.

### Using a different account

If you need to send a transaction from an account (or `Signer` in ethers.js speak) other than the default one to test your code, you can use the `connect()` method in your ethers.js `Contract` to connect it to a different account. Like this:

```js{18}
const { expect } = require("chai");

describe("Transactions", function () {

  it("Should transfer tokens between accounts", async function() {
    const [owner, addr1, addr2] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("Token");

    const buidlerToken = await Token.deploy();
    await buidlerToken.deployed();
   
    // Transfer 50 tokens from owner to addr1
    await buidlerToken.transfer(await addr1.getAddress(), 50);
    expect(await buidlerToken.balanceOf(await addr1.getAddress())).to.equal(50);
    
    // Transfer 50 tokens from addr1 to addr2
    await buidlerToken.connect(addr1).transfer(await addr2.getAddress(), 50);
    expect(await buidlerToken.balanceOf(await addr2.getAddress())).to.equal(50);
  });
});
```

### Full coverage

Now that we've covered the basics you'll need for testing your contracts, here's a full test suite for the token with a lot of additional information about Mocha and how to structure your tests. We recommend reading through.

```js
// We import Chai to use its asserting functions here.
const { expect } = require("chai");

// `describe` is a Mocha function that allows you to organize your tests. It's
// not actually needed, but having your tests organized makes debugging them
// easier. All Mocha functions are available in the global scope.

// `describe` receives the name of a section of your test suite, and a callback.
// The callback must define the tests of that section. This callback can't be
// an async function.
describe("Token contract", function () {
  // Mocha has four functions that let you hook into the the test runner's
  // lifecyle. These are: `before`, `beforeEach`, `after`, `afterEach`.

  // They're very useful to setup the environment for tests, and to clean it
  // up after they run.

  // A common pattern is to declare some variables, and assign them in the
  // `before` and `beforeEach` callbacks.

  let Token;
  let buidlerToken;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  // `beforeEach` will run before each test, re-deploying the contract every
  // time. It receives a callback, which can be async.
  beforeEach(async function () {
    // Get the ContractFactory and Signers here.
    Token = await ethers.getContractFactory("Token");
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    // To deploy our contract, we just have to call Token.deploy() and await
    // for it to be deployed(), which happens onces its transaction has been
    // mined.
    buidlerToken = await Token.deploy();
    await buidlerToken.deployed();

    // We can interact with the contract by calling `buidlerToken.method()`
    await buidlerToken.deployed();
  });

  // You can nest describe calls to create subsections.
  describe("Deployment", function () {
    // `it` is another Mocha function. This is the one you use to define your
    // tests. It receives the test name, and a callback function.

    // If the callback function is async, Mocha will `await` it.
    it("Should set the right owner", async function () {
      // Expect receives a value, and wraps it in an assertion objet. These
      // objects have a lot of utility methods to assert values.

      // This test expects the owner variable stored in the contract to be equal
      // to our Signer's owner.
      expect(await buidlerToken.owner()).to.equal(await owner.getAddress());
    });

    it("Should assign the total supply of tokens to the owner", async function () {
      const ownerBalance = await buidlerToken.balanceOf(owner.getAddress());
      expect(await buidlerToken.totalSupply()).to.equal(ownerBalance);
    });
  });

  describe("Transactions", function () {
    it("Should transfer tokens between accounts", async function () {
      // Transfer 50 tokens from owner to addr1
      await buidlerToken.transfer(await addr1.getAddress(), 50);
      const addr1Balance = await buidlerToken.balanceOf(
        await addr1.getAddress()
      );
      expect(addr1Balance).to.equal(50);

      // Transfer 50 tokens from addr1 to addr2
      // We use .connect(signer) to send a transaction from another account
      await buidlerToken.connect(addr1).transfer(await addr2.getAddress(), 50);
      const addr2Balance = await buidlerToken.balanceOf(
        await addr2.getAddress()
      );
      expect(addr2Balance).to.equal(50);
    });

    it("Should fail if sender doesn’t have enough tokens", async function () {
      const initialOwnerBalance = await buidlerToken.balanceOf(
        await owner.getAddress()
      );

      // Try to send 1 token from addr1 (0 tokens) to owner (1000 tokens).
      // `require` will evaluate false and revert the transaction.
      await expect(
        buidlerToken.connect(addr1).transfer(await owner.getAddress(), 1)
      ).to.be.revertedWith("Not enough tokens");

      // Owner balance shouldn't have changed.
      expect(await buidlerToken.balanceOf(await owner.getAddress())).to.equal(
        initialOwnerBalance
      );
    });

    it("Should update balances after transfers", async function () {
      const initialOwnerBalance = await buidlerToken.balanceOf(
        await owner.getAddress()
      );

      // Transfer 100 tokens from owner to addr1.
      await buidlerToken.transfer(await addr1.getAddress(), 100);

      // Transfer another 50 tokens from owner to addr2.
      await buidlerToken.transfer(await addr2.getAddress(), 50);

      // Check balances.
      const finalOwnerBalance = await buidlerToken.balanceOf(
        await owner.getAddress()
      );
      expect(finalOwnerBalance).to.equal(initialOwnerBalance - 150);

      const addr1Balance = await buidlerToken.balanceOf(
        await addr1.getAddress()
      );
      expect(addr1Balance).to.equal(100);

      const addr2Balance = await buidlerToken.balanceOf(
        await addr2.getAddress()
      );
      expect(addr2Balance).to.equal(50);
    });
  });
});
````
This is what the output of `npx buidler test` should look like against the full test suite:
```
$ npx buidler test
All contracts have already been compiled, skipping compilation.

  Token contract
    Deployment
      ✓ Should set the right owner
      ✓ Should assign the total supply of tokens to the owner
    Transactions
      ✓ Should transfer tokens between accounts (199ms)
      ✓ Should fail if sender doesn’t have enough tokens
      ✓ Should update balances after transfers (111ms)


  5 passing (1s)
```

Keep in mind that when you run `npx buidler test`, your contracts will be compiled if they've changed since the last time you ran your tests.
