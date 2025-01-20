# Reference

This is the reference for the Hardhat Chai Matchers plugin. This is a [chai](https://www.chaijs.com/) plugin that adds new assertion capabilities for testing smart contracts.

## Numbers

When `@nomicfoundation/hardhat-chai-matchers` is used, equality comparisons of numbers will work even if the numbers are represented by different types. This means that assertions like this:

```ts
expect(await token.totalSupply()).to.equal(1_000_000);
```

will work. These assertions don't normally work because the value returned by `totalSupply()` is a [bigint](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt), and a bigint value will always be different than a plain number.

The supported types are:

- Plain javascript numbers
- [BigInts](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt)
- [`bn.js`](https://github.com/indutny/bn.js/) instances
- [`bignumber.js`](https://github.com/MikeMcl/bignumber.js/) instances

This also works when deep-equal comparisons of arrays or objects are performed:

```ts
expect(await contract.getRatio()).to.deep.equal([100, 55]);
```

## Reverted transactions

Several matchers are included to assert that a transaction reverted, and the reason of the revert.

### `.reverted`

Assert that a transaction reverted for any reason, without checking the cause of the revert:

```ts
await expect(token.transfer(address, 0)).to.be.reverted;
```

### `.revertedWith`

Assert that a transaction reverted with a specific reason string:

```ts
await expect(token.transfer(address, 0)).to.be.revertedWith(
  "transfer value must be positive"
);
```

You can also use regular expressions:

```ts
await expect(token.transfer(address, 0)).to.be.revertedWith(
  /AccessControl: account .* is missing role .*/
);
```

### `.revertedWithCustomError`

Assert that a transaction reverted with a specific [custom error](https://docs.soliditylang.org/en/v0.8.14/contracts.html#errors-and-the-revert-statement):

```ts
await expect(token.transfer(address, 0)).to.be.revertedWithCustomError(
  token,
  "InvalidTransferValue"
);
```

The first argument must be the contract that defines the error. The contract is used to determine the full signature of the expected error. The matcher does not check whether the error was emitted by the contract.

If the error has arguments, the `.withArgs` matcher can be added:

```ts
await expect(token.transfer(address, 0))
  .to.be.revertedWithCustomError(token, "InvalidTransferValue")
  .withArgs(0);
```

See the [`.withArgs`](#.withargs) matcher entry to learn more.

### `.revertedWithPanic`

Assert that a transaction reverted with a [panic code](https://docs.soliditylang.org/en/v0.8.14/control-structures.html#panic-via-assert-and-error-via-require):

```ts
await expect(token.transfer(address, 0)).to.be.revertedWithPanic();
```

An optional argument can be passed to assert that a specific panic code was thrown:

```ts
await expect(token.transfer(address, 0)).to.be.revertedWithPanic(0x12);
```

You can also import and use the `PANIC_CODES` dictionary:

```ts
import { PANIC_CODES } from "@nomicfoundation/hardhat-chai-matchers/panic";

await expect(token.transfer(address, 0)).to.be.revertedWithPanic(
  PANIC_CODES.DIVISION_BY_ZERO
);
```

### `.revertedWithoutReason`

Assert that a transaction reverted without returning a reason:

```ts
await expect(token.transfer(address, 0)).to.be.revertedWithoutReason();
```

This matcher differs from `.reverted` in that it will fail if the transaction reverts with a reason string, custom error or panic code. Examples of Solidity expressions that revert without a reason are `require(false)` (without the reason string) and `assert(false)` before Solidity v0.8.0. This also happens for out-of-gas errors.

## Events

### `.emit`

Assert that a transaction emits a specific event:

```ts
await expect(token.transfer(address, 100)).to.emit(token, "Transfer");
```

The first argument must be the contract that emits the event.

If the event has arguments, the `.withArgs` matcher can be added:

```ts
await expect(token.transfer(address, 0))
  .to.emit(token, "Transfer")
  .withArgs(100);
```

See the [`.withArgs`](#.withargs) matcher entry to learn more.

## Balance change

These matchers can be used to assert how a given transaction affects the ether balance, or an ERC20 token balance, of a specific address.

All these matchers assume that the given transaction is the only transaction mined in its block.

### `.changeEtherBalance`

Assert that the ether balance of an address changed by a specific amount:

```ts
await expect(
  sender.sendTransaction({ to: receiver, value: 1000 })
).to.changeEtherBalance(sender, -1000);
```

This matcher ignores the fees of the transaction, but you can include them with the `includeFee` option:

```ts
await expect(
  sender.sendTransaction({ to: receiver, value: 1000 })
).to.changeEtherBalance(sender, -22000, { includeFee: true });
```

### `.changeTokenBalance`

Assert that an ERC20 token balance of an address changed by a specific amount:

```ts
await expect(token.transfer(receiver, 1000)).to.changeTokenBalance(
  token,
  sender,
  -1000
);
```

The first argument must be the contract of the token.

### `.changeEtherBalances`

Like `.changeEtherBalance`, but allows checking multiple addresses at the same time:

```ts
await expect(
  sender.sendTransaction({ to: receiver, value: 1000 })
).to.changeEtherBalances([sender, receiver], [-1000, 1000]);
```

### `.changeTokenBalances`

Like `.changeTokenBalance`, but allows checking multiple addresses at the same time:

```ts
await expect(token.transfer(receiver, 1000)).to.changeTokenBalances(
  token,
  [sender, receiver],
  [-1000, 1000]
);
```

## Other matchers

### `.withArgs`

Can be used after a `.emit` or a `.revertedWithCustomError` matcher to assert the values of the event/error's arguments:

```ts
// events
await expect(token.transfer(address, 0))
  .to.emit(token, "Transfer")
  .withArgs(100);

// errors
await expect(token.transfer(address, 0))
  .to.be.revertedWithCustomError(token, "InvalidTransferValue")
  .withArgs(0);
```

If you don't care about the value of one of the arguments, you can use the `anyValue` predicate:

```ts
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

await expect(factory.create(9999))
  .to.emit(factory, "Created")
  .withArgs(anyValue, 9999);
```

Predicates are just functions that return true if the value is correct, and return false if it isn't, so you can create your own predicates:

```ts
function isEven(x: bigint): boolean {
  return x % 2n === 0n;
}

await expect(token.transfer(100)).to.emit(token, "Transfer").withArgs(isEven);
```

### `.properAddress`

Assert that the given string is a proper address:

```ts
expect("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266").to.be.properAddress;
```

### `.properPrivateKey`

Assert that the given string is a proper private key:

```ts
expect("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80").to
  .be.properPrivateKey;
```

### `.properHex`

Assert that the given string is a proper hexadecimal string of a specific length:

```ts
expect("0x1234").to.be.properHex(4);
```

### `.hexEqual`

Assert that the given hexadecimal strings correspond to the same numerical value:

```ts
expect("0x00012AB").to.hexEqual("0x12ab");
```
