# Repro: EDR ~9× slower than Foundry on aave-v4 `test solidity`

Self-contained setup for an x86_64 Linux machine to reproduce and decompose the
performance gap between Hardhat/EDR and Foundry on the aave-v4 migration repo's
Solidity tests. Requires x86_64 because solc ships no native linux-arm64
binaries (Hardhat fails with `HHE907` on arm64 without emulation).

## Reference numbers (self-hosted benchmark runner, aave-v4 @ `27c95ea`, fuzz runs = 100)

| Runner | wall | CPU (user) | effective parallelism |
| --- | --- | --- | --- |
| Hardhat/EDR 0.19.0 ([run 33072166598](https://github.com/NomicFoundation/hardhat/actions/runs/33072166598)) | 136.0 s | 460.8 s | ~3.4× |
| Foundry v1.7.1 ([run 33193818834](https://github.com/NomicFoundation/hardhat/actions/runs/33193818834)) | 15.25 s | 609.3 s | ~40× |

Key observations from the CI logs:

- EDR burns **less** total CPU than forge, so cores sit idle: the wall time is
  dominated by a serial critical path, not uniform slowness.
- Under EDR, the run shows a repeating ~85 s output gap ending in
  `tests/deployments/` test names — one deployment-heavy suite's serial
  portion is the critical path.
- Under forge, the same suites are unremarkable: `PostDeploymentVerificationTest`
  15.9 s wall ≈ 17.1 s CPU (16 tests), `AaveV4BatchDeploymentTest` 14.7 s wall /
  28 s CPU (36 tests). Forge also executes them near-serially internally — it is
  just ~5× faster on the same serial work, and 16 s hides among 165 concurrent
  suites instead of dominating.

## Already ruled out (EDR 0.19.0 source, `/workspaces/edr`)

- Missing parallelism: suites run via `contracts.into_par_iter()`
  (`crates/edr_solidity_tests/src/multi_runner.rs:615`), tests within a suite
  via `functions.par_iter()` (`crates/edr_solidity_tests/src/runner.rs:727`,
  present in the `edr-0.19.0` tag).
- Thread-pool caps: no `ThreadPoolBuilder` / `num_threads` / `RAYON_NUM_THREADS`
  anywhere in the workspace — rayon's default global pool (all logical cores).
- Lock contention: no `Mutex`/`RwLock` in the backend hot path; per-executor
  in-memory DB; `Cow<Executor>` per test.
- Tracing overhead: at default verbosity Hardhat passes `IncludeTraces.None` +
  `CollectStackTraces.OnFailure`, which resolves to `TracingMode::None`
  (`multi_runner.rs:394-398`) — no tracer on passing tests. Stack traces are
  produced by re-running failures only; all tests pass in this repro.
- Gas report: only enabled with `--gas-stats`; the benchmark doesn't pass it.

Remaining suspects (serial units in the runner): per-suite `setUp()` — runs
once *before* the per-test `par_iter` (`runner.rs:640`) and performs a full
create2 batch deployment of the protocol; the slowest single test; the
run-level preamble in `MultiContractRunner::test` (artifact/decoder setup).
The deployment logger/metadata tests also lean on fs/JSON cheatcodes
(`vm.readFile` / `vm.parseJson*` / `vm.writeJson` / `vm.createDir` over `out/`).

## Setup

```bash
# Prerequisites: git, Node.js >= 22, curl. Then:

# 1. Foundry, pinned to the version the baseline used
curl -L https://foundry.paradigm.xyz | bash
~/.foundry/bin/foundryup --install v1.7.1
export PATH="$HOME/.foundry/bin:$PATH"

# 2. Clone aave-v4 at the benchmarked pin (submodules needed for forge-std)
git clone https://github.com/anaPerezGhiglia/aave-v4.git
cd aave-v4
git checkout 27c95eae18c60547933b6486774f816175e124f0
git submodule update --init

# 3. Reduce the fuzz workload exactly like the benchmark preinstall does
#    (hardhat.config.ts fuzz.runs and foundry.toml [profile.default.fuzz] runs: 1000 -> 100)
node -e "
const fs = require('fs');
let hh = fs.readFileSync('hardhat.config.ts', 'utf8');
hh = hh.replace(/(\bfuzz:\s*\{[^}]*?\bruns:\s*)1000\b/, '\$1100');
fs.writeFileSync('hardhat.config.ts', hh);
let fd = fs.readFileSync('foundry.toml', 'utf8');
fd = fd.replace(/\bruns = 1000\b/, 'runs = 100');
fs.writeFileSync('foundry.toml', fd);
console.log('fuzz runs reduced to 100');
"

# 4. Install JS deps and upgrade hardhat to the version under test
corepack enable yarn
yarn install
yarn add hardhat@latest @nomicfoundation/hardhat-verify@latest
```

**HHE818 caveat:** `npx hardhat test solidity` aborts with `HHE818` (duplicate
EIP-712 struct `PositionManagerUpdate`) on hardhat releases that don't yet
include the "selected EIP-712 definition wins" fix
(`packages/hardhat/.../solidity-test/eip712/canonicalize.ts`). If the installed
release still throws, graft the fixed build over the installed package:

```bash
# in a hardhat monorepo checkout containing the fix:
pnpm install && (cd packages/hardhat && pnpm build)
# then, back in the aave-v4 clone:
cp <hardhat-repo>/packages/hardhat/dist/src/internal/builtin-plugins/solidity-test/eip712/canonicalize.js \
   node_modules/hardhat/dist/src/internal/builtin-plugins/solidity-test/eip712/canonicalize.js
```

```bash
# 5. Compile both toolchains (cold; each takes minutes)
npx hardhat compile
forge build
```

## Measurements

### A. Headline comparison (should reproduce the ~9× gap)

```bash
time npx hardhat test solidity --no-compile
time forge test
```

Record wall and user CPU for both (`/usr/bin/time -v` gives max RSS too).

### B. Decompose EDR's time: setUp vs tests, per suite

EDR logs per-suite setup duration at debug level (`RUST_LOG`, standard
tracing env-filter syntax):

```bash
RUST_LOG=edr_solidity_tests=debug npx hardhat test solidity --no-compile 2> edr-debug.log
grep "finished setting up" edr-debug.log
```

Interpretation:

- `finished setting up in ~70s+` for `AaveV4BatchDeploymentTest` /
  `PostDeploymentVerificationTest` → the create2 batch-deployment path in
  `setUp()` is the hot spot.
- Fast setup, time in the tests → suspect the fs/JSON cheatcode path
  (deployment loggers) or per-test execution.

### C. Isolate the suspect suites on both runners

```bash
# forge: by path
forge test --match-path 'tests/deployments/**' -vv

# hardhat: --grep matches test names, not paths; these prefixes cover the
# deployment suites
npx hardhat test solidity --no-compile \
  --grep "^(test_deploy|test_setup|test_fullDeploy|test_minimalDeploy|testFuzz_postDeploymentCheck|testAaveV4BatchDeployment)"
```

### D. Optional: profile the EDR run

```bash
# flamegraph of the whole node process (needs perf + debug symbols in the
# napi binary; a local EDR build with `profiling = true` works best)
perf record -g -F 99 -- npx hardhat test solidity --no-compile \
  --grep "testAaveV4BatchDeployment"
perf report
```

## Outcome to capture for the EDR issue

- Wall + CPU for A on both runners, machine core count.
- The `finished setting up` table from B for the slowest 5 suites.
- Per-suite forge timings from C (`Suite result: ok. … finished in Xs (Ys CPU time)`).
- Whether B pins the gap on `setUp()` (create2 deployment execution) or on
  test bodies (fs/JSON cheatcodes) — that decides where in
  `crates/edr_solidity_tests` / `crates/foundry/{cheatcodes,evm}` to profile.
