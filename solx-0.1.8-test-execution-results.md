# Can solx 0.1.8 output actually run the test suites? — evaluation results

solx is an LLVM-based Solidity compiler from a third party. This is a differential evaluation of
whether the bytecode it produces can run real test suites. It ran once, on 2026-08-21, over nine
open-source repositories. It is a retest of the same nine repositories at the same pinned commits
that were evaluated against solx 0.1.7 the day before, so it doubles as a 0.1.7 → 0.1.8 delta.

Each cell below ran the repository's full suite twice. Once with a pinned solx build profile. Once
with the matching solc control profile. Verdicts come from the set-difference of failing-test
identifiers. A test failing under BOTH compilers is upstream or pin noise. It is excluded from the
solx verdict but recorded. Fuzz seeds are pinned in every wrapper config, so both sides see
identical fuzz inputs.

Every run that produced a build passed a provenance assert, which checks the compiler type and
version recorded in the build metadata against the pin. Two of the 36 runs produced no build to
check: solx on 1inch-swap-vm and the solc control on aave-v4 via-IR.

Read the Limitations section before quoting any number here. Two limitations are load-bearing for
almost every figure: the harness changed between the two evaluations, and solx's embedded solc
front end changed within version 0.8.34.

## Method, in brief

Both compilers get the same inputs: the same source files at the same pinned commits, with the
same pragma relaxation applied once to the checkout both sides compile. The subject version is
Solidity 0.8.34 on both sides, targeting EVM `osaka`; where a repository pins older compilers,
those trees stay on upstream's own solc on both sides. Fuzz seeds are pinned, so both sides see
identical fuzz inputs. Every comparison ran on one machine, specified under Environment.
Optimizer settings differ by design: solx always optimizes (its default is -O1, and it has no
optimizer-off mode), while the solc control runs each repository's own optimizer settings. What
happens with solc's optimizer disabled is measured separately — see the optimizer-off baseline
section.

## The headline number, and how it was counted

14,111 distinct tests executed under solx. All 14,111 had a same-pipeline solc control.

Counting method: for each repository-and-runner combination, take the solx side's passing plus
failing count. Both compiler pairs run the same suite there, so the suite is counted once. Skipped
tests are excluded. A combination counts as controlled when at least one of its pairs had a control
that actually ran the suite.

| repository | runner | tests under solx | same-pipeline control |
|---|---|--:|---|
| openzeppelin-contracts | mocha | 7,654 | yes |
| solady | solidity | 2,041 | yes |
| aave-v4 | solidity | 1,559 | yes, on the legacy pair |
| lidofinance-core | mocha | 1,266 | yes |
| uniswap-v4-core | solidity | 598 | yes |
| graph-horizon | solidity | 574 | yes |
| openzeppelin-contracts | solidity | 347 | yes |
| 1inch-aqua | solidity | 49 | yes |
| ens-verifiable-factory | solidity | 23 | yes |
| 1inch-swap-vm | solidity | 0 | n/a — solx ran nothing; the control ran 706 |
| **total** | | **14,111** | **14,111 controlled** |

The 0.1.7 evaluation reported the same 14,111 executed but only 12,552 controlled. The difference is
aave-v4's 1,559 tests, which now have a working same-pipeline control because solx 0.1.8 compiles
aave's legacy tree where 0.1.7 could not. 1inch-swap-vm still contributes nothing: solx cannot
compile it, so its 706 tests ran only under the control.

"Tests" is a weak denominator. A 5,000-run fuzz property counts as one. Thousands of unit tests
share libraries and fixtures. So these are not 14,111 independent trials.

## Summary matrix

P/F/S = passing/failing/skipped. Pairs: legacy = `solx-0.1.8` vs `default` (solc);
via-IR = `solx-0.1.8-via-ir` vs `solc-via-ir`.

| # | repository | runner | pair | verdict | solx | control |
|---|---|---|---|---|---|---|
| 1 | openzeppelin-contracts-0.34 | mocha | legacy | **pass** | 7654P/0F/1S | 7654P/0F/1S |
| 2 | openzeppelin-contracts-0.34 | mocha | via-IR | **pass** | 7654P/0F/1S | 7654P/0F/1S |
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
| 15 | 1inch-swap-vm | solidity | via-IR only | **cannot-compile** | build fails, 0 tests | 706P/0F |
| 16 | aave-v4 | solidity | via-IR | **pass-uncontrolled** § | 1559P/0F/1S | cannot compile (solc) |
| 17 | aave-v4 | solidity | legacy | **pass** | 1559P/0F/1S | 1559P/0F/1S |
| 18 | lidofinance-core | mocha | via-IR | **pass** | 1266P/0F/1S | 1266P/0F/1S |
| — | lidofinance-vaults | — | — | **N/A** — see the core repository | — | — |

† Control-only failure under solc-via-ir; not a solx problem (see below).
‡ One test fails under BOTH compilers. Excluded from the verdict, so "pass" here does not mean the
suite was green. The two sides' failure text differs, and that difference is Finding 2 — not
evidence of divergent behaviour.
§ Uncontrolled. The same-pipeline control produced nothing, so this row has no differential
comparison behind it. The 0.1.7 evaluation reported this same shape as "pass" with a footnote; the
verdict name changed because the harness changed, not because solx did.

## Bottom line

Across the 14,111 tests solx executed, no test failed under solx that passed under its control. For
the first time that statement rests on a same-pipeline control for every one of them.

One compile-stage failure remains, and it is the same repository as last time: solx cannot compile
1inch-swap-vm. What changed is that it now says so. The 0.1.7 defect — a green exit over an empty
build — is fixed.

The other 0.1.7 compile failure is gone. solx 0.1.8 compiles aave-v4's legacy tree on the same
15.6 GiB host that OOM-killed 0.1.7, and a controlled replay attributes that to the compiler.

The EIP-170 finding from the 0.1.7 evaluation does not survive being measured properly. It is real
on four repositories, not nine — graph-horizon, aave-v4, openzeppelin and lidofinance-core — and
on uniswap the solc control overshoots where solx does not. On 1inch-swap-vm only the control
built, with five contracts over.

What this is not: a correctness result. The 0.1.7 evaluation's positive control showed the setup can
report a solx-side-only failure; that control was not repeated here. Nothing here shows these suites
would notice a wrong-value miscompilation.

## What changed from 0.1.7

Read this section before comparing any figure with the 0.1.7 document.

### Two confounds that are not solx

**The harness changed.** The 0.1.7 sweep's 18 rows predate the zero-bytecode cannot-compile guard,
the sub-90% test-universe shortfall guard, the per-contract bytecode-presence guards, the
unparseable-artifact guard, the artifact-attribution guard, and `pass-uncontrolled` as a verdict of
its own. Row 16 is the clean demonstration: identical measurements both times, different verdict
name, because the rule now produces the label that was previously a hand-written footnote.

**solx's embedded front end changed within solc 0.8.34.** 0.1.7 embedded
`0.8.34+commit.ebeac7c2`; 0.1.8 embeds `0.8.34+commit.91fef221`. The LLVM build hash is identical
between them. Neither is the release build the control uses, `0.8.34+commit.80d5c536`. So a
front-end behaviour change between the two releases cannot be attributed to the LLVM backend, and a
compile that now behaves differently has two candidate causes.

Everything else held: hardhat 3.14.0, EDR 0.17.0, hardhat-solx 2.0.0, solc 0.8.34 control, evm
target `osaka`, the same host, the same pinned repository commits, the same pinned fuzz seed. One
exception, immaterial but stated: `@nomicfoundation/hardhat-vendored` resolved to 3.0.5 on two
clones and 3.0.4 on seven, where the 0.1.7 sweep used 3.0.5 throughout. The only difference between
those versions is a vendored coverage-report asset that no compile or test execution touches.

### The silent empty build is fixed

1inch-swap-vm, via-IR, same repository and pinned commit.

| | 0.1.7 | 0.1.8 |
|---|---|---|
| verdict | harness-failures | cannot-compile |
| solx exit under Hardhat | 0 | 1 |
| standard-JSON errors array | empty | 338 entries: 333 warnings, 5 errors |
| binary's own exit code | 0 | 0 |
| binary's stderr | the fatal error | empty |
| artifacts written | 242, all empty bytecode | 0 |
| Hardhat's report | "Compiled 149" | `Error HHE910: Compilation failed` |
| tests run under solx | 0 | 0 |

Release note #666, reporting worker fatal errors per contract instead of dropping the contract, did
what it says. Three things need keeping apart:

- **The defect is fixed.** The fatal error now appears in the structured output with severity
  `error`. A consumer that reads the errors array cannot miss it. Hardhat reads it, which is why
  the compile now fails loudly.
- **The exit code is not the fix.** The binary still exits 0 on a fatal error, and the message moved
  off stderr into the structured output. Anything judging success by exit code alone would still be
  misled by 0.1.8.
- **The limitation is unchanged.** The same recursive `runLoop` still cannot be stackified via-IR:
  `LLVM error: Stackification failed for 'fun_runLoop_62748' function. It is recursive and has stack
  too deep errors.` The diagnostic now suggests refactoring to a non-recursive approach.

Evidence is a direct-binary replay with no Hardhat in the loop, in
`triage/1inch-swap-vm/` of the evidence archive.

### aave-v4's legacy compile now succeeds, and the cause is the compiler

Controlled A/B: one 3,724,371-byte standard-JSON input, captured from the scenario with its own
environment applied, replayed through both binaries back to back on this host.

| binary | exit | peak resident memory | wall | outcome |
|---|--:|--:|--:|---|
| 0.1.7 | 137 (SIGKILL) | 13.3 GiB | 45 s | killed, output truncated |
| 0.1.8 | 0 | 10.8 GiB | 77 s | 355 contracts, 413 warnings, zero errors |

Peak memory falls about 2.5 GiB, roughly 19%, which on a 15.6 GiB host is the difference between
being killed and finishing. This also independently reproduces the 0.1.7 evaluation's own triage,
which reported exit 137 on direct replay.

Note for anyone comparing the two documents: the 0.1.7 sweep run itself recorded exit 1, not a
SIGKILL. Its OOM attribution came from a separate direct replay. Neither sweep observed a SIGKILL,
so this delta is not "SIGKILL then no SIGKILL".

### -O1 output did not change at all

Identical inputs replayed through both binaries. Every contract that compiles under both is
byte-for-byte identical.

| unit | contracts | 0.1.7 total deployed | 0.1.8 total deployed | delta |
|---|--:|--:|--:|--:|
| ens-verifiable-factory legacy | 62 | 72,805 B | 72,805 B | 0.00% |
| ens-verifiable-factory via-IR | 62 | 83,364 B | 83,364 B | 0.00% |
| uniswap-v4-core legacy | 174 | 2,090,219 B | 2,090,219 B | 0.00% |

298 contracts: 298 identical, 0 grew, 0 shrank, none present on only one side. The question "did -O1
output shrink" has a clean answer: no, it did not move.

What did move is resource use, on those same identical inputs.

| unit | peak RSS 0.1.7 | peak RSS 0.1.8 | wall 0.1.7 | wall 0.1.8 |
|---|--:|--:|--:|--:|
| ens legacy | 503 MiB | 420 MiB | 1.78 s | 1.64 s |
| ens via-IR | 385 MiB | 388 MiB | 4.53 s | 1.66 s |
| uniswap legacy | 4.93 GiB | 2.60 GiB | 13.32 s | 7.86 s |
| aave legacy | 13.3 GiB, killed | 10.8 GiB, completed | 45 s | 77 s |

uniswap legacy is the clearest case: peak memory roughly halves for identical output. That is the
same mechanism that carried aave from OOM-killed to a clean compile. The improvement is not uniform
in shape — ens via-IR shows memory flat and time cut to a third. These are single observations on
one host, and compile timing is a separate exercise with its own methodology; treat them as
compile-stage observations, not benchmark results.

### The two control-only failures split on retest

Both were attributed to solc in the 0.1.7 document without an established mechanism.

- `BlockhashTest#testFuzzHistoryBlocks`, openzeppelin solidity via-IR: **reproduced**, byte for
  byte — same counterexample calldata, same two assertion values. It is a fuzz test on the
  seed-driven Solidity runner, and the seed is pinned to the same value in both sweeps. So this row
  is deterministic and the failure is a stable property of the solc-via-IR control.
- `MerkleTree > push > pushing to a full tree reverts`, openzeppelin mocha via-IR: **did not
  reproduce**. Mocha is not driven by that seed.

Read together, that is what one would expect if the first is deterministic and the second
intermittent. Neither is a solx observation. Neither has an established mechanism.

## Finding 1: EIP-170 overshoot is real on four repositories, not nine

The 24,576 B EIP-170 limit was NOT enforced in any run here, so these are compile-time
observations. The `solidity` runner exposes no deployed-code-size setting, and both Mocha
repositories disable the limit in their own config.

This table is measured off `deployedBytecode` in the artifacts, scoped to non-test sources compiled
at the subject version 0.8.34. Test-tree contracts are reported separately because the Solidity
runner deploys them with the limit lifted. Artifacts from other solc versions a repository also
compiles are excluded entirely.

| repository | pipeline | solx max | solx over | control max | control over | solx harness max |
|---|---|--:|--:|--:|--:|--:|
| lidofinance-core | via-IR | 34,895 B | 5 | 25,993 B | 2 | 131,182 B |
| openzeppelin | via-IR | 30,054 B | 9 | 21,506 B | 0 | 48,970 B |
| openzeppelin | legacy | 28,744 B | 4 | 25,277 B | 1 | 41,862 B |
| aave-v4 | via-IR | 27,809 B | 1 | no build | — | 243,306 B |
| aave-v4 | legacy | 27,809 B | 1 | 24,291 B | 0 | 210,587 B |
| graph-horizon | via-IR | 27,696 B | 2 | 22,199 B | 0 | 145,735 B |
| graph-horizon | legacy | 27,025 B | 1 | 24,007 B | 0 | 124,000 B |
| uniswap-v4-core | via-IR | 23,953 B | 0 | 24,009 B | 0 | 181,973 B |
| uniswap-v4-core | legacy | 23,230 B | 0 | 26,947 B | 1 | 156,612 B |
| solady | legacy | 5,059 B | 0 | 4,561 B | 0 | 93,494 B |
| solady | via-IR | 4,953 B | 0 | 4,133 B | 0 | 105,711 B |
| 1inch-aqua | via-IR | 3,898 B | 0 | 4,618 B | 0 | 33,224 B |
| ens-verifiable-factory | via-IR | 3,544 B | 0 | 2,582 B | 0 | 36,786 B |
| 1inch-aqua | legacy | 3,690 B | 0 | 5,185 B | 0 | 27,752 B |
| ens-verifiable-factory | legacy | 3,063 B | 0 | 3,141 B | 0 | 31,087 B |
| 1inch-swap-vm | via-IR | no build | — | 36,743 B | 5 | — |

openzeppelin's compile is shared between its mocha and solidity rows, so it appears once per
pipeline.

What this says, against the 0.1.7 document's claim that solx output exceeds the limit in every one
of the nine repositories:

- **solx pushes production contracts over the limit where solc does not on four repositories**:
  graph-horizon (`RecurringCollector`, 22,199 → 27,696 B via-IR, about 25% larger, and
  `HorizonStaking`), aave-v4 (`SpokeInstance`, 27,809 B), openzeppelin (4 legacy, 9 via-IR, all
  generated `contracts-exposed` wrappers), and lidofinance-core (5 against the control's 2).
- **On three repositories the overshoot disappears** once test harnesses are excluded: ens,
  1inch-aqua and solady. Their 0.1.7 figures match this sweep's *harness* maxima almost exactly —
  solady's 0.1.7 entries of 106,224 B and 93,988 B against this sweep's 105,711 B and 93,494 B.
- **On uniswap the control overshoots and solx does not.** And on 1inch-swap-vm the only side with
  a build is the control, with five contracts over.
- **solx output is not uniformly larger.** It is smaller than solc on 1inch-aqua, solady legacy,
  uniswap and ens legacy.
- **Test harnesses are over the limit under both compilers.** aave's much-quoted "158 contracts
  over EIP-170" is 158 under solx and 158 under the solc control. That figure was never a property
  of solx; it is a property of a suite that compiles 274 test files into harness contracts the
  runner deploys with the limit lifted.

The 0.1.7 table counted compiler warnings, and its control column was almost entirely empty. An
empty warning column is an absence of warning text, not a measurement of compliant output. The
0.1.7 document says so in a caveat; its table reads the other way.

## Finding 2: stack-trace quality under solx is still degraded

Compared on solady's shared `BlockHashLib` failure, which fails under both compilers, so the
compiler is the only variable.

- solc: `Error: EvmError: Revert`, then `at BlockHashLibTest.testBlockHash
  (test/BlockHashLib.t.sol:60)`. The frame resolves to file and line.
- solx: `Error: EvmError: Revert`, then `Stack Trace Warning: Instruction not found at PC 2`. No
  source frame at all.

Unchanged from 0.1.7. Attribution is still undetermined: solx 0.1.4 and later leave `sourceMap`
empty and ship DWARF instead, and the warning text is Hardhat's own. So the defect may be solx's
debug output or our decoder failing to consume DWARF. We maintain the decoder.

This is why rows 13 and 14 show a shared failure with differing text. **The error and the
counterexample are identical on both sides; the only difference is the missing frame.** That
difference is this finding, not evidence that the two compilers behaved differently.

The pinned seed is more deterministic than the 0.1.7 document claimed: that counterexample's
calldata is byte-identical, all 266 characters, across 0.1.7 via-IR, 0.1.7 legacy and 0.1.8 legacy.

## Finding 3: build determinism

uniswap-v4-core, both pairs: the same profile compiled twice from clean produced identical artifact
sizes. All four child exit codes 0, 139 artifacts each compile, hashes equal, zero differing
contracts.

This is a property of one compiler, not a repeated measurement of a pair. The test suites still ran
once each. It is not the repetition analysis that was considered and dropped.

## Expected divergence and non-findings

**Gas divergence is expected, and was observed.** The differential gas assertion the 0.1.7
evaluation left unused ran here on uniswap-v4-core: on both pairs the measured population is
identical (598 function entries, none added or removed) and 597 of the 598 function measurements
differ. Two different code generators are expected to produce different gas, and gas equivalence
is a stated solx non-goal, so this is recorded as expected divergence rather than as a finding. It
also doubles as evidence that the solx side genuinely executed solx-compiled bytecode. The same
probe on solady returned inconclusive (`control-tests-failed`), correctly: the control's snapshot
run did not pass, so there was no baseline to compare against.

**The memory-unsafe-assembly probes still produce no signal.** graph-horizon and aave-v4 run with
`EVM_DISABLE_MEMORY_SAFE_ASM_CHECK=1`, and each carries a flagged region where solx spilling past
unannotated assembly could in principle corrupt memory. The graph-horizon spill is still present
(26 occurrences in the solx legacy log, the 0.1.7 count) and all 574 tests pass on both pipelines;
aave-v4's flagged legacy build now completes — unlike 0.1.7 — and all 1,559 tests pass. No coverage
was measured, so "no signal" cannot be distinguished from "the flagged code was never reached".

## The optimizer-off baseline

Measured after the evaluation above, on 2026-08-23, on a DIFFERENT host: 16-thread i9-11900F,
31 GiB RAM, WSL2, Node v24.19.0. Same pinned repository commits, same pins, same fuzz seed. Do
not compare timings or memory across the two hosts; compile outcomes and set-differences carry
over.

Why this was measured: solx always optimizes — its lowest level is -O1, there is no off — while
the solc control above runs each repository's own optimizer settings, and optimizer-off is what a
plain Foundry test run defaults to. So the fairness question has two halves: does the
optimizer-off baseline even build these repositories, and how much does solc's OWN optimizer
toggle perturb test outcomes — the scale any solx-vs-solc difference has to be read against.

The runs are calibration pairs: solc against solc with the optimizer off, both sides the same
front end, so nothing in them is a solx measurement. Fifteen repository-pipelines were attempted
(the solidity runner's seven legacy-capable and eight via-IR-capable repositories).

| repository | legacy, optimizer off | via-IR, optimizer off |
|---|---|---|
| 1inch-aqua | compiles; 49P, no flips | compiles; 49P, no flips |
| 1inch-swap-vm | no legacy pipeline | does NOT compile — the optimized via-IR control does |
| aave-v4 | compiles; 1,559P, no flips | neither solc via-IR variant compiles |
| ens-verifiable-factory | compiles; 23P, no flips | compiles; 23P, no flips |
| graph-horizon | compiles; 574P, no flips | compiles; 574P, no flips |
| openzeppelin | does NOT compile — P256.sol stack too deep | compiles; ONE flip |
| solady | does NOT compile — inline-assembly stack too deep | compiles; TWO flips |
| uniswap-v4-core | compiles; 598P, no flips | compiles; 598P, no flips |

Three findings:

- **The optimizer-off baseline does not build everything.** Three of the fifteen pipelines fail
  to compile with the optimizer off where the optimized build succeeds: openzeppelin legacy
  (`P256.sol:241`, stack too deep), solady legacy (inline assembly, `key_` two slots too deep)
  and 1inch-swap-vm via-IR. Failing to compile is recorded as a result
  (`control-cannot-compile`), with the compiler's own words in the record. aave-v4 via-IR fails
  under both solc variants, so nothing there is attributable to the toggle.
- **solc's own optimizer toggle flips three test outcomes in two repositories.** openzeppelin
  via-IR: `BlockhashTest#testFuzzHistoryBlocks` fails with the optimizer ON and passes with it
  off — the same deterministic failure this document's control-only section attributes to solc,
  now narrowed to solc's via-IR optimizer. solady via-IR: the two
  `testLambertW0WadMonotonicallyIncreasing` variants (FixedPointMathLib, plain and CLZ) fail
  only with the optimizer OFF. Neither is root-caused. Every other pipeline that built shows
  zero flips.
- **The scale statement.** Across the ten pipelines where both solc variants ran the suite,
  flipping solc's own optimizer flag changes three test outcomes. The solx-vs-solc differential
  above changes zero, everywhere it measured. On these suites, switching compilers to solx
  perturbs test outcomes less than flipping solc's own optimizer switch. That is a statement
  about these suites' sensitivity, not a correctness proof — limitation 1 stands.

The same runs replicated the standard solx-vs-solc pairs on this second host as a side effect:
5,119 tests under solx across the six solidity-runner repositories that build, zero solx-only
failures, every passing/failing count identical to the tables above, solady's shared failure
reproducing with the same counterexample, and aave-v4 via-IR's dead control now reported as
`control-cannot-compile` — the verdict added for exactly that shape — instead of a footnote.

Not measured here: the two mocha repositories (openzeppelin's mocha suite shares the solidity
rows' compile, so its optimizer-off compile outcome is the same failure; lidofinance-core's
mixed-compiler scoping was not repeated), and solx-vs-optimizer-off-solc differentials beyond a
demonstration on ens-verifiable-factory and 1inch-aqua (both pass; derivable anyway from the
calibration rows plus the matrix above). Single run, one seed, like everything else here.

Evidence: `solx-0.1.8-optimizer-off-evidence.tar.gz` next to this file — per-pair JSON records,
full suite logs, per-scenario environment captures, and the regenerated report;
`solx-0.1.8-optimizer-off-summary.json` is the machine-readable summary. Produced by the same
`test-under-solx.ts`, via `--pair solx-<pin>:solc-no-opt` and the `--calibration-pair` flag it
grew for this measurement.

## Control-only failures

- `BlockhashTest#testFuzzHistoryBlocks`, openzeppelin solidity via-IR. Reproduced from 0.1.7 byte
  for byte. Attributed to solc because that is the side that fails; no mechanism established. The
  optimizer-off baseline section narrows it one level: it passes under solc-via-ir with the
  optimizer off, so it is a property of solc's via-IR optimizer pipeline specifically.

## Shared failures excluded from verdicts

- solady, both pairs: `BlockHashLibTest#testBlockHash(uint256,uint256,uint256,bytes32)` fails under
  both compilers with the same counterexample. Not root-caused. It sits on vendored bytecode
  injected with `vm.etch`, which is consistent with reading it as environmental rather than
  compiler-related.

## lidofinance-core mocha (row 18)

An env-gated wrapper flag re-adds `test/` to the source roots. The run is scoped to the same 45
unit-test files under `test/0.8.25/` that the 0.1.7 evaluation ran; the file list was taken from the
0.1.7 record rather than retyped, and all 45 were verified present at the pinned commit. Result:
1,266 passing, 1 pending, identical on both sides.

A first attempt ran the full mocha suite by mistake. That sweeps in `test/integration/**`, which
deploys the protocol from scratch and aborts on `Environment variable DEPLOYER is required`. Both
sides failed identically and the harness recorded `harness-failures` rather than reading it as a
solx result. So "full suites once" has one documented exception, and it is the same exception in
both evaluations.

Provenance behaved as designed for this mixed-compiler repository: 7 build-infos per run, of which
only the 2 at 0.8.34 must be solx on the solx side. The legacy ballast trees, at solc 0.4.24 through
0.8.9, stay on upstream's own compilers. Some of the bytecode this run executed therefore came from
a compiler other than the one under test. How much was not measured.

lidofinance-vaults: N/A by structure. See the core repository.

## Limitations

1. We did not verify that these suites can detect a miscompilation. The 0.1.7 evaluation's positive
   control showed the harness reports a solx-side-only failure; it was not repeated here. So "no
   solx-only failures" means the suites saw no divergence where they happen to look.
2. The harness changed between the two evaluations. Any verdict difference may be the harness rather
   than the compiler. Row 16 is a worked example: identical measurements, different verdict name.
3. solx's embedded solc front end changed within 0.8.34, while its LLVM build hash did not. Neither
   embedded front end is the release build the control uses. So front-end behaviour changes between
   the two releases cannot be attributed to the backend.
4. Fuzz seeds were pinned to one value. That makes the comparison exact and means the fuzzers
   explored one deterministic corpus, not a broad search.
5. Each configuration ran once, on one machine, against one pre-1.0 solx release. Repetitions were
   considered and deliberately not implemented — see the note below. Nothing here screens for an
   intermittent miscompilation that happened to pass.
6. 706 tests never executed under solx. They are the suite solx still cannot compile.
7. aave-v4's via-IR row has no control, because solc-via-IR cannot compile that test tree. Its
   legacy row does, which is why its tests count as controlled.
8. These suites were written to find bugs in the contracts they ship with, not to stress a compiler.
9. aave-v4's via-IR result is solx succeeding where solc's stack scheduler gives up. It says nothing
   about which compiler produces better code.
10. The memory improvement is measured on four compilation units on one host. It is not a general
    claim about solx's memory use.
11. We have not determined whether the missing stack frames come from solx's debug output or from
    our own decoder.
12. We build Hardhat and EDR. The harness, runner, EVM and trace decoder used throughout are our own
    software, and solx is a third party's. Several of the observations here run through our
    components.
13. The 0.1.7 defects were found in 0.1.7 and were not filed upstream by that evaluation. This
    retest establishes that one is fixed and one compile limitation remains. We did not check
    whether the remaining limitation is tracked upstream.
14. No coverage was measured, so we cannot say what fraction of each contract these suites execute.
15. The nine repositories came from an existing solx compile-benchmark suite, selected for being
    hard to compile rather than for being representative or well-tested.
16. One failure fails under both compilers and was not root-caused. One occurs only under the solc
    control and was attributed to solc without establishing a mechanism.
17. The harness flags a solx test count far below the control's. It does not assert that both sides
    discovered the same tests by name. In this data the totals matched exactly on every row except
    15 and 16.
18. Provenance answers who compiled, not what was produced. Some executed bytecode reaches the EVM
    by other routes, including typechain factories with embedded bytecode and `vm.etch` with
    vendored hex.
19. The gas and build-determinism probes ran on two repositories, not on every pair.
20. `@nomicfoundation/hardhat-vendored` was not uniform across clones: 3.0.5 on two, 3.0.4 on seven.
    Immaterial to compilation and test execution, but the environment was not identical everywhere.
21. The forge warm-cache preparation steps that each scenario declares were skipped. This harness
    never invokes forge, so they affect no result here; every other declared preparation step ran.

### Repetitions

Repetitions were considered and are not implemented. Each pair ran once, with a single pinned seed.
The machinery to vary the seed per repetition exists in the harness and is dormant. The estimated
cost of three repetitions was about 3 hours of child-process time and 5 hours of wall time. Every
figure here is a single observation, and the two evaluations being compared are single observations
each.

## Environment and versions

- solx: v0.1.8. Front end solc `0.8.34+commit.91fef221`, LLVM build
  `7d0702e169889fe4f1a2241c57bef7d2c1c68737`. Pinned binary per repository, provenance asserted per
  run. For comparison, 0.1.7's front end was `0.8.34+commit.ebeac7c2` with the same LLVM build.
- Control compiler: solc `0.8.34+commit.80d5c536`, through the same Hardhat build system. EVM target
  `osaka` on both sides.
- Hardhat 3.14.0 with EDR 0.17.0, on all nine clones, from the public registry through a local
  Verdaccio proxy. `@nomicfoundation/hardhat-solx` 2.0.0 built from this branch and packed into each
  checkout, with freshness asserted per scenario. `@nomicfoundation/hardhat-vendored` 3.0.5 on two
  clones and 3.0.4 on seven.
- Versions were read with a resolver that mirrors runtime resolution. An earlier probe that scanned
  pnpm store directory names reported hardhat 2.23.0 and EDR 0.10.0 for one clone, both wrong: those
  are copies belonging to transitive dependencies. Do not quote versions from store directory names.
- Runner host: 24-thread i9-12900HX, 15.6 GiB RAM, WSL2, Node v22.23.2. The RAM figure is
  load-bearing for the aave-v4 comparison.
- Repository pins: every checkout HEAD was verified equal to its pinned commit. openzeppelin
  `f72b6b461680`, ens-verifiable-factory `cd6622442c29`, 1inch-aqua `19277969b5e6`, 1inch-swap-vm
  `7102f412db16`, graph-horizon `68661591b7e2`, uniswap-v4-core `ab2b22eef19e`, solady
  `13d87ff27de0`, aave-v4 `f729aeff7cc6`, lidofinance-core `28bc9f7ff2c4`.
- Determinism screen: no solx-only failure existed, so it never fired.

## Conflict of interest

We build Hardhat, EDR and the Solidity stack-trace decoder. solx is a third party's compiler. The
harness, test runner, EVM and trace decoder used throughout this evaluation are our own software.
Finding 2 and the expected-divergence notes in particular run through components we control.

## How this was produced

`scripts/benchmark/test-under-solx.ts` on the `solx-test-execution-evaluation` branch. Per pair:
clean, then build and test with the solx profile, then the provenance assert, then the artifact
inventory, then clean again, then the same for the control profile, then the set-difference
verdicts, then a per-pair JSON and a regenerated report. Each scenario's declared preparation steps
run from `scenario.json`, except the forge warm-cache steps.

The sweep command, per scenario and runner:
`node scripts/benchmark/test-under-solx.ts --scenario ./end-to-end/<s> --runner <r> --out <dir>`.
Pairs default to the pinned legacy and via-IR pairs. A scenario that throws is recorded as
`results/<scenario>.error.json` and the sweep continues. Every per-pair record stores the exact
command it ran, including lido's 45-file scoping.

Evidence archive `solx-0.1.8-test-evaluation-evidence.tar.gz`, committed next to this file, holds
the 18 per-pair JSON records with full failure text, provenance results and artifact inventories;
the regenerated matrix and summary; the per-run environment captures; the resolved served-versions
and checkout-pin listings; the 1inch-swap-vm triage with its captured standard-JSON input, the
direct-binary output and the error census; the binary A/B bundle behind the memory and size tables;
and the sweep state log (`STATE.md`, the working log with the full ledger of collection incidents
and corrections). All per-run suite logs are included in full.
`solx-0.1.8-test-execution-summary.json` next to this file is the machine-readable summary.

Archive pruning. The raw evidence reached 476 MB, almost all of it full standard-JSON compiler
output. The eleven `*-out-*.json` triage outputs and the dump-standard-json corpus were dropped.
Each dropped output left an `*.errors.json` behind: severity counts, contract counts,
empty-bytecode counts, total deployed bytes, and the full text of every severity-error entry. Two
dropped outputs were unparseable because the 0.1.7 binary was killed mid-write; their
`.errors.json` records that and the truncated byte count. Everything load-bearing stayed. Result:
18 MB on disk, 1.8 MB compressed.

Reproduction notes, learned during collection:
- Merge `scenario.definition.env` when replaying a harness run by hand. A first A/B attempt left
  `EVM_DISABLE_MEMORY_SAFE_ASM_CHECK` unset and produced 22 phantom errors on an input the sweep
  never compiled. The memory figures survived, since both binaries still received identical input.
  The artifact counts from that run were meaningless.
- Do not read package versions from pnpm store directory names; resolve them the way the runtime
  does (see the environment section).
