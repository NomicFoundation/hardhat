---
title: Hardhat Chai Matchers
description: Hardhat Chai Matchers is a Hardhat plugin that builds on top of Chai, extending it with Ethereum-related assertion utilities.
---

# Overview

[@nomicfoundation/hardhat-chai-matchers](https://www.npmjs.com/package/@nomicfoundation/hardhat-chai-matchers) adds Ethereum-specific capabilities to the [Chai](https://www.chaijs.com/) assertion library, making your smart contract tests easy to write and read.

Among other things, you can assert that a contract fired certain events, or that it exhibited a specific revert, or that a transaction resulted in specific changes to a wallet's Ether or token balance.

:::warning

The `hardhat-chai-matchers` plugin is designed to work with `hardhat-ethers`. Attempting to use it in conjunction with `hardhat-viem` results in compatibility issues.

:::

## Installation

::::tabsgroup{options="npm 7+,npm 6,yarn,pnpm"}

:::tab{value="npm 7+"}

```
npm install --save-dev @nomicfoundation/hardhat-chai-matchers
```

:::

:::tab{value="npm 6"}

```
npm install --save-dev @nomicfoundation/hardhat-chai-matchers
```

:::

:::tab{value=yarn}

```
yarn add --dev @nomicfoundation/hardhat-chai-matchers
```

:::

:::tab{value="pnpm"}

```
pnpm add -D @nomicfoundation/hardhat-chai-matchers
```

:::

::::

## How can I use it?

Simply `require("@nomicfoundation/hardhat-chai-matchers")` in your Hardhat config and then the assertions will be available in your code.

A few other helpers, such as argument predicates and panic code constants, must be imported explicitly. These are discussed below.

## Why would I want to use it?

### Events

You can easily write tests to verify that your contract emitted a certain event. For example, `await expect(contract.call()).to.emit(contract, "Event")` would detect the event emitted by the following Solidity code:

```solidity
contract C {
    event Event();
    function call () public {
        emit Event();
    }
}
```

Note that the `await` is required before an `expect(...).to.emit(...)`, because the verification requires the retrieval of the event logs from the Ethereum node, which is an asynchronous operation. Without that initial `await`, your test may run to completion before the Ethereum transaction even completes.

Also note that the first argument to `emit()` is the contract which emits the event. If your contract calls another contract, and you want to detect an event from the inner contract, you need to pass in the inner contract to `emit()`.

#### Events with Arguments

Solidity events can contain arguments, and you can assert the presence of certain argument values in an event that was emitted. For example, to assert that an event emits a certain unsigned integer value:

<!-- prettier-ignore -->
```js
await expect(contract.call())
  .to.emit(contract, "Uint")
  .withArgs(3);
```

Sometimes you may want to assert the value of the second argument of an event, but you want to permit any value for the first argument. This is easy with `withArgs` because it supports not just specific values but also _predicates_. For example, to skip checking the first argument but assert the value of the second:

```js
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
await expect(contract.call())
  .to.emit(contract, "TwoUints")
  .withArgs(anyValue, 3);
```

Predicates are simply functions that, when called, indicate whether the value should be considered successfully matched or not. The function will receive the value as its input, but it need not use it. For example, the `anyValue` predicate is simply `() => true`.

This package provides the predicates `anyValue` and `anyUint`, but you can easily create your own:

<!-- prettier-ignore -->
```js
function isEven(x: bigint): boolean {
  return x % 2n === 0n;
}

await expect(contract.emitUint(2))
  .to.emit(contract, "Uint")
  .withArgs(isEven);
```

### Reverts

You can also easily write tests that assert whether a contract call reverted (or not) and what sort of error data to expect along with the revert.

The most simple case asserts that a revert happened:

```js
await expect(contract.call()).to.be.reverted;
```

Or, conversely, that one didn't:

```js
await expect(contract.call()).not.to.be.reverted;
```

A revert may also include some error data, such as a string, a [panic code](https://docs.soliditylang.org/en/v0.8.14/control-structures.html#panic-via-assert-and-error-via-require), or a [custom error](https://docs.soliditylang.org/en/v0.8.14/contracts.html#errors-and-the-revert-statement), and this package provides matchers for all of them.

The `revertedWith` matcher allows you to assert that a revert's error data does or doesn't match a specific string:

```js
await expect(contract.call()).to.be.revertedWith("Some revert message");
await expect(contract.call()).not.to.be.revertedWith("Another revert message");
```

The `revertedWithPanic` matcher allows you to assert that a revert did or didn't occur with a specific [panic code](https://docs.soliditylang.org/en/v0.8.14/control-structures.html#panic-via-assert-and-error-via-require). You can match a panic code via its integer value (including via hexadecimal notation, such as `0x12`) or via the `PANIC_CODES` dictionary exported from this package:

```js
const { PANIC_CODES } = require("@nomicfoundation/hardhat-chai-matchers/panic");

await expect(contract.divideBy(0)).to.be.revertedWithPanic(
  PANIC_CODES.DIVISION_BY_ZERO
);

await expect(contract.divideBy(1)).not.to.be.revertedWithPanic(
  PANIC_CODES.DIVISION_BY_ZERO
);
```

You can omit the panic code in order to assert that the transaction reverted with _any_ panic code.

The `revertedWithCustomError` matcher allows you to assert that a transaction reverted with a specific [custom error](https://docs.soliditylang.org/en/v0.8.14/contracts.html#errors-and-the-revert-statement). Please note that this matcher does not check whether the error was emitted by the contract. It merely uses the contract interface to determine the full signature of the expected error. You can use it as follows:

```js
await expect(contract.call()).to.be.revertedWithCustomError(
  contract,
  "SomeCustomError"
);
```

Just as with events, the first argument to this matcher must specify the contract that defines the custom error. If you're expecting an error from a nested call to a different contract, then you'll need to pass that different contract as the first argument.

Further, just as events can have arguments, so too can custom error objects, and, just as with events, you can assert the values of these arguments. To do this, use the same `.withArgs()` matcher, and the same predicate system:

```js
await expect(contract.call())
  .to.be.revertedWithCustomError(contract, "SomeCustomError")
  .withArgs(anyValue, "some error data string");
```

Finally, you can assert that a call reverted without any error data (neither a reason string, nor a panic code, nor a custom error):

```js
await expect(contract.call()).to.be.revertedWithoutReason();
```

### Big Numbers

Working with Ethereum smart contracts in JavaScript can be annoying due Ethereum's 256-bit native integer size. Contracts returning integer values can yield numbers greater than JavaScript's maximum safe integer value, and writing assertions about the expectations of such values can be difficult without prior familiarity with the 3rd-party big integer library used by your web3 framework.

This package enhances the standard numerical equality matchers (`equal`, `above`, `within`, etc) such that you can seamlessly mix and match contract return values with regular `Number`s. For example:

```js
expect(await token.balanceOf(someAddress)).to.equal(1);
```

These matchers support not just the native JavaScript `Number`, but also [`BigInt`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt), [bn.js](https://github.com/indutny/bn.js/), and [bignumber.js](https://github.com/MikeMcl/bignumber.js/).

### Balance Changes

Oftentimes, a transaction you're testing will be expected to have some effect on a wallet's balance, either its balance of Ether or its balance of some ERC-20 token. Another set of matchers allows you to verify that a transaction resulted in such a balance change:

```js
await expect(() =>
  sender.sendTransaction({ to: someAddress, value: 200 })
).to.changeEtherBalance(sender, "-200");

await expect(token.transfer(account, 1)).to.changeTokenBalance(
  token,
  account,
  1
);
```

Further, you can also check these conditions for multiple addresses at the same time:

```js
await expect(() =>
  sender.sendTransaction({ to: receiver, value: 200 })
).to.changeEtherBalances([sender, receiver], [-200, 200]);

await expect(token.transferFrom(sender, receiver, 1)).to.changeTokenBalances(
  token,
  [sender, receiver],
  [-1, 1]
);
```

### Miscellaneous String Checks

Sometimes you may also need to verify that hexadecimal string data is appropriate for the context it's used in. A handful of other matchers help you with this:

The `properHex` matcher asserts that the given string consists only of valid hexadecimal characters and that its length (the number of hexadecimal digits) matches its second argument:

```js
expect("0x1234").to.be.properHex(4);
```

The `properAddress` matcher asserts that the given string is a hexadecimal value of the proper length (40 hexadecimal digits):

```js
expect("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266").to.be.a.properAddress;
```

The `properPrivateKey` matcher asserts that the given string is a hexadecimal value of the proper length:

```js
expect("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80").to
  .be.a.properPrivateKey;
```

Finally, the `hexEqual` matcher accepts two hexadecimal strings and compares their numerical values, regardless of leading zeroes or upper/lower case digits:

```js
expect("0x00012AB").to.hexEqual("0x12ab");
```

## Known limitations

At the moment, some of these chai matchers only work correctly when Hardhat is running in [automine mode](/hardhat-network/docs/explanation/mining-modes). See [this issue](https://github.com/NomicFoundation/hardhat/issues/3203) for more details.

## Dig Deeper

For a full listing of all of the matchers supported by this package, see [the reference documentation](./reference.md).
