# Hardhat Viem Chai Matchers

This plugin adds Ethereum-specific capabilities to the [Chai](https://chaijs.com/) assertion library using [Viem](https://viem.sh), making your smart contract tests easy to write and read.

## Installation

```bash
npm install --save-dev @nomicfoundation/hardhat-viem-chai-matchers
```

If you are using yarn:

```bash
yarn add --dev @nomicfoundation/hardhat-viem-chai-matchers
```

## Usage

After installing it, add the plugin to your Hardhat config:

```js
require("@nomicfoundation/hardhat-viem-chai-matchers");
```

If you are using TypeScript:

```ts
import "@nomicfoundation/hardhat-viem-chai-matchers";
```

Then you'll be able to use the matchers in your tests:

```ts
import { expect } from "chai";

describe("Token", function () {
  it("should have the right total supply", async function () {
    expect(await token.read.totalSupply()).to.equal(1_000_000n);
  });

  it("should revert with the right error", async function () {
    await expect(token.write.transfer([token.address, 1000n])).to.be.revertedWith(
      "Cannot transfer to the contract itself"
    );
  });

  it("should emit the right event", async function () {
    await expect(token.write.transfer([recipient, 1000n]))
      .to.emit(token, "Transfer")
      .withArgs(sender, recipient, 1000n);
  });
});
```

## Available Matchers

### Reverts

#### `.reverted`

Asserts that a transaction reverts.

```ts
await expect(token.write.transfer([invalidAddress, amount])).to.be.reverted;
```

#### `.revertedWith(reason)`

Asserts that a transaction reverts with a specific reason string.

```ts
await expect(token.write.transfer([invalidAddress, amount])).to.be.revertedWith(
  "Invalid address"
);
```

#### `.revertedWithCustomError(contract, errorName)`

Asserts that a transaction reverts with a specific custom error.

```ts
await expect(token.write.transfer([invalidAddress, amount])).to.be.revertedWithCustomError(
  token, 
  "InvalidAddress"
);
```

#### `.revertedWithCustomError(contract, errorName).withArgs(...args)`

Asserts that a transaction reverts with a specific custom error and specific arguments.

```ts
await expect(token.write.transfer([invalidAddress, amount]))
  .to.be.revertedWithCustomError(token, "InvalidAddress")
  .withArgs(invalidAddress);
```

#### `.revertedWithPanic(code)`

Asserts that a transaction reverts with a specific panic code.

```ts
await expect(contract.write.dangerousOperation()).to.be.revertedWithPanic(0x01);
```

### Events

#### `.emit(contract, eventName)`

Asserts that a specific event is emitted during a transaction.

```ts
await expect(token.write.transfer([recipient, amount]))
  .to.emit(token, "Transfer");
```

#### `.emit(contract, eventName).withArgs(...args)`

Asserts that a specific event is emitted with specific arguments during a transaction.

```ts
await expect(token.write.transfer([recipient, amount]))
  .to.emit(token, "Transfer")
  .withArgs(sender, recipient, amount);
```

### Balance Changes

#### `.changeEtherBalance(account, expectedChange)`

Asserts that the ether balance of an account changes by a specific amount.

```ts
await expect(sender.sendTransaction({
  to: recipient,
  value: parseEther("1")
})).to.changeEtherBalance(sender, parseEther("-1"));

await expect(sender.sendTransaction({
  to: recipient,
  value: parseEther("1")
})).to.changeEtherBalance(recipient, parseEther("1"));
```

#### `.changeEtherBalances(accounts, expectedChanges)`

Asserts that the ether balances of multiple accounts change by specific amounts.

```ts
await expect(sender.sendTransaction({
  to: recipient,
  value: parseEther("1")
})).to.changeEtherBalances(
  [sender, recipient],
  [parseEther("-1"), parseEther("1")]
);
```

#### `.changeTokenBalance(token, account, expectedChange)`

Asserts that the token balance of an account changes by a specific amount.

```ts
await expect(token.write.transfer([recipient, 100n]))
  .to.changeTokenBalance(token, sender, -100n);

await expect(token.write.transfer([recipient, 100n]))
  .to.changeTokenBalance(token, recipient, 100n);
```

#### `.changeTokenBalances(token, accounts, expectedChanges)`

Asserts that the token balances of multiple accounts change by specific amounts.

```ts
await expect(token.write.transfer([recipient, 100n]))
  .to.changeTokenBalances(
    token, 
    [sender, recipient], 
    [-100n, 100n]
  );
```

### Miscellaneous

#### `.properAddress`

Asserts that the value is a proper Ethereum address.

```ts
expect("0x1234567890123456789012345678901234567890").to.be.properAddress;
```

#### `.properPrivateKey`

Asserts that the value is a proper Ethereum private key.

```ts
expect("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef").to.be.properPrivateKey;
```

#### `.hexEqual(expected)`

Asserts that two hex strings are equal, ignoring case and leading zeros.

```ts
expect("0x1234").to.hexEqual("0x01234");
```

## Function Signatures

Here are the TypeScript type signatures for the main matcher functions:

```ts
// Revert matchers
function reverted(this: Chai.AssertionStatic): Chai.Assertion;
function revertedWith(this: Chai.AssertionStatic, reason: string): Chai.Assertion;
function revertedWithCustomError(this: Chai.AssertionStatic, contract: Contract, errorName: string): Chai.Assertion;
function revertedWithPanic(this: Chai.AssertionStatic, code: number): Chai.Assertion;

// Event matchers
function emit(this: Chai.AssertionStatic, contract: Contract, eventName: string): Chai.Assertion;
function withArgs(...args: any[]): Chai.Assertion;

// Balance matchers
function changeEtherBalance(
  this: Chai.AssertionStatic, 
  account: Account | Address, 
  expectedChange: bigint | string
): Chai.Assertion;

function changeEtherBalances(
  this: Chai.AssertionStatic, 
  accounts: Array<Account | Address>, 
  expectedChanges: Array<bigint | string>
): Chai.Assertion;

function changeTokenBalance(
  this: Chai.AssertionStatic, 
  token: Contract, 
  account: Account | Address, 
  expectedChange: bigint
): Chai.Assertion;

function changeTokenBalances(
  this: Chai.AssertionStatic, 
  token: Contract, 
  accounts: Array<Account | Address>, 
  expectedChanges: Array<bigint>
): Chai.Assertion;

// Miscellaneous matchers
interface Assertion {
  properAddress: Assertion;
  properPrivateKey: Assertion;
  hexEqual(expected: string): Assertion;
}
```

## Notes

This library follows Viem's conventions for contract interactions and types, including the use of bigints for number values.

## License

[MIT](/LICENSE) 
