---
name: hardhat
description: Use when working with Hardhat 3 projects — writing or modifying Solidity tests, TypeScript tests, or any code touching hardhat.config.ts, the `hardhat` import, or `network.create()`. Covers test-layer choice, forge-std cheatcodes, the network connection API, `networkHelpers`, and the compile-then-typecheck workflow. For toolbox-specific guidance (clients, contract calls, assertions), also load the matching `hardhat-toolbox-*` skill.
metadata:
  package: "hardhat"
---

# Hardhat 3

This skill covers Hardhat 3 itself. The toolbox layer (clients, contract interaction, ecosystem-specific assertions) lives in companion skills — load whichever matches the project:

- `@nomicfoundation/hardhat-toolbox-viem` → also load the **`hardhat-toolbox-viem`** skill.
- `@nomicfoundation/hardhat-toolbox-mocha-ethers` → also load the **`hardhat-toolbox-mocha-ethers`** skill.

## Test organization

Hardhat 3 supports two distinct test layers:

**Solidity tests** (`.t.sol` files in `contracts/`, or any `.sol` file in `test/`) are the default choice for unit tests on individual contracts. They run directly in the EVM, compile-check against the real ABI, and have access to cheatcodes for EVM state manipulation. Any public function whose name starts with `test` is executed as a test case.

**TypeScript tests** (`.ts` files in `test/`) are the right choice when a test requires off-chain orchestration: multi-contract interactions, fixture reuse across a large suite, assertions about gas or ETH balances from the outside, or integration scenarios driven by external state.

Reach for TypeScript only when Solidity isn't enough. Solidity tests cover all contract logic; TypeScript tests cover the end-to-end flow as a user or script would experience it.

```bash
hardhat test            # run all tests (Solidity + TypeScript)
hardhat test solidity   # Solidity tests only
```

TypeScript tests are run either with `hardhat test nodejs` or with `hardhat test mocha`, depending on the toolbox or plugins being used: the viem-based toolbox uses `nodejs` while the ethers+mocha toolbox uses `mocha`.

Pass `--coverage` to collect Solidity coverage while running tests. It works on the main `hardhat test` task as well as the `solidity` and TypeScript subtasks (`nodejs` / `mocha`), so you can scope coverage to a single test layer when needed.

## Solidity tests

Any contract that contains at least one `test*` function is treated as a test contract. Use `forge-std` (if present in `package.json`) for assertions and cheatcodes:

```solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import { Test } from "forge-std/Test.sol";
import { Counter } from "./Counter.sol";

contract CounterTest is Test {
  Counter counter;

  function setUp() public {
    counter = new Counter();
  }

  function test_InitialValueIsZero() public view {
    assertEq(counter.x(), 0);
  }

  function test_IncByIncreasesByAmount() public {
    counter.incBy(3);
    assertEq(counter.x(), 3);
  }

  // Fuzz test: Hardhat runs this with many random inputs automatically
  function testFuzz_Inc(uint8 x) public {
    for (uint8 i = 0; i < x; i++) {
      counter.inc();
    }
    require(counter.x() == x, "Value after calling inc x times should be x");
  }
}
```

The `vm` object (from `forge-std/Test.sol`) exposes cheatcodes for EVM state manipulation. Commonly used ones:

| Cheatcode | Effect |
| --- | --- |
| `vm.prank(addr)` | Sets `msg.sender` for the next call only |
| `vm.startPrank(addr)` / `vm.stopPrank()` | Sets `msg.sender` for a range of calls |
| `vm.deal(addr, amount)` | Sets an account's ETH balance |
| `vm.warp(timestamp)` | Sets `block.timestamp` |
| `vm.roll(blockNum)` | Sets `block.number` |
| `vm.expectRevert(...)` | Asserts the next call reverts |
| `vm.expectEmit(...)` | Asserts the next call emits a specific event |

## TypeScript tests and the network connection

The central object in a TypeScript test is the **network connection**, created by `network.create()`. Toolbox plugins extend it with helper objects (e.g. `viem` or `ethers`, plus `networkHelpers`):

```ts
import { network } from "hardhat";

const { networkHelpers } = await network.create();
// Toolbox plugins also expose viem / ethers on this object;
// see the matching hardhat-toolbox-* skill.
```

Hardhat 3 only works with ESM, so top-level `await` is available. Each call to `network.create()` produces an **isolated blockchain state**. A top-level network connection can be used when the same connection and its associated state can be shared across all tests in the file. For more isolation, you can create a new connection for each test suite or even each test case.

### `networkHelpers`: EVM state manipulation

`networkHelpers` wraps all of Hardhat's development-only helpers behind a typed, ergonomic API. Prefer it over raw JSON-RPC calls:

```ts
// Time
await networkHelpers.time.increase(60); // mine a block 60 s ahead
await networkHelpers.time.increaseTo(target); // mine to a specific timestamp
const now = await networkHelpers.time.latest(); // latest block timestamp
await networkHelpers.time.setNextBlockTimestamp(ts); // set without mining

// Blocks
await networkHelpers.mine(); // mine one block
await networkHelpers.mine(5); // mine several blocks

// Accounts
await networkHelpers.impersonateAccount(addr);
await networkHelpers.setBalance(addr, 10n ** 18n);

// Block parameters
await networkHelpers.setPrevRandao(value); // set block.prevrandao for the next block
await networkHelpers.setNextBlockBaseFeePerGas(baseFee);

// Fixtures
//
// loadFixture runs the setup once and snapshots the state. Subsequent calls
// restore the snapshot instead of re-deploying, much faster for large suites.
// The deploy step inside the fixture is toolbox-specific (e.g.
// viem.deployContract, an ethers ContractFactory) — see the matching
// hardhat-toolbox-* skill.
async function deployCounter() {
  // ... toolbox-specific deploy ...
  return { counter };
}

const { counter } = await networkHelpers.loadFixture(deployCounter);
// loadFixture requires a named function for caching to work (not an
// arrow/anonymous function)

// Snapshots (manual)
const snap = await networkHelpers.takeSnapshot();
// ... do things ...
await snap.restore();
```

For plain TypeScript assertions (equality, arrays, types), use `node:assert/strict`. For ecosystem-specific assertions (reverts, events, balance changes), see the matching `hardhat-toolbox-*` skill.

## Typechecking

Generated contract types are derived from the compiled ABI (viem in the viem toolbox, TypeChain in the ethers toolbox), so recompile first, then typecheck. The example below uses npm; swap `npx` for whichever package manager runner this project uses:

```bash
npx hardhat build && npx tsc --noEmit
```

The compiler will catch wrong argument types, missing arguments, and invalid options (e.g. `value` on a non-payable function) before you even start the test runner. Make this a habit: it surfaces many mistakes faster than running the full test suite.
