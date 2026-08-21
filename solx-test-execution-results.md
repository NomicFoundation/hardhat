# Can solx output actually run the test suites? — evaluation results

One-shot evaluation, 2026-08-20/21. Branch `solx-test-execution-evaluation`, never intended to
merge. Data feeds a blogpost.

Each cell below ran the scenario's FULL suite twice. Once with a pinned solx build profile.
Once with the matching solc control profile. Verdicts come from the set-difference of
failing-test identifiers. A test failing under BOTH compilers is upstream/pin noise. It is
excluded from the solx verdict but recorded. Every run passed a build-info provenance assert
(compilerType/solcLongVersion, pin read from `scripts/benchmark/pinned-tool-versions.sh`).
Fuzz seeds are pinned in every wrapper config, so both sides see identical fuzz inputs.

## Summary matrix

P/F/S = passing/failing/skipped. Pairs: legacy = `solx-0.1.7` vs `default` (solc);
via-IR = `solx-0.1.7-via-ir` vs `solc-via-ir`.

| # | scenario | runner | pair | verdict | solx | control |
|---|---|---|---|---|---|---|
| 1 | openzeppelin-contracts-0.34 | mocha | legacy | **pass** | 7654P/0F/1S | 7654P/0F/1S |
| 2 | openzeppelin-contracts-0.34 | mocha | via-IR | **pass** | 7654P/0F/1S | 7653P/1F/1S † |
| 3 | openzeppelin-contracts-0.34 | solidity | legacy | **pass** | 347P/0F | 347P/0F |
| 4 | openzeppelin-contracts-0.34 | solidity | via-IR | **pass** | 347P/0F | 346P/1F † |
| 5 | ens-verifiable-factory | solidity | legacy | **pass** | 23P/0F | 23P/0F |
| 6 | ens-verifiable-factory | solidity | via-IR | **pass** | 23P/0F | 23P/0F |
| 7 | 1inch-aqua | solidity | legacy | **pass** | 49P/0F | 49P/0F |
| 8 | 1inch-aqua | solidity | via-IR | **pass** | 49P/0F | 49P/0F |
| 9 | graph-horizon | solidity | legacy | **pass** | 574P/0F/2S | 574P/0F/2S |
| 10 | graph-horizon | solidity | via-IR | **pass** | 574P/0F/2S | 574P/0F/2S |
| 11 | uniswap-v4-core | solidity | legacy | **pass** | 598P/0F | 598P/0F |
| 12 | uniswap-v4-core | solidity | via-IR | **pass** | 598P/0F | 598P/0F |
| 13 | solady | solidity | legacy | **pass** | 2040P/1F ‡ | 2040P/1F ‡ |
| 14 | solady | solidity | via-IR | **pass** | 2040P/1F ‡ | 2040P/1F ‡ |
| 15 | 1inch-swap-vm | solidity | via-IR only | **harness-failures** | 0 tests ran | 706P/0F |
| 16 | aave-v4 | solidity | via-IR | **pass** | 1559P/0F/1S | cannot compile (solc) |
| 17 | aave-v4 | solidity | legacy (1 attempt) | **cannot-compile** | solx OOM-killed | 1559P/0F/1S |
| 18 | lidofinance-core | mocha | via-IR | **pass** | 1266P/0F/1S | 1266P/0F/1S |
| — | lidofinance-vaults | — | — | **N/A** — see core scenario | — | — |

† Control-only failure under solc-via-ir; not a solx problem (see below).
‡ The same test fails under BOTH compilers; upstream/pin noise, excluded from the verdict.

Bottom line: 9 scenarios, 10 suite evaluations, ~14,700 distinct tests, each executed under
solx and under a solc control. There are ZERO solx-only test failures. Where solx compiles,
its output runs the suites green. Both real failures happen at the compile stage, not at
execution (rows 15 and 17).

## Finding 1 (headline): solx can emit a silently empty build

Scenario: 1inch-swap-vm, via-IR (the repo is via-IR-only upstream; legacy is impossible for
both compilers, so only this pair exists).

solx 0.1.7 cannot compile SwapVM's recursive `runLoop`. It prints
`LLVM ERROR: Stackification failed for 'fun_runLoop_62748' function. It is recursive and has
stack too deep errors.` five times to stderr. Then it exits 0. The standard-JSON response
contains ZERO errors. Every one of the 242 contracts in it has EMPTY bytecode.

Attribution is definitive. Replaying the exact build-info input through the pinned binary
(`.solx/solx-v0.1.7 --standard-json < input`) reproduces it: exit 0, no JSON errors, no
bytecode (evidence: `solx-test-evaluation-evidence/triage/1inch-swap-vm/`).

Downstream, Hardhat trusts the no-error response. It reports "Compiled 149 Solidity files
with solx 0.1.7" and writes bytecode-less artifacts. `hardhat test solidity` then discovers
zero suites and exits 0 with "0 passing". The solc control runs 706 tests. Two implications:

- The benchmark's timed "cold compile solx-0.1.7 via-ir" cell for this scenario measures a
  build whose entire output is empty. The prior "compiles green" status was hollow.
- A green exit can mean nothing ran. The evaluation harness now treats "solx executed no
  tests while the control executed N" as harness-failures, never as pass.

## Finding 2: aave-v4 splits at the compile stage, in opposite directions

Via-IR pair: solx compiles the full tree INCLUDING the 274-file test suite (the benchmark
cells pass `--no-tests`; this evaluation deliberately omits it). It runs 1559 tests, all
green, in 211s. The solc-via-ir control cannot compile the test tree at all:
`YulException: Variable var_user is 1 too deep in the stack`, then `Error HHE910`. The
failure is solc's, not solx's. solx is the only via-IR compiler that can run this suite.

Legacy pair (single structural attempt): the solc control compiles (the
wrapper's two per-file via-IR overrides rescue Hub/SpokeInstance) and runs the same 1559
tests green. solx's legacy pipeline dies: Hardhat reports "Subprocess exited with code
null". Direct replay of the dumped input exits 137 = SIGKILL. The kernel OOM-kills solx on
this 15.6 GiB machine during its legacy stack-too-deep spill (the scenario notes measured
30+ min wall for that spill on larger hosts). Verdict: cannot-compile, resource-structural.

Cross-check between the pairs: the same 1559-test universe passes fully under solx-via-IR
and under solc-legacy. That is a like-for-like green/green comparison, just split across
pipelines.

## Finding 3: memory-unsafe-assembly probes came back clean

The two scenarios running with `EVM_DISABLE_MEMORY_SAFE_ASM_CHECK=1` in this sweep were
graph-horizon and aave-v4. The docs warn this can produce memory corruption when solx
spills past unannotated assembly.

- graph-horizon (RecurringCollector spill, probe #1): 574 tests green under solx, legacy
  and via-IR, identical to control. No corruption signal.
- aave-v4 (vendored OZ `Arrays.sol`, probe #2): 1559 tests green under solx via-IR. No
  corruption signal.

## Finding 4: EIP-170 behaves differently per runner

The solidity test runner does NOT enforce the deploy-size limit. solady's test harnesses
exceed it hugely under solx (compile warnings up to 52,128 B vs the 24,576 B limit) and
under solc, and every deploy succeeds. This was previously unverified.

The Mocha/EDR path enforces the limit unless `allowUnlimitedContractSize` is set. OZ sets
it. Lido does not, so its Mocha run was the live EIP-170 probe (row 18). The predicted
VaultHub deploy-revert did not happen: all 1266 tests pass with the limit enforced. The
EIP-170 sub-category (deploy reverts standing as the verdict) therefore ends the
evaluation EMPTY — no scenario produced one.

## Finding 5: stack-trace quality under solx is degraded

Spot-check per §4.5, on solady's shared BlockHashLib failure (fails under both compilers,
so the traces are directly comparable):

- solc: `Error: EvmError: Revert` + `at BlockHashLibTest.testBlockHash
  (test/BlockHashLib.t.sol:45)`. The frame resolves to file and line.
- solx: `Error: EvmError: Revert` + `Stack Trace Warning: Instruction not found at PC 2`.
  No source frame at all.

So on identical reverts, solx runs lose the source location that solc runs keep. Tests
still pass/fail correctly; this is a debugging-experience gap, recorded as harness-quality
evidence, not a verdict change.

Bonus determinism proof from the same failure: the fuzz counterexample calldata is
byte-identical under solx and solc, and across legacy and via-IR. The pinned fuzz seed
does exactly its job.

## Finding 6: gas-sensitive assertions never fired

uniswap-v4-core's gas checks are `vm.snapshotGasLastCall` cheatcodes. They WRITE snapshots;
they do not assert. So solx's different gas numbers cannot fail these tests, and the
expected-divergence category stayed empty (598/598 green both pairs). Gas differences are
gas-compare's job, not this evaluation's. solady's gas-golf tests also produced no
solx-only failures.

## Control-only failures (solc problems, recorded per §3)

- OZ mocha, solc-via-ir: `MerkleTree > push > pushing to a full tree reverts` fails under
  the solc control only. solx passes it.
- OZ solidity, solc-via-ir: `BlockhashTest#testFuzzHistoryBlocks(uint16,uint256,bytes32)`
  fails under the solc control only. solx passes it.

## Shared failures excluded from verdicts (upstream/pin noise)

- solady, both pairs: `BlockHashLibTest#testBlockHash(uint256,uint256,uint256,bytes32)`
  fails identically under solx and solc, with the same counterexample. Not
  compiler-related; likely an EDR/upstream blockhash-history semantics issue at this pin.

## lidofinance-core mocha (row 18)

`LIDO_BENCH_INCLUDE_TESTS=1` re-adds `test/` to the source roots (the committed, env-gated
wrapper change). The run is scoped to the 45 unit-test files under `test/0.8.25/`.
Result: 1266 passing, 1 pending, identical on both sides. Zero solx-only failures.
Provenance behaved exactly as designed for this mixed-compiler repo: 7 build-infos per run,
and only the 2 entries at 0.8.34 must be (and are) solx on the solx side. The legacy
ballast trees (0.4.24-0.8.9) stay on upstream's own solc in every profile.

lidofinance-vaults: N/A by structure. The scenario compiles a single 0.8.34 compiler, but
the Mocha fixtures span solc 0.4.24-0.8.9. See the core scenario for the repo's coverage.

## Environment and versions

- solx: v0.1.7, front end solc `0.8.34+commit.ebeac7c2`, LLVM build `7d0702e169889fe4f1a2`.
  Pinned binary per scenario at `.solx/solx-v0.1.7`; provenance asserted per run.
- Control: solc 0.8.34 through the same Hardhat build system.
- Hardhat: this branch (`solx-test-execution-evaluation`, base `fix/solx-version-pin-coherence`
  @ 395d4e2ef), packages served from a local Verdaccio via `pnpm e2e init --use-local`.
- Runner host: 24-thread i9-12900HX, 15.6 GiB RAM, WSL2, Node v22.23.2. The RAM figure
  matters for row 17 (OOM).
- Scenario pins (checkout HEAD verified == scenario.json commit for every run):
  - openzeppelin-contracts-0.34 `f72b6b461680`
  - ens-verifiable-factory-solx `cd6622442c29`
  - 1inch-aqua-solx `19277969b5e6`
  - 1inch-swap-vm-solx `7102f412db16`
  - graph-horizon-solx `68661591b7e2`
  - uniswap-v4-core-solx `ab2b22eef19e`
  - solady-solx `13d87ff27de0`
  - aave-v4-solx `f729aeff7cc6`
  - lidofinance-core-solx `28bc9f7ff2c4`
- Determinism screen: no solx-only failure existed anywhere, so no re-runs were needed.
  The screen itself was exercised in testing (--grep re-run per solx-only failure).
- Negative provenance control (§7): running ens with `--pair default:default` correctly
  fails the provenance assert and marks the run INVALID (exit 2).

## How this was produced

`scripts/benchmark/test-under-solx.ts` on this branch. Per pair: clean → build+test with
the solx profile → provenance assert → clean → build+test with the control profile →
provenance assert → set-difference verdicts → per-pair JSON + regenerated report. Full
logs and per-pair records live in the untracked `solx-test-evaluation-evidence/` directory
on the evaluation machine; `solx-test-execution-summary.json` next to this file is the committed
machine-readable summary.
