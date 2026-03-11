# `connectToSingleton` — Suite-Level Network Connection Helper

## Context

`connectOnBefore()` creates a per-describe-block network connection by calling `before()`/`after()` directly. Users who want shared EDR instances across the entire Mocha suite previously needed boilerplate relying on ESM module caching. `connectToSingleton()` follows the same `before()`-based pattern but memoizes so only the first call creates the connection.

## API

```ts
connectToSingleton<ChainTypeT extends ChainType | string = DefaultChainType>(
  networkName?: string,
  chainType?: ChainTypeT,
): NetworkConnection<ChainTypeT>;
```

- Accepts optional network name and chain type. No `override` parameter.
- Multiple network/chainType combinations allowed — each gets its own memoized instance via a `Map<string, SingletonEntry>`.
- Returns the same lazy proxy as `connectOnBefore` — supports destructuring at module/describe scope.

## Architecture

### Lifecycle

1. **First call** for a key: registers a `before()` hook that connects, creates a lazy proxy, stores entry in closure-scoped Map.
2. **Subsequent calls** for same key: registers a `before()` that awaits the same connect promise, returns the same proxy.
3. **Tests run**: proxy forwards property access to the real connection.
4. **No teardown** — no `after()` hook. GC handles cleanup when the process exits.

### Pattern

Follows the same factory pattern as `createConnectOnBefore`: a factory function that captures the network manager and returns the user-facing `connectToSingleton` function. The Map of singletons lives in the factory closure.

## Files

| File | Action |
|------|--------|
| `src/connect-on-before/create-connect-to-singleton.ts` | **Create** — factory with closure-based Map |
| `src/hookHandlers/hre.ts` | **Modify** — wire up new factory |
| `src/type-extensions.ts` | **Modify** — add `chainType` param |
| `src/connect-on-before/singleton-state.ts` | **Delete** — state now in closure |
| `src/singleton-root-hooks.ts` | **Delete** — no more root hooks |
| `src/task-action.ts` | **Modify** — remove singleton hook injection |

(All paths relative to `v-next/hardhat-mocha/`)

## Key Design Decisions

1. **`before()` directly, not root hooks** — same pattern as `connectOnBefore`. No global hook injection. Works for users running mocha directly.
2. **No teardown** — GC cleans up. Simplifies lifecycle.
3. **Map-based multi-singleton** — keyed by `networkName:chainType`. Different test files can request different networks.
4. **Network name + chain type, no overrides** — mirrors `network.connect()` shape but bans config overrides.
5. **Reuses proxy infrastructure** — `createNetworkConnectionProxy` shared with `connectOnBefore`.
