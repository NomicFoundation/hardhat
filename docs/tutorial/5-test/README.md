# 5. Testing contracts

This is the longest and hardest part of the tutorial full of potentially new concepts. Take a deep breath before start, we will cover every essential aspect of testing smart contracts.

## Why testing
There are many benefits to writing tests on different languages but regarding smart contract development there's one worth mention: you’re more productive because you don’t have to spend the time manually testing the code yourself. If this is your first time writing a smart contract or dapp, believe us the amount of time saved is huge.

Smart contracts are normally tested using JavaScript. You develop the contract in Solidity, but use an Ethereum library (such as ethers.js) to have a JavaScript model of your contract and write your tests with it. 

## ethers.js
ethers.js is a complete Ethereum library that can be used in Node.js and the web. It lets you interact with Ethereum and your contracts with easy-to-use JavaScript models.

This section explains the main ethers' abstractions that we are going to work with.

### Ethereum Provider
A Provider abstracts a connection to the Ethereum blockchain. It lets you read the state of the blockchain and send transactions to the network. When using **Buidler**, you can access an already-initialized provider with `ethers.provider`.

Some examples of things you can do with it include getting the balance of an address, or getting the latest block number.

### Signers
A Signer in ethers is an object that represents an Ethereum account. It is used to send transactions to contracts and other accounts, and to read its state in the network.

When using **Buidler**, you can access the signers that represent the accounts of the node you are connected to by using await `ethers.getSigners()`.

### ContractFactory's
A contract factory is an abstraction used to deploy new smart contracts. You can get one in **Buidler** using `await ethers.getContractFactory("ContractName")`.

When you deploy a contract using a ContractFactory you get a Contract instance. This is the object that has a JavaScript function for each of your smart contract functions.

### Calling contract functions from other accounts
When using **Buidler**, all your ContractFactorys and Contracts are associated by default to the first Signers account. This means that transactions to deploy and call functions will be sent from it.

To use other accounts to deploy or send transactions, you have to use the `connect()` method of your factories and contracts. You will find an example in the tests below.

## Mocha & Chai
Just like in most JavaScript projects, smart contract tests are written using Mocha and Chai. These are not Ethereum specific tools, but super popular JavaScript projects.

If you've never worked with Mocha and Chai, we have included a lot of comments in the test below in order to introduce you to them.

### Waffle's Chai matchers

Chai comes with a lot of assertion functions, called matchers, built-in. This are incredibly useful when testing JavaScript applications, but are not enough for testing smart contracts. 

Waffle's Chai matchers are extra assertion functions that get added to Chai to make it easier to test transactions. For example, you can check if a transaction reverted (failed) by doing:

`await expect(mycontract.method()).to.be.reverted;`

Waffle comes with matchers for:

- Big Numbers
- Events
- Reverts and revert reasons
- Balance changes
- Addresses validation

## Writing tests
Done with the theory, let's put it all together.

Create a new directory called `test` inside our project root folder and add a new file called `Token.js`. Copy and paste the code below, we included a lot of comments for starters:

```js
// Mocha is a Node.js test runner. You use it to define and run tests.
// In this tutorial, we use Mocha through Buidler, by running: npx buidler test

// Chai is an assertion library for JavaScript. It helps you write shorter
// asserts and has great error messages when those fail. Chai has different
// assertion styles and APIs, but we are going to use `expect` in this tutorial.

// You don't need learn much more about them now, but for more info go to:
//   - Mocha: https://mochajs.org/
//   - Chai: https://www.chaijs.com/api/bdd/

// You musn't import Mocha here. It will be loaded by Buidler, and all of
// Mocha's functions will be automatically available for you.

// We do have to import Chai here. 
// Note that we are only using its `expect` API.
const { expect } = require("chai");

// `describe` is a Mocha function that lets you organize your tests. It's not
// actually needed, but having your tests organized makes debugging them easier.

// `describe` recieves the name of a section of your test suite, and a callback.
// The callback must define the tests of that section. This callback must not be
// an async function.
describe("Token contract", function() {
  let Token;
  let token;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  // Mocha has four functions that let you hook into the the test runner's
  // lifecyle. These are: `before`, `beforeEach`, `after`, `afterEach`.

  // They are very useful to setup the environment for tets, and to clean it
  // up after they run.

  // A common pattern is to declare some variables, and assign them in the
  // `before` and `beforeEach` callbacks.

  // `beforeEach` will run before each test, re-deploying the contract every time
  beforeEach(async function() {
    // Get the ContractFactory and Signers here.
    Token = await ethers.getContractFactory("Token");
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    
    // By storing the contract in a variable, we will be able to interact
    // with the contract by doing `token.method()`, eg: `token.transfer()`
    token = await Token.deploy();
    await token.deployed();
  });

  // You can nest describe calls to create subsections
  describe("Deployment", function () {
    // `it` is another Mocha function, this is the one you use to define your
    // tests. It receives the test name, and a callback function.

    // If the callback function is async, Mocha will `await` it.
    it("Should set the right owner", async function() {
      // Expect receives a value, and wraps it in an assertion objet. These
      // objects have a lot of utility methods to compare their values.

      // This tests expects that the owner variable stored in the contract
      // equals our Signer's owner.
      expect(await token.owner()).to.equal(await owner.getAddress());
    });

    it("Should assign the total supply of tokens to the owner", async function() {
      const ownerBalance = await token.balanceOf(owner.getAddress());
      expect(await token.totalSupply()).to.equal(ownerBalance);
    });

  });

  describe("Transactions", function () {

    it("Should transfer tokens between accounts", async function() {
      // Transfer 50 tokens from owner to addr1
      await token.transfer(await addr1.getAddress(), 50);
      expect(
        await token.balanceOf(await addr1.getAddress())
      ).to.equal(50);
      // Transfer 50 tokens from addr1 to addr2
      await token.connect(addr1).transfer(await addr2.getAddress(), 50);
      expect(
        await token.balanceOf(await addr2.getAddress())
      ).to.equal(50);
    });

    it("Should fail if sender doesn’t have enough tokens", async function() {
      const initialOwnerBalance = await token.balanceOf(await owner.getAddress());
      // `require` will evaluate false and revert the transaction
      await expect(
        // Try to send 1 token from addr1 (0 tokens) to owner (1000 tokens)
        token.connect(addr1).transfer(await owner.getAddress(), 1)
      ).to.be.revertedWith("Not enough tokens");
      // Owner balance shouldn't have changed
      expect(await token.balanceOf(await owner.getAddress())).to.equal(initialOwnerBalance);
    });

    it("Should update balances after transfers", async function() {
      const initialOwnerBalance = await token.balanceOf(await owner.getAddress());
      // Transfer 100 tokens from owner to addr1
      await token.transfer(await addr1.getAddress(), 100);
      // Transfer another 100 tokens from owner to addr2
      await token.transfer(await addr2.getAddress(), 100);
      // Check balances
      expect(await token.balanceOf(await owner.getAddress())).to.equal(initialOwnerBalance - 200);
      expect(await token.balanceOf(await addr1.getAddress())).to.equal(100);
      expect(await token.balanceOf(await addr2.getAddress())).to.equal(100);
    });

    it("Should fail and show stack traces 😉", async function() {
      const ownerBalance = await token.balanceOf(await owner.getAddress());
      // We are trying to send `ownerBalance` tokens + 1
      // Since the owner doesn't have the amount of tokens, the transaction will fail
      await token.transfer(await addr2.getAddress(), ownerBalance.add(1));
    });

  });
  
});
````

Open your terminal and run `npx buidler test`. You should see the following output:

```
All contracts have already been compiled, skipping compilation.

  Token contract
    Deployment
      ✓ Should set the right owner
      ✓ Should assign the total supply of tokens to the owner
    Transactions
      ✓ Should transfer tokens between accounts (199ms)
      ✓ Should fail if sender doesn’t have enough tokens
      ✓ Should update balances after transfers (111ms)
      1) Should fail and show stack straces 😉


  5 passing (1s)
  1 failing

  1) Token contract
       Transactions
         Should fail and show stack traces 😉:
     Error: VM Exception while processing transaction: revert Not enough tokens
      at Token.transfer (contracts/Token.sol:32)
      at process._tickCallback (internal/process/next_tick.js:68:7)
```

Let's divide the output into parts:

```
All contracts have already been compiled, skipping compilation.
```

Running `npx buidler test` will compile all your contracts. In our case we had `Token.sol` already compiled, try changing the name of the token, save the file and instead of compiling, run the test again.

```
  Token contract
    Deployment
      ✓ Should set the right owner
      ✓ Should assign the total supply of tokens to the owner
    Transactions
      ✓ Should transfer tokens between accounts (199ms)
      ✓ Should fail if sender doesn’t have enough tokens
      ✓ Should update balances after transfers (111ms)
      1) Should fail and show stack straces 😉


  5 passing (1s)
  1 failing
```

This is how Mocha informs which tests have run, passed and failed. We included a failing test in order to show you an amazing **Buidler** feature:

```
  1) Token contract
       Transactions
         Should fail and show stack traces 😉:
     Error: VM Exception while processing transaction: revert Not enough tokens
      at Token.transfer (contracts/Token.sol:32)
      at process._tickCallback (internal/process/next_tick.js:68:7)
```

Stack traces! Note that the trace combines JavaScript and Solidity code informing which lines triggered the error. This is possible thanks to **Buidler** EVM, we will dig deeper into it in the next section.
