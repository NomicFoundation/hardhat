# Can solx output actually run the test suites? — evaluation results

solx is an LLVM-based Solidity compiler from a third party. This is a differential evaluation of
whether the bytecode it produces can run real test suites. It ran once, on 2026-08-20/21, over
nine open-source repositories.

Each cell below ran the repository's FULL suite twice. Once with a pinned solx build profile.
Once with the matching solc control profile. Verdicts come from the set-difference of
failing-test identifiers. A test failing under BOTH compilers is upstream or pin noise. It is
excluded from the solx verdict but recorded. Fuzz seeds are pinned in every wrapper config, so
both sides see identical fuzz inputs.

Every run that produced a build passed a provenance assert, which checks the compiler type and
version recorded in the build metadata against the pin. Two of the 36 runs produced no build to
check, both on aave-v4, because the compile itself failed.

## The headline number, and how it was counted

14,111 distinct tests executed under solx. 12,552 of those had a same-pipeline solc control.

Counting method: for each repository-and-runner combination, take the solx side's passing plus
failing count. Both compiler pairs run the same suite there, so the suite is counted once.
Skipped tests are excluded. The per-row figures:

| repository | runner | tests run under solx | same-pipeline control |
|---|---|--:|---|
| openzeppelin-contracts | mocha | 7,654 | yes |
| solady | solidity | 2,041 | yes |
| aave-v4 | solidity | 1,559 | **no** |
| lidofinance-core | mocha | 1,266 | yes |
| uniswap-v4-core | solidity | 598 | yes |
| graph-horizon | solidity | 574 | yes |
| openzeppelin-contracts | solidity | 347 | yes |
| 1inch-aqua | solidity | 49 | yes |
| ens-verifiable-factory | solidity | 23 | yes |
| 1inch-swap-vm | solidity | 0 | control ran 706 |
| **total** | | **14,111** | **12,552 controlled** |

aave-v4's 1,559 are excluded from the controlled total. Its same-pipeline control could not
compile the suite. 1inch-swap-vm contributes nothing: solx produced an empty build there, so its
706 tests ran only under the control. An earlier draft of this document said "~14,700", which
counted those 706 tests as executed under solx. They were not.

"Tests" is a weak denominator. A 5,000-run fuzz property counts as one. Thousands of unit tests
share libraries and fixtures. So these are not 14,111 independent trials.

## Summary matrix

P/F/S = passing/failing/skipped. Pairs: legacy = `solx-0.1.7` vs `default` (solc);
via-IR = `solx-0.1.7-via-ir` vs `solc-via-ir`.

| # | repository | runner | pair | verdict | solx | control |
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
| 13 | solady | solidity | legacy | **pass** ‡ | 2040P/1F | 2040P/1F |
| 14 | solady | solidity | via-IR | **pass** ‡ | 2040P/1F | 2040P/1F |
| 15 | 1inch-swap-vm | solidity | via-IR only | **harness-failures** | 0 tests ran | 706P/0F |
| 16 | aave-v4 | solidity | via-IR | **pass** § | 1559P/0F/1S | cannot compile (solc) |
| 17 | aave-v4 | solidity | legacy (1 attempt) | **cannot-compile** | solx OOM-killed | 1559P/0F/1S |
| 18 | lidofinance-core | mocha | via-IR | **pass** | 1266P/0F/1S | 1266P/0F/1S |
| — | lidofinance-vaults | — | — | **N/A** — see the core repository | — | — |

† Control-only failure under solc-via-ir; not a solx problem (see below).
‡ One test fails identically under BOTH compilers; upstream or pin noise, excluded from the
verdict. So "pass" here does not mean the suite was green.
§ Uncontrolled. The same-pipeline control produced nothing, so this row has no differential
comparison behind it.

## Bottom line

Across the 14,111 tests solx executed, no test failed under solx that passed under its control.
For 12,552 of them that statement rests on a same-pipeline control. For aave-v4's 1,559 it does
not, because no working control exists for that suite.

Two failures are real, and both sit at the compile stage rather than in executed code. solx
silently emitted an empty build for 1inch-swap-vm (row 15). solx was OOM-killed compiling
aave-v4's legacy pipeline on a 15.6 GiB host (row 17).

One finding is universal. solx output exceeds the 24,576 B EIP-170 deployed-code limit in every
one of the nine repositories. The largest contract reaches 162,624 B. No run in this evaluation
had that limit enforced, so nothing here says what happens on a chain that enforces it.

What this is not: a correctness result. A separate positive control (below) shows the setup can
report a solx-side-only failure. It does not show that these suites would notice a wrong-value
miscompilation. Read the Limitations section before quoting any number above.

## Finding 1 (headline): solx can emit a silently empty build

Repository: 1inch-swap-vm, via-IR. The repository is via-IR-only upstream, so legacy is
impossible for both compilers and only this pair exists.

solx 0.1.7 cannot compile SwapVM's recursive `runLoop`. It prints
`LLVM ERROR: Stackification failed for 'fun_runLoop_62748' function. It is recursive and has
stack too deep errors.` five times to stderr. Then it exits 0. The standard-JSON response
contains ZERO errors. Every one of the 242 contracts in it has EMPTY bytecode.

The defect is in the solx binary, not in the Hardhat plugin that drives it. Replaying the exact
standard-JSON input through the pinned binary reproduces it: exit 0, no JSON errors, no bytecode.
Whether other solx versions behave the same way was not tested.

Downstream, Hardhat trusts the no-error response. It reports "Compiled 149 Solidity files with
solx 0.1.7" and writes bytecode-less artifacts. `hardhat test solidity` then discovers zero
suites and exits 0 with "0 passing". The solc control runs 706 tests. Two implications:

- A timed compile benchmark for this configuration measures a build whose entire output is
  empty. Its "compiles green" status was hollow.
- A green exit can mean nothing ran. The harness now treats a solx test count far below the
  control's as harness-failures, never as pass.

The build logs did carry a signal. A compile-error pattern matched on exactly 3 of the 36 runs:
this scenario's solx side, aave-v4's legacy solx side, and aave-v4's via-IR control side. All
three genuinely failed to compile, and no green run matched. The harness previously read that
signal only when the run also exited non-zero, so it recorded it and never acted on it. It is now
kept on the pair record.

## Finding 2: aave-v4 splits at the compile stage, in opposite directions

Via-IR pair: solx compiles the full tree INCLUDING the 274-file test suite. It runs 1,559 tests,
all green. The solc-via-ir control cannot compile the test tree at all. It reports
`YulException: Variable var_user is 1 too deep in the stack`, then `Error HHE910`. That failure
is solc's, not solx's.

Legacy pair, a single structural attempt: the solc control compiles and runs the same 1,559 tests
green. Two per-file via-IR overrides in the wrapper rescue Hub and SpokeInstance. solx's legacy
pipeline dies instead. Hardhat reports "Subprocess exited with code null". Direct replay of the
dumped input exits 137, which is SIGKILL. The kernel OOM-kills solx on this 15.6 GiB machine
during its legacy stack-too-deep spill pass. The same compile is reported to complete on larger
hosts, so this is a resource requirement rather than a compiler defect.

Cross-check between the pairs: the same 1,559-test universe passes fully under solx-via-IR and
under solc-legacy. That establishes the test universe is real and fully passable. It is not a
like-for-like comparison. The two sides used different pipelines and produced different bytecode.

Row 16 is the most quotable and most misreadable row here. It shows solx succeeding where solc's
stack scheduler gives up. It says nothing about which compiler produces better code.

## Finding 3: the memory-unsafe-assembly probes produced no signal, and one never ran

Two repositories ran with `EVM_DISABLE_MEMORY_SAFE_ASM_CHECK=1`, which is where solx spilling
past unannotated assembly could in principle corrupt memory.

- graph-horizon: the flagged region is a `RecurringCollector` spill. It does appear in the solx
  build, 26 times in the warning set. 574 tests ran green under solx on both pipelines. So: no
  signal.
- aave-v4: the flagged region is a stack-too-deep spill in SpokeInstance, past unannotated
  assembly in a vendored OpenZeppelin `Arrays.sol`. That is a legacy-pipeline event. The legacy
  build was OOM-killed and never compiled. `Arrays.sol` appears zero times in the via-IR warning
  set. So: not tested.

No coverage was measured for either. "No signal" therefore cannot be distinguished from "the
flagged code was never reached".

## Finding 4: solx output routinely exceeds the EIP-170 deployed-code limit

The 24,576 B EIP-170 limit was NOT enforced in any run in this evaluation. That is worth stating
plainly, because it makes the size numbers below a compile-time observation rather than a runtime
one.

- The `solidity` test runner exposes no deployed-code-size setting at all. Oversized suite
  contracts deployed and ran in every case. Where in the stack the check is skipped was not
  established.
- On the Mocha path the limit is a network setting, and both Mocha repositories disable it.
  openzeppelin-contracts sets `allowUnlimitedContractSize: true`, and so does lidofinance-core,
  at two places in its base config. The wrapper spreads that config through untouched.

The lidofinance-core control run is the direct proof. It compiled one contract at 24,708 B, solc
warned about it, and that contract deployed fine.

The real finding is the size gap. Verified maxima from the compile warnings in each run's log:

| repository | pipeline | solx warnings | solx max | control warnings | control max |
|---|---|--:|--:|--:|--:|
| aave-v4 | via-IR | 160 | 162,624 B | 0 | — |
| solady | via-IR | 35 | 106,224 B | 0 | — |
| solady | legacy | 26 | 93,988 B | 0 | — |
| uniswap-v4-core | via-IR | 12 | 84,732 B | 0 | — |
| graph-horizon | via-IR | 61 | 84,056 B | 0 | — |
| uniswap-v4-core | legacy | 7 | 71,004 B | 0 | — |
| graph-horizon | legacy | 48 | 67,580 B | 0 | — |
| 1inch-swap-vm | via-IR | 77 | 55,032 B | 0 | — |
| lidofinance-core | via-IR | 10 | 44,828 B | 1 | 24,708 B |
| openzeppelin-contracts | legacy | 18 | 41,964 B | 0 | — |
| openzeppelin-contracts | via-IR | 20 | 40,328 B | 0 | — |
| 1inch-aqua | via-IR | 1 | 31,784 B | 0 | — |
| 1inch-aqua | legacy | 1 | 25,592 B | 0 | — |
| ens-verifiable-factory | via-IR | 1 | 25,456 B | 0 | — |
| ens-verifiable-factory | legacy | 0 | — | 0 | — |
| aave-v4 | legacy | — | — | 0 | — |

Every one of the nine repositories overshoots under solx on at least one pipeline. The controls
overshoot once, in lidofinance-core, at 24,708 B. aave-v4's legacy solx cell is blank because
that build never completed.

Two caveats on the table. The two compilers use different warning text, so raw warning counts are
not directly comparable. And most of the oversized contracts are test harnesses, which never
deploy to a chain. The gap in magnitude is the point: 162,624 B against a 24,576 B limit is not a
marginal overshoot.

## Finding 5: stack-trace quality under solx is degraded, and we do not know whose fault it is

Compared on solady's shared BlockHashLib failure. That test fails under both compilers, so the
traces are directly comparable and the only variable is the compiler.

- solc: `Error: EvmError: Revert`, then `at BlockHashLibTest.testBlockHash
  (test/BlockHashLib.t.sol:45)`. The frame resolves to file and line.
- solx: `Error: EvmError: Revert`, then `Stack Trace Warning: Instruction not found at PC 2`.
  No source frame at all.

So on identical reverts, solx runs lose the source location that solc runs keep. Tests still
pass and fail correctly. This is a debugging-experience gap, not a verdict change.

Attribution is undetermined. solx 0.1.4 and later leave the `sourceMap` output empty and ship
DWARF debug info instead. The observed warning text is Hardhat's own. So the defect may be
solx's debug output, or it may be our decoder failing to consume DWARF. We maintain the decoder.
Nobody established which.

Separately, the fuzz counterexample calldata for that failure is byte-identical under solx and
solc, and across both pipelines. The pinned seed does its job.

## Finding 6: gas-sensitive assertions never fired

uniswap-v4-core's gas checks are `vm.snapshotGasLastCall` cheatcodes. Eleven files use them and
nothing asserts on the result. They WRITE snapshots. So solx's different gas numbers cannot fail
these tests, and the expected-divergence category stayed empty. 598 of 598 green on both pairs is
not a gas-equivalence result.

A differential gas assertion was available and not used. Hardhat's gas-analytics plugin has
`--snapshot` and `--snapshot-check` flags, and a failed check fails the run. solady's gas-golf
tests also produced no solx-only failures, by the same mechanism.

## Positive control: the setup can report a solx-side-only failure

A zero-failure result is only worth reading if the setup can report a failure. This check was run
after the sweep, on ens-verifiable-factory with the solidity runner.

One assertion was added to a test file on purpose. It pins the deployed runtime code length of
`UUPSProxy` to 1,223 B, the value solc 0.8.34 emits. solx 0.1.7 emits 1,244 B for the same
source. So the assertion holds on the control side and fails on the solx side. Both figures were
read from the compiled artifacts beforehand.

The verdict flipped, and the transcript names the test:

    verdict test-failures — 1 test(s) fail under solx but pass under the solc control

    | scenario | runner | pair | verdict | solx | control | solx-only |
    | ens-verifiable-factory-solx | solidity | solx-0.1.7 vs default | test-failures | 23P/1F/0S | 24P/0F/0S | 1 |

    solx-only failures:
    - `UUPSProxyTest#test_PositiveControl_SolcRuntimeLength()` (reproduced)

Every stage behaved. The solx side went red with `assertion failed: 1244 != 1223` and the control
stayed green. The identifier was parsed and landed in the solx-only set. Provenance stayed green
on both sides, so the flip is not a provenance artifact. The determinism screen fired for the
first time in this evaluation, re-ran the named test, and recorded `reproduced`.

The perturbation was then removed and the pair re-run. The verdict returned to `pass`, 23P/0F on
both sides. So the red verdict tracks the perturbation.

What this establishes: a test failing only under solx is detected, attributed to solx, named, and
re-run. What it does not establish: that any suite here would notice a wrong-value
miscompilation. The perturbation asserts on a compiler difference, not on program behaviour.

Both positive-control runs used a stricter version of the verdict logic than the 18 rows above. A
solx test count below 90% of the control's is now a harness-failures verdict, and a compile-error
pattern in a green run's log is recorded on the pair record. The sweep's verdicts predate that
change.

## Control-only failures (solc problems)

Neither has an established mechanism. Both were attributed to solc because that is the side that
went red.

- openzeppelin-contracts, mocha, solc-via-ir: `MerkleTree > push > pushing to a full tree
  reverts` fails under the control only. solx passes it. This one is a gas-budget difference.
- openzeppelin-contracts, solidity, solc-via-ir:
  `BlockhashTest#testFuzzHistoryBlocks(uint16,uint256,bytes32)` fails under the control only.
  solx passes it. An unexplained blockhash divergence.

These are not a solx quality signal. They are two unexplained divergences that happen to sit on
the control side.

## Shared failures excluded from verdicts

- solady, both pairs: `BlockHashLibTest#testBlockHash(uint256,uint256,uint256,bytes32)` fails
  identically under solx and solc, with the same counterexample. It was not root-caused. It sits
  on vendored bytecode injected with `vm.etch`, which is consistent with reading it as
  environmental rather than compiler-related.

## lidofinance-core mocha (row 18)

An env-gated wrapper flag re-adds `test/` to the source roots. The run is scoped to the 45
unit-test files under `test/0.8.25/`. Result: 1,266 passing, 1 pending, identical on both sides.
Zero solx-only failures.

Provenance behaved as designed for this mixed-compiler repository. There are 7 build-infos per
run, and only the 2 entries at 0.8.34 must be solx on the solx side. They are. The legacy ballast
trees, at solc 0.4.24 through 0.8.9, stay on upstream's own solc in every profile.

That scoping matters for coverage. Some of the bytecode this run executed came from a compiler
other than the one under test, because the ballast trees keep their own. How much was not
measured.

lidofinance-vaults: N/A by structure. That configuration compiles a single 0.8.34 compiler, but
its Mocha fixtures span solc 0.4.24 to 0.8.9. See the core repository for coverage of this code.

## Limitations

Read these next to the numbers above.

1. We did not verify that these suites can detect a miscompilation. The positive control shows
   the harness reports a solx-side-only failure. It does not show that any suite's assertions
   would catch wrong-but-plausible output. So "no solx-only failures" means the suites saw no
   divergence where they happen to look.
2. Fuzz seeds were pinned to one value, so both compilers saw identical inputs. That makes the
   comparison exact. It also means the fuzzers explored one deterministic corpus, not a broad
   search.
3. Each configuration ran once, on one machine, against one pre-1.0 solx release. Every number
   here is a single observation. Nothing screens for an intermittent miscompilation that happened
   to pass.
4. 706 tests never executed under solx. They are the suite solx silently failed to compile. And
   aave-v4's 1,559 solx passes have no same-pipeline control.
5. These suites were written to find bugs in the contracts they ship with, not to stress a
   compiler. Their assertions cluster where the authors expected their own mistakes.
6. aave-v4's via-IR result is solx succeeding where solc's stack scheduler gives up. It shows
   solx handles a case solc cannot. It says nothing about which compiler produces better code.
7. The aave-v4 legacy failure is a 15.6 GiB host running out of memory during solx's spill pass.
   The same compile is reported to complete on larger machines. Treat it as a resource
   requirement, not a compiler defect.
8. We have not determined whether the missing stack frames come from solx's debug output or from
   our own decoder failing to consume it. We maintain the decoder.
9. We build Hardhat and EDR. The harness, runner, EVM and trace decoder used throughout are our
   own software, and solx is a third party's. Three of the anomalies reported here run through
   our components.
10. We found these defects in solx 0.1.7. As of 2026-08-21 neither has been filed upstream, and
    we have not checked whether a newer solx release fixes them. Check the current release before
    drawing conclusions.

Method notes.

11. Running full suites removes any choice about which tests to run. We did not measure line,
    branch or path coverage. So we cannot say what fraction of each contract these suites
    execute.
12. The nine repositories came from an existing solx compile-benchmark suite. They were selected
    for being hard to compile, not for being representative or for having strong tests. That bias
    runs toward difficulty, which is arguably favourable to a compiler evaluation.
13. One failure fails under both compilers and is excluded from the solx verdict as upstream or
    environmental noise. We did not root-cause it.
14. Two failures occur only under the solc control. We attributed them to solc without
    establishing a mechanism.
15. The harness flags a solx test count far below the control's. It does not assert that both
    sides discovered the same tests by name. In this data the totals matched exactly on every
    passing row, verified from the per-pair records.
16. We verified for every run which compiler produced the artifacts. We also confirmed the check
    fails when deliberately pointed at the wrong compiler. That check answers who compiled, not
    what was produced. Some executed bytecode reaches the EVM by other routes, including
    typechain factories with embedded bytecode and `vm.etch` with vendored hex.
17. Reproducing this needs two manual setup steps not shown in the commands below, plus the
    archived evidence and a pinned commit.
18. "pass" in the matrix means no test failed under solx that passed under its control. Two pass
    rows contain a test failing identically under both compilers. One pass row has no control at
    all.

## Environment and versions

- solx: v0.1.7. Front end solc `0.8.34+commit.ebeac7c2`, LLVM build
  `7d0702e169889fe4f1a2241c57bef7d2c1c68737`. Pinned binary per repository, provenance asserted
  per run.
- Control compiler: solc 0.8.34, through the same Hardhat build system. EVM target `osaka` on
  both sides.
- Hardhat: 3.14.0, with EDR 0.17.0 as its EVM. Both came from the public registry through a local
  Verdaccio proxy, so the runner and VM under test are released versions rather than
  branch builds. Two packages were built locally instead:
  `@nomicfoundation/hardhat-solx` 2.0.0 and `@nomicfoundation/hardhat-vendored` 3.0.5.
- Harness and wrapper configs: the `solx-test-execution-evaluation` branch of the Hardhat
  monorepo. Harness commit `cc37ccc8b`, wrapper and seed-pinning commit `0ed1fed45`, base commit
  `395d4e2ef`. The branch is unmerged.
- Runner host: 24-thread i9-12900HX, 15.6 GiB RAM, WSL2, Node v22.23.2. The RAM figure is
  load-bearing for row 17.
- Repository pins. Checkout HEAD was verified equal to the pinned commit for every run.
  - openzeppelin-contracts-0.34 `f72b6b461680`
  - ens-verifiable-factory-solx `cd6622442c29`
  - 1inch-aqua-solx `19277969b5e6`
  - 1inch-swap-vm-solx `7102f412db16`
  - graph-horizon-solx `68661591b7e2`
  - uniswap-v4-core-solx `ab2b22eef19e`
  - solady-solx `13d87ff27de0`
  - aave-v4-solx `f729aeff7cc6`
  - lidofinance-core-solx `28bc9f7ff2c4`
- Determinism screen: no solx-only failure existed in the sweep, so it never fired there. The
  positive control fired it once, and the injected failure reproduced.
- Negative provenance control: running ens with both sides on solc correctly fails the provenance
  assert and marks the run INVALID. That covers one branch of the check. The other branches are
  untested.

## How this was produced

`scripts/benchmark/test-under-solx.ts` on the evaluation branch. Per pair: clean, then build and
test with the solx profile, then the provenance assert, then clean again, then build and test with
the control profile, then its provenance assert, then the set-difference verdicts, then a per-pair
JSON and a regenerated report. Two setup steps were done by hand and are not in that script: a
monorepo sub-build for graph-horizon, and a pragma-relaxation step for 1inch-swap-vm.

Evidence archive. `solx-test-evaluation-evidence.tar.gz`, committed next to this file, is the
evaluation's raw evidence. It contains the 18 per-pair JSON records with full failure text and
provenance results, the regenerated matrix and summary, the per-run environment captures with the
solx `--version` output, the two triage bundles for the compile-stage failures, the
negative-provenance-control record, the complete positive-control run pair with its perturbation
patch, and a sweep state log. All 72 per-run suite logs are included in full and untruncated, so
the compile-warning lines behind the Finding 4 table can be recounted from source.
`solx-test-execution-summary.json` next to this file is the same machine-readable summary,
uncompressed.
