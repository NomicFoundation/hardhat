---
name: hardhat-toolbox-viem
description: Use alongside the `hardhat` skill when the project depends on `@nomicfoundation/hardhat-toolbox-viem`. Covers the viem clients exposed on `network.create()`, contract interaction (`viem.deployContract`, `read`, `write`, `getContractAt`), and `viem.assertions` (revert / event / balance assertions).
metadata:
  package: "@nomicfoundation/hardhat-toolbox-viem"
---

# Hardhat toolbox: viem

This skill builds on the core **`hardhat`** skill. Load that first for test organization, the `network.create()` shape, `networkHelpers`, fixtures, and the typechecking workflow. Everything below hangs off the connection returned by `network.create()`:

```ts
import { network } from "hardhat";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("Counter", async function () {
  const { viem, networkHelpers } = await network.create();
  // ...
});
```

## `viem`: clients and contract interaction

```ts
// Clients
const publicClient = await viem.getPublicClient();
const [owner, alice, bob] = await viem.getWalletClients(); // default accounts
const testClient = await viem.getTestClient(); // dev-only operations

// Deploy a contract, returns a fully typed instance
const counter = await viem.deployContract("Counter");

// Read state (return type inferred from ABI)
const value = await counter.read.x();

// Write transactions. Args and options are type-checked against the ABI at
// compile time; passing wrong types, wrong argument counts, or `value` on a
// non-payable function is a TypeScript error
await counter.write.inc();
await counter.write.inc({ account: alice.account }); // different sender
await counter.write.incBy([3n]); // with args
await counter.write.deposit({ value: 10n ** 18n }); // no parameters and payable

// Attach to an already-deployed contract
const existing = await viem.getContractAt("Counter", "0xabc...");
```

Avoid using `walletClient.writeContract` to interact with contracts — it has no ABI typing, so wrong args slip through. Prefer the typed instance returned by `viem.deployContract` or `viem.getContractAt`.

Inside a `loadFixture` setup function (see the `hardhat` skill for the surrounding pattern), `viem.deployContract` is the canonical deploy step:

```ts
async function deployCounter() {
  const counter = await viem.deployContract("Counter");
  return { counter };
}

const { counter } = await networkHelpers.loadFixture(deployCounter);
```

## `viem.assertions`: Ethereum-specific assertions

Use `viem.assertions` for contract-specific checks. Pass the **unawaited** transaction promise as the first argument:

```ts
// Reverts
await viem.assertions.revert(counter.write.inc({ account: banned }));
await viem.assertions.revertWith(
  counter.write.inc({ account: banned }),
  "Not authorized",
);
await viem.assertions.revertWithCustomError(
  counter.write.inc({ account: banned }),
  counter,
  "Unauthorized",
);
await viem.assertions.revertWithCustomErrorWithArgs(
  counter.write.inc({ account: banned }),
  counter,
  "Unauthorized",
  [banned],
);

// Events
await viem.assertions.emit(counter.write.inc(), counter, "Increment");
await viem.assertions.emitWithArgs(counter.write.inc(), counter, "Increment", [
  1n,
]);

// ETH balance changes (positive = received, negative = spent, before gas)
await viem.assertions.balancesHaveChanged(game.write.claim(), {
  [winner]: PRIZE,
  [loser]: -STAKE,
});
```

The `*WithArgs` matchers (`revertWithCustomErrorWithArgs` and `emitWithArgs`) accept a `(value) => boolean` predicate at any arg position, alongside concrete values. The plugin also ships an `anyValue` helper for positions you don't care about:

```ts
import { anyValue } from "@nomicfoundation/hardhat-toolbox-viem/predicates";

// Inline predicate at any arg position. Useful for ranges or computed conditions.
await viem.assertions.revertWithCustomErrorWithArgs(
  contract.write.failing(),
  contract,
  "BadValue",
  [(n: bigint) => n > 100n, "another error arg"],
);
await viem.assertions.emitWithArgs(
  counter.write.incBy([3n]),
  counter,
  "Increment",
  [(by: bigint) => by >= 1n],
);

// `anyValue` matches anything — handy for fields you don't care about.
await viem.assertions.revertWithCustomErrorWithArgs(
  contract.write.failing(),
  contract,
  "BadValue",
  [anyValue, "another error arg"],
);
```

For plain TypeScript assertions (equality, arrays, types), use `node:assert/strict`.
