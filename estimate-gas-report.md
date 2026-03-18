# HH2 to HH3: Gas Estimation Default Change — Performance and Correctness Impact

**Related issue:** [EDR #1283](https://github.com/NomicFoundation/edr/issues/1283) — OpenZeppelin Contracts test failures due to gas limit behavior change

## Executive Summary

Hardhat 3 changed the default `gas` configuration for the hardhat network from a fixed value (16,777,216 in HH2) to `"auto"`. This means every `signer.sendTransaction(tx)` that omits an explicit `gasLimit` now triggers a full `eth_estimateGas` round-trip — **up to 23 EVM executions per transaction instead of 1** (see [Appendix B](#appendix-b-how-gas-estimation-works-in-edr)). This is a silent behavioral change: users migrating from HH2 with the same config get different behavior.

This causes two problems:

**1. Performance regression** — benchmarks on 10,000 transactions using HH3 hardhat-ethers in both cases, only varying the `gas` config passed to `createHardhatRuntimeEnvironment` — `gas: 16_777_216n` (fixed, skips estimation) vs default `gas: "auto"` (triggers estimation). Median ms/tx, slowdown = auto median / fixed median. **Note:** this benchmark was developed with Claude Code and run locally on a single machine — results are indicative but should be validated independently (see [Appendix C](#appendix-c-benchmark-details) for full results and methodology):

| Scenario | Fixed gas (median) | Auto gas (median) | Overhead | Slowdown |
|---|---:|---:|---:|---:|
| Plain ETH transfers | 1.88 ms/tx | 2.35 ms/tx | +0.47 ms | **1.25x** |
| Simple contract call (`inc()`) | 1.95 ms/tx | 2.46 ms/tx | +0.51 ms | **1.26x** |
| Two-event emission (`emitsTwoEvents()`) | 1.98 ms/tx | 2.56 ms/tx | +0.59 ms | **1.30x** |
| Heavy contract (`heavyWrite(50)`) | 5.83 ms/tx | 9.10 ms/tx | +3.27 ms | **1.56x** |
| Contract deployments | 2.44 ms/tx | 2.95 ms/tx | +0.51 ms | **1.21x** |

**2. Correctness issue** — the estimated gas can be insufficient for unchecked inner calls (e.g., ERC-4337 patterns), causing silent state change failures that break tests which passed in HH2 (see [Section 2](#2-correctness-issue) and [Appendix D](#appendix-d-correctness-issue--unchecked-inner-calls)).

---

## 1. Behavioral Change from HH2 to HH3

The hardhat-ethers signer calls `eth_estimateGas` before every transaction unless it has a cached `#gasLimit`. That cached value is set when the network config has a fixed `gas` number, and left undefined when `gas` is `"auto"`. The signer logic is identical in HH2 and HH3 — what changed is the default config value (see [Appendix A](#appendix-a-hh2-vs-hh3-config-resolution) for the full code walkthrough):

| | Default `gas` config | Signer behavior | `eth_estimateGas` called? |
|---|---|---|---|
| **HH2** | `16_777_216` (number) | Caches as `_gasLimit` | **Never** |
| **HH3** | `"auto"` (string) | `#gasLimit` stays `undefined` | **Every transaction** |

Note that EDR's `eth_sendTransaction` does not require a gas limit — when the `gas` field is missing from the RPC request, it defaults to `block_gas_limit()` and executes the transaction as-is (see [Appendix B, Step 6](#step-6-the-actual-transaction-eth_sendtransaction)). The estimation round-trip is added by the ethers signer before the RPC request is sent.

This is a **silent behavioral change**: a user migrating from HH2 to HH3 with the same `hardhat.config.ts` (no explicit `gas` setting) will see every transaction trigger 2-23 additional EVM executions (see [Appendix B](#appendix-b-how-gas-estimation-works-in-edr)), increasing test suite execution time by 21-56% per transaction depending on complexity (see [Appendix C](#appendix-c-benchmark-details)). The user's config didn't change — the default did — making the slowdown invisible and hard to diagnose.

---

## 2. Correctness Issue

Beyond performance, the switch to `eth_estimateGas` can also cause **test failures**. The estimation binary search finds the minimum gas for the outer transaction to succeed, but this can be insufficient for unchecked inner calls (e.g., ERC-4337's `_payPrefund`). The inner call silently fails due to insufficient gas, the outer tx succeeds, but expected state changes don't happen — causing tests that passed in HH2 to fail in HH3 ([EDR #1283](https://github.com/NomicFoundation/edr/issues/1283)).

See [Appendix D](#appendix-d-correctness-issue--unchecked-inner-calls) for the full analysis of the OpenZeppelin case and affected patterns.

---

## 3. Workaround

Setting a fixed `gas` in the network config bypasses estimation for every transaction:

```typescript
// hardhat.config.ts
export default {
  networks: {
    hardhat: {
      gas: 16_777_216n, // fixed gas, no estimation
    }
  }
};
```

---

## 4. Open Questions

- **Why does the ethers signer call `eth_estimateGas` on every transaction?** `eth_estimateGas` is useful as a user-facing API, but calling it implicitly before every `sendTransaction` in a local test environment adds overhead without a clear benefit.

- **Should HH3 restore HH2's default?** Setting `gas: 16_777_216` (or a similar fixed value) as the default for the hardhat network would restore HH2 behavior, avoid the silent migration regression, and resolve the correctness issue with unchecked inner calls.

- **Should the migration guide document this change?** Users migrating from HH2 currently have no way to know that the gas default changed or that adding `gas: 16_777_216n` to their config is a workaround.

---

## 5. Takeaways

This issue originated from a single config default changing from a fixed number to `"auto"`. That one-line difference altered which Hardhat code paths get executed on every transaction — the ethers signer now calls `eth_estimateGas` before `eth_sendTransaction`, where it previously skipped estimation entirely and sent transactions directly with a cached gas limit. This introduced both a 21-56% performance regression and a correctness bug that breaks tests relying on unchecked inner calls.

HH2 and HH3 can use the same version of EDR, but the surface area of EDR that each version exercises is different. HH2's fixed gas default meant that `eth_estimateGas` was effectively dead code for the hardhat network — never called, never tested in that context. HH3 activates it on every transaction, exposing behaviors (like the binary search converging on insufficient gas for unchecked inner calls) that were always present in EDR but never triggered in practice.

This is worth keeping in mind as HH3 evolves: changes to defaults, plugin wiring, or config resolution can shift which code paths are hit at the Hardhat and EDR layers, with consequences that may not be obvious from the change itself.

### Personal note

This issue makes me wonder if we should have a way to benchmark HH2 vs HH3 against the test suites of high-profile repositories like OpenZeppelin Contracts. We don't have that today, but if a single config default change can silently introduce this kind of regression, there might be other cases we haven't noticed yet. Having a comparison suite that catches performance and behavioral differences before users do could save us from discovering them through bug reports.

---

## References

- [EDR #1283](https://github.com/NomicFoundation/edr/issues/1283) — OpenZeppelin Contracts test failures
- HH2 gas config resolution: [`config-resolution.ts:187-189`](https://github.com/NomicFoundation/hardhat/blob/57def441780d689dc6da5dc55199ac3339f79ead/packages/hardhat-core/src/internal/core/config/config-resolution.ts#L187-L189)
- HH2 signer (caches fixed gas): [`signers.ts:49-55`](https://github.com/NomicFoundation/hardhat/blob/57def441780d689dc6da5dc55199ac3339f79ead/packages/hardhat-ethers/src/signers.ts#L49-L55)
- HH3 gas config default: [`config.ts:65`](https://github.com/NomicFoundation/hardhat/blob/79fc0891a26fd4c27cca7ee1c07807778da52e93/v-next/hardhat/src/internal/builtin-plugins/network-manager/hook-handlers/config.ts#L65)
- HH3 signer (skips cache when `"auto"`): [`signers.ts:63-67`](https://github.com/NomicFoundation/hardhat/blob/79fc0891a26fd4c27cca7ee1c07807778da52e93/v-next/hardhat-ethers/src/internal/signers/signers.ts#L63-L67)
- HH3 signer (estimateGas path): [`signers.ts:286-295`](https://github.com/NomicFoundation/hardhat/blob/79fc0891a26fd4c27cca7ee1c07807778da52e93/v-next/hardhat-ethers/src/internal/signers/signers.ts#L286-L295)

### Key Files

| Component | File |
|---|---|
| Signer (sendTransaction, gasLimit logic) | `v-next/hardhat-ethers/src/internal/signers/signers.ts` |
| Provider (estimateGas RPC call) | `v-next/hardhat-ethers/src/internal/hardhat-ethers-provider/hardhat-ethers-provider.ts` |
| EDR eth_estimateGas handler | `edr/crates/edr_provider/src/requests/eth/gas.rs` |
| EDR estimate_gas implementation | `edr/crates/edr_provider/src/data.rs:2728-2877` |
| EDR binary search | `edr/crates/edr_provider/src/data/gas.rs:96-172` |
| EDR eth_sendTransaction handler | `edr/crates/edr_provider/src/requests/eth/transactions.rs:161-182` |
| EDR dry_run_with_inspector | `edr/crates/edr_provider/src/data/call.rs:65-102` |
| EDR min_difference thresholds | `edr/crates/edr_provider/src/data/gas.rs:176-190` |
| Benchmark script | `v-next/hardhat-ethers/benchmark/gas-estimation.ts` |

---

## Appendix A: HH2 vs HH3 Config Resolution

### HH2: Fixed gas by default (no estimation)

**Step 1: Config resolution sets gas to a fixed number.**

When the user doesn't set `gas`, HH2 resolves it to `Math.min(16_777_216, blockGasLimit)` = **16,777,216**:

[`packages/hardhat-core/src/internal/core/config/config-resolution.ts:187-189`](https://github.com/NomicFoundation/hardhat/blob/57def441780d689dc6da5dc55199ac3339f79ead/packages/hardhat-core/src/internal/core/config/config-resolution.ts#L187-L189)
```typescript
const gas =
  hardhatNetworkConfig.gas ??
  Math.min(FUSAKA_TRANSACTION_GAS_LIMIT, blockGasLimit);
// FUSAKA_TRANSACTION_GAS_LIMIT = 16_777_216 (2^24, EIP-7825)
// blockGasLimit defaults to 60_000_000
// Result: gas = 16_777_216
```

**Step 2: Signer sees a number (not `"auto"`), caches it, skips estimation.**

[`packages/hardhat-ethers/src/signers.ts:49-55`](https://github.com/NomicFoundation/hardhat/blob/57def441780d689dc6da5dc55199ac3339f79ead/packages/hardhat-ethers/src/signers.ts#L49-L55)
```typescript
if (hre.network.name === "hardhat") {
  // Hardhat core already sets this value to the block gas limit when the
  // user doesn't specify a number.
  if (hre.network.config.gas !== "auto") {
    gasLimit = hre.network.config.gas; // 16_777_216 — cached, no estimation
  }
}
```

**Result: HH2 never called `eth_estimateGas` for the hardhat network with default config.**

### HH3: Auto gas by default (estimation on every tx)

**Step 1: Config defaults gas to `"auto"`.**

[`v-next/hardhat/src/internal/builtin-plugins/network-manager/hook-handlers/config.ts:65`](https://github.com/NomicFoundation/hardhat/blob/79fc0891a26fd4c27cca7ee1c07807778da52e93/v-next/hardhat/src/internal/builtin-plugins/network-manager/hook-handlers/config.ts#L65)
```typescript
const defaultEdrNetworkConfigValues = {
  gas: "auto",   // ← changed from fixed number
  // ...
};
```

**Step 2: Signer sees `"auto"`, does not cache, calls `eth_estimateGas` on every tx.**

[`v-next/hardhat-ethers/src/internal/signers/signers.ts:63-67`](https://github.com/NomicFoundation/hardhat/blob/79fc0891a26fd4c27cca7ee1c07807778da52e93/v-next/hardhat-ethers/src/internal/signers/signers.ts#L63-L67)
```typescript
let gasLimit: bigint | undefined;

if (networkConfig.gas !== "auto") {
  gasLimit = networkConfig.gas;
}
// gas is "auto" → gasLimit stays undefined → estimation on every tx
```

Which leads to estimation at send time:

[`v-next/hardhat-ethers/src/internal/signers/signers.ts:286-295`](https://github.com/NomicFoundation/hardhat/blob/79fc0891a26fd4c27cca7ee1c07807778da52e93/v-next/hardhat-ethers/src/internal/signers/signers.ts#L286-L295)
```typescript
if (resolvedTx.gasLimit === null || resolvedTx.gasLimit === undefined) {
  if (this.#gasLimit !== undefined) {
    resolvedTx.gasLimit = this.#gasLimit;
  } else {
    // #gasLimit is undefined because gas was "auto" → estimate every time
    resolvedTx.gasLimit = await this.provider.estimateGas({
      ...resolvedTx,
      from: this.address,
    });
  }
}
```

---

## Appendix B: How Gas Estimation Works in EDR

### The Flow: HardhatEthersSigner.sendTransaction to EDR

#### Step 1: Signer decides whether to estimate

**File:** `v-next/hardhat-ethers/src/internal/signers/signers.ts`

`sendTransaction()` (lines 175-209) calls `#sendUncheckedTransaction()` (lines 260-319), which has this decision tree for gasLimit (lines 286-299):

```typescript
if (resolvedTx.gasLimit === null || resolvedTx.gasLimit === undefined) {
  if (this.#gasLimit !== undefined) {
    // SKIP estimation: use the configured default gasLimit
    resolvedTx.gasLimit = this.#gasLimit;
  } else {
    // CALL estimateGas -> triggers eth_estimateGas RPC
    promises.push(
      (async () => {
        resolvedTx.gasLimit = await this.provider.estimateGas({
          ...resolvedTx,
          from: this.address,
        });
      })(),
    );
  }
}
```

**Decision tree:**
- If `tx.gasLimit` is provided -> **SKIP** estimation
- Else if signer has `#gasLimit` (from network config with `gas !== "auto"`) -> **SKIP** estimation
- Else -> **CALL `eth_estimateGas`** via the provider

The `#gasLimit` field is set during signer creation (lines 54-75):
```typescript
let gasLimit: bigint | undefined;
if (networkConfig.gas !== "auto") {
  gasLimit = networkConfig.gas;
}
return new HardhatEthersSigner(address, provider, signerAccounts, gasLimit);
```

#### Step 2: Provider sends the RPC call

**File:** `v-next/hardhat-ethers/src/internal/hardhat-ethers-provider/hardhat-ethers-provider.ts` (lines 301-320)

- Resolves the transaction request (addresses, block tag)
- Converts to RPC format using `getRpcTransaction()`
- Makes RPC call: `eth_estimateGas` with the transaction and block tag
- Returns the result as a bigint

#### Step 3: EDR receives eth_estimateGas

**File:** `edr/crates/edr_provider/src/requests/eth/gas.rs` (line 38)

Calls `data.estimate_gas()`.

#### Step 4: EDR runs estimation algorithm

**File:** `edr/crates/edr_provider/src/data.rs` (lines 2728-2877)

**Phase A: Initial dry run** (lines 2761-2775)
- Executes transaction with block's gas limit
- Uses `call::run_call()` -> `guaranteed_dry_run_with_inspector()`
- Full EVM execution with call tracing

**Phase B: Quick check** (lines 2818-2842)
- Tests if `initial_estimation` succeeds with `check_gas_limit()`
- If successful -> returns immediately (avoids binary search)
- If fails -> proceeds to binary search

**Phase C: Binary search** (lines 2855-2869)
- Narrows down from `initial_estimation` to block gas limit
- Up to 20 iterations of `check_gas_limit()` calls

#### Step 5: Binary search details

**File:** `edr/crates/edr_provider/src/data/gas.rs` (lines 96-172)

```
MAX_ITERATIONS = 20

while upper_bound - lower_bound > min_difference(lower_bound) && i < MAX_ITERATIONS:
    mid = avg(lower_bound, upper_bound)
    if first iteration: mid = min(mid, 3 * lower_bound)  // optimization
    create new EvmObserver
    run check_gas_limit() -> full EVM execution
    collect call traces
    adjust bounds based on success/failure
```

**Adaptive min_difference thresholds** (lines 176-190):

| Gas range | min_difference (convergence threshold) |
|---|---|
| >= 4M | 50,000 |
| >= 1M | 10,000 |
| >= 100K | 1,000 |
| >= 50K | 500 |
| >= 30K | 300 |
| < 30K | 200 |

#### Step 6: The actual transaction (eth_sendTransaction)

**File:** `edr/crates/edr_provider/src/requests/eth/transactions.rs` (lines 161-182)

- Does **NOT** estimate gas
- If `gas` field is missing, defaults to `block_gas_limit()`
- Transaction is signed and executed as-is

#### Step 7: Each EVM execution in detail

**File:** `edr/crates/edr_provider/src/data/call.rs` (lines 65-102)

Each invocation:
- Calls `guaranteed_dry_run_with_inspector()` from the EVM crate
- Wraps block env with `BlockEnvWithZeroBaseFee` (base fee = 0, matching Geth behavior)
- Executes the transaction in the EVM
- Returns execution result (Success/Revert/Halt) and metadata
- Collects call traces through the `EvmObserver`

### EVM executions per transaction

| Step | Best case | Worst case |
|---|---:|---:|
| Initial dry run | 1 | 1 |
| Quick check | 1 (passes) | 1 (fails) |
| Binary search | 0 | 20 |
| Actual eth_sendTransaction | 1 | 1 |
| **Total** | **3** | **23** |

---

## Appendix C: Benchmark Details

**Note:** This benchmark script was developed with Claude Code and run locally on a single machine. The results are indicative of the relative overhead but should be validated independently before drawing definitive conclusions.

### Methodology

- **Tool:** Custom benchmark script at `v-next/hardhat-ethers/benchmark/gas-estimation.ts`
- **Environment:** EDR in-process (same as normal HH3 TS/JS tests)
- **Iterations:** 10,000 transactions per scenario, 5 warmup
- **Measurement:** Each transaction is timed individually. Results report **median** (primary metric — resistant to GC/JIT outliers), **average**, and **p95** (tail latency)
- **Comparison:** Each scenario runs twice — once with `gas: 16_777_216n` (fixed, skips estimation) and once with `gas: "auto"` (default, triggers estimation). Slowdown ratio = auto median / fixed median
- **Contracts:** Pre-compiled `Example` contract (simple) and `Heavy` contract (50 storage writes + 50 events per call)

Run the benchmark:
```bash
cd v-next/hardhat-ethers
node --import tsx/esm benchmark/gas-estimation.ts 10000
```

### Results (10,000 transactions each)

#### 1) Plain ETH transfers

|  | Median | Avg | p95 | Total |
|---|---:|---:|---:|---:|
| Fixed gas | 1.88 ms/tx | 2.04 ms/tx | 2.56 ms/tx | 20,363 ms |
| Auto gas (estimateGas) | 2.35 ms/tx | 2.62 ms/tx | 3.35 ms/tx | 26,186 ms |
| **Overhead (median)** | **+0.47 ms** | | | |

**1.25x slower.** Simplest possible transaction (21K gas).

#### 2) Contract calls — inc()

|  | Median | Avg | p95 | Total |
|---|---:|---:|---:|---:|
| Fixed gas | 1.95 ms/tx | 2.16 ms/tx | 2.77 ms/tx | 21,582 ms |
| Auto gas (estimateGas) | 2.46 ms/tx | 2.76 ms/tx | 3.81 ms/tx | 27,591 ms |
| **Overhead (median)** | **+0.51 ms** | | | |

**1.26x slower.** Single storage write + event emission (~26K gas).

#### 3) Contract calls — emitsTwoEvents()

|  | Median | Avg | p95 | Total |
|---|---:|---:|---:|---:|
| Fixed gas | 1.98 ms/tx | 2.23 ms/tx | 3.24 ms/tx | 22,272 ms |
| Auto gas (estimateGas) | 2.56 ms/tx | 2.86 ms/tx | 3.80 ms/tx | 28,604 ms |
| **Overhead (median)** | **+0.59 ms** | | | |

**1.30x slower.** Two event emissions, no storage writes.

#### 4) Heavy contract — heavyWrite(50)

|  | Median | Avg | p95 | Total |
|---|---:|---:|---:|---:|
| Fixed gas | 5.83 ms/tx | 7.61 ms/tx | 17.84 ms/tx | 76,146 ms |
| Auto gas (estimateGas) | 9.10 ms/tx | 12.20 ms/tx | 30.87 ms/tx | 122,015 ms |
| **Overhead (median)** | **+3.27 ms** | | | |

**1.56x slower.** 50 storage writes + 50 event emissions per call (~1M gas). The highest overhead of all scenarios. Note the large gap between median and p95 (5.83 vs 17.84 for fixed, 9.10 vs 30.87 for auto).

#### 5) Contract deployments

|  | Median | Avg | p95 | Total |
|---|---:|---:|---:|---:|
| Fixed gas | 2.44 ms/tx | 2.74 ms/tx | 3.95 ms/tx | 27,403 ms |
| Auto gas (estimateGas) | 2.95 ms/tx | 3.25 ms/tx | 4.62 ms/tx | 32,497 ms |
| **Overhead (median)** | **+0.51 ms** | | | |

**1.21x slower.** Deploying a small contract (~77K gas).

### Summary chart

```
Median overhead per tx (ms)       Slowdown (median ratio)

Plain transfers    |==          +0.47ms     1.25x
inc()              |==          +0.51ms     1.26x
emitsTwoEvents()   |==          +0.59ms     1.30x
heavyWrite(50)     |========    +3.27ms     1.56x
Deployments        |==          +0.51ms     1.21x
```

---

## Appendix D: Correctness Issue — Unchecked Inner Calls

### The OpenZeppelin case

[EDR #1283](https://github.com/NomicFoundation/edr/issues/1283) reports that OpenZeppelin Contracts tests pass in HH2 but fail in HH3. The failing test validates ERC-4337's `_payPrefund` pattern:

```solidity
function _payPrefund(uint256 missingAccountFunds) internal virtual {
    if (missingAccountFunds != 0) {
        (bool success,) = payable(msg.sender).call{value: missingAccountFunds}("");
        (success); // success is intentionally ignored — ERC-4337 pattern
    }
}
```

### Why the binary search gets this wrong

EDR's `eth_estimateGas` uses binary search to find the **minimum gas where the outer transaction succeeds** (see [Appendix B](#appendix-b-how-gas-estimation-works-in-edr) for algorithm details). For unchecked inner calls, this creates a problem:

| Gas provided | Inner call | Outer transaction | Binary search verdict |
|---|---|---|---|
| High (e.g., 16.7M) | Succeeds | Succeeds | "Too much gas, try lower" |
| Medium | Fails silently | Succeeds (unchecked) | "This works, try lower" |
| Low (estimated) | Fails silently | Succeeds (unchecked) | "Found minimum" |

The binary search converges on a gas limit where the **inner call runs out of gas**, but the outer transaction still succeeds because the result is intentionally not checked. The estimated gas is technically correct for the outer tx, but insufficient for the intended behavior.

### Observed behavior

| Environment | Gas limit | Inner call | Balance updated | Test result |
|---|---|---|---|---|
| **HH2** | 16,777,216 (fixed) | Succeeds | Yes | Pass |
| **HH3** | ~estimated minimum | Out of gas | No | **Fail** |

The transaction succeeds in both versions — but only HH2 provides enough gas for the inner call to actually execute and transfer funds.

### Affected patterns

This impacts any contract pattern where:
- An inner call is made with `call{value: ...}("")`
- The return value is intentionally ignored (no `require(success)`)
- The test asserts on state changes from the inner call

The known affected case is **ERC-4337** account abstraction (`_payPrefund` in OpenZeppelin Contracts).
