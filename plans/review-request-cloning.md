# Review Request Cloning

## Background

Every RPC call in Hardhat 3 passes through an `onRequest` hook handler ([network.ts:66](v-next/hardhat/src/internal/builtin-plugins/network-manager/hook-handlers/network.ts#L66)) that `deepClone`s the full JSON-RPC request object using `rfdc`. This exists to prevent hook handlers from mutating a shared request. In the OpenZeppelin test suite (142K RPC calls), `deepClone` alone accounts for **36.5% of total RPC time** (53.6s out of 146.8s). Removing it cuts RPC time by 48.5% with all 7549 tests still passing.

## Baseline

To baseline our changes, we can run the ENS contracts JS/TS test suites via our end to end test scenario runner.

The `ensdomains/ens-contracts` test suite is setup in `end-to-end/ens-contracts/scenario.json`:

```shell
pnpm e2e exec --scenario end-to-end/ens-contracts --command "bun run test" --with-init --with-verdaccio

# Test Files  46 passed (46)
#      Tests  1524 passed | 6 skipped (1530)
#   Start at  12:36:34
#   Duration  23.36s (transform 3.54s, setup 33.34s, collect 123.68s, tests 54.50s, environment 26ms, prepare 10.96s)
```

To run with hyperfine for benchmarking:

```shell
pnpm e2e exec --scenario end-to-end/ens-contracts --command "hyperfine --warmup 1 --runs 5 --prepare 'bun run compile' 'bun run test'" # include for an isolated run --with-init --with-verdaccio

# [e2e] === Running: hyperfine --warmup 1 --runs 5 --prepare 'bun # run compile' 'bun run test' ===
# Benchmark 1: bun run test
#   Time (mean ± σ):     28.934 s ±  0.202 s    [User: 201.944 s, System: 41.047 s]
#   Range (min … max):   28.769 s … 29.246 s    5 runs
```

## Goal

Eliminate the unconditional `deepClone` on the RPC hot path while preserving correctness when third-party hook handlers are registered.

## Proposed Changes

### 1. Skip cloning when there are no external `onRequest` hook handlers

The built-in handler chain (`AutomaticGasPrice`, `AutomaticGas`, `AutomaticSender`) already receives its own `request` variable — it doesn't need protection from itself. Cloning is only necessary when _other_ plugins register `onRequest` hooks that could observe the same request object.

**Approach:** In the `onRequest` handler in [hook-handlers/network.ts](v-next/hardhat/src/internal/builtin-plugins/network-manager/hook-handlers/network.ts), check whether external hook handlers exist before cloning:

```ts
// Only clone if there are other onRequest hook handlers that might
// see the same request object.
let request = hasExternalOnRequestHandlers
  ? await deepClone(jsonRpcRequest)
  : jsonRpcRequest;
```

This requires a way to query the hook manager for the handler count. Options:

- **A)** Expose a method on `HookManager` (e.g. `getHandlerCount("network", "onRequest")`) and pass the result or a flag into the `onRequest` handler via closure or context.
- **B)** Have the `onRequest` handler check `next` — if calling `next` goes directly to the default behavior (i.e. this is the only handler), skip the clone.

### 2. Replace `deepClone` with a shallow clone for JSON-RPC requests

JSON-RPC request objects are small and flat (`{ jsonrpc, id, method, params }`). `params` is typically an array of primitives or simple objects. A structured shallow clone would be much cheaper than a full recursive `rfdc` clone:

```ts
function cloneJsonRpcRequest(req: JsonRpcRequest): JsonRpcRequest {
  return {
    jsonrpc: req.jsonrpc,
    id: req.id,
    method: req.method,
    params: req.params !== undefined ? [...req.params] : undefined,
  };
}
```

This could be used as a fallback when cloning _is_ needed, replacing the generic `deepClone` with something RPC-aware.

### 3. Make `deepClone` synchronous

The current `deepClone` in [hardhat-utils/src/lang.ts](v-next/hardhat-utils/src/lang.ts) is `async` because it lazy-loads `rfdc` via dynamic `import()`. After the first call the clone function is cached, but every subsequent call still pays the `await` cost (microtask scheduling). Either:

- Eagerly import `rfdc` so `deepClone` can be synchronous, or
- Cache the resolved function and expose a sync variant (`deepCloneSync`) for hot paths.

## Files to Modify

| File | Change |
| --- | --- |
| [`hook-handlers/network.ts`](v-next/hardhat/src/internal/builtin-plugins/network-manager/hook-handlers/network.ts) | Conditionally skip `deepClone`; optionally replace with shallow clone |
| [`core/hook-manager.ts`](v-next/hardhat/src/internal/core/hook-manager.ts) | Expose handler count or provide a mechanism to detect single-handler chains |
| [`hardhat-utils/src/lang.ts`](v-next/hardhat-utils/src/lang.ts) | Add sync variant or eagerly initialize `rfdc` |

## Open Questions

- Should the clone be skipped entirely or replaced with a cheaper shallow clone? Skipping is faster; shallow clone is safer if internal handlers ever mutate `params` in the future.
- Is option A (explicit handler count query) or option B (infer from `next`) cleaner architecturally?
