# solx 0.1.8 test-execution evaluation — sweep state

Branch: solx-test-execution-evaluation (worktree /home/workspace/repos/hardhat-solx-helpers).
Clone dir: /tmp/e2e-solx-0.1.8 (pass --e2e-clone-dir on every run). The 0.1.7 sweep's clones
under /tmp/e2e-solx-test-eval are left untouched.
Command template:
  node scripts/benchmark/test-under-solx.ts --scenario ./end-to-end/<s> --runner <r> \
    --e2e-clone-dir /tmp/e2e-solx-0.1.8 --out solx-0.1.8-test-evaluation-evidence
Pairs default to solx-0.1.8:default + solx-0.1.8-via-ir:solc-via-ir. Results land in
results/<slug>.json; report.md + summary.json regenerate after each pair. A scenario that
throws is recorded as results/<scenario>.error.json and the sweep continues.

Single run per pair, one pinned fuzz seed. Repetitions are not implemented — see the report.
The forge prime steps are skipped: this harness never invokes forge.

## Served versions (from the initialized clones)

- solx 0.1.8, front end solc 0.8.34+commit.91fef221, LLVM build 7d0702e1.
- Control: solc 0.8.34+commit.80d5c536, the upstream release build, same Hardhat build system.
- hardhat 3.14.0 and EDR 0.17.0 on all nine clones, from the public registry through a local
  Verdaccio proxy. Same as the 0.1.7 sweep.
- hardhat-solx 2.0.0 on all nine, built from this branch and packed into each checkout, freshness
  asserted per scenario against .solx/expected-dist-src.
- solx binary solx-v0.1.8 present in all nine.
- hardhat-vendored is NOT uniform: 3.0.5 on ens-verifiable-factory and 1inch-swap-vm, 3.0.4 on the
  other seven. 3.0.5 is the locally built patch bump that Verdaccio published during some inits;
  3.0.4 is the released version. The 0.1.7 sweep reported 3.0.5 throughout, so this is a genuine
  difference from that environment and from clone to clone within this one.

  Immaterial to every result here, and stated rather than smoothed over: the only difference
  between the two is a vendored istanbul HTML coverage asset, which no compile or test execution
  touches. But the report must not claim a uniform environment.

- Resolution method matters. These were read with a resolver that mirrors runtime: direct
  dependencies through node_modules/<pkg>, transitive ones from the location of the package that
  loads them. An earlier probe that scanned .pnpm directory names reported hardhat 2.23.0 for
  1inch-swap-vm and EDR 0.10.0, both wrong — those are copies belonging to transitive
  dependencies, and picking the first match in the store reports the wrong one. Do not size or
  quote versions from store directory names.
- The per-scenario environment JSON records null for edr and hardhat-vendored, because
  installedVersion cannot see pnpm's isolated layout for a package that does not export
  ./package.json. served-versions.txt is the authority. The gap is in metadata capture only and
  reaches no verdict; the code fix is a required post-sweep commit, described below.
- harnessDirty is true in every environment capture. Verdaccio's init step patch-bumps eleven
  packages/*/package.json files, which are reverted after the sweep. No harness source is
  modified during it.

## Provenance gate — PASSED before the sweep

solx 0.1.8 still embeds solc 0.8.34. A plain-solx compile of ens-verifiable-factory writes
build-info with compilerType solx, solcVersion 0.8.34, solcLongVersion "0.1.8+solx".
The front end moved within that version: 0.1.7 embedded 0.8.34+commit.ebeac7c2 and 0.1.8
embeds 0.8.34+commit.91fef221, with an identical LLVM build hash. Neither is the release build
the control uses.

## Sweep

- [x] 1. ens-verifiable-factory-solx solidity (both pairs) — pass / pass, 23P/0F each side,
      identical to the 0.1.7 sweep.
- [x] 2. openzeppelin-contracts-0.34 mocha (both pairs) — pass / pass, 7654P/0F/1S on all four
      runs. DELTA: the 0.1.7 sweep recorded a control-only failure on the via-IR pair
      ("MerkleTree > push > pushing to a full tree reverts"). It did not reproduce here, under an
      identical control (same solc build, hardhat, EDR and seed). One observation against one.
- [x] 3. openzeppelin-contracts-0.34 solidity (both pairs) — pass / pass, 347P/0F under solx on
      both. The via-IR control ran 346P/1F: the 0.1.7 control-only failure
      BlockhashTest#testFuzzHistoryBlocks REPRODUCED, with byte-identical counterexample calldata
      and byte-identical assertion values. So the pinned seed does fully determine that row across
      two sweeps a day apart, and the failure is a stable property of the solc-via-IR control.
      Its mechanism is still not established.
- [x] 4. 1inch-aqua-solx solidity (both pairs) — pass / pass, 49P/0F each side. The 0.1.7 Finding
      4 table lists aqua as overshooting at 31,784 B via-IR and 25,592 B legacy. Both were test
      harnesses. Its deployable maxima are 3,898 B and 3,690 B, none over the limit, and SMALLER
      than the control's 4,618 B and 5,185 B.
- [~] 5. graph-horizon-solx solidity — legacy pair pass, 574P/0F/2S each side. via-IR in flight.
      The relocated artifacts root (build/contracts) walked clean: 145 artifacts, all 145
      attributed to the subject build-info, zero truncated, unreadable or unparseable.
- [ ] 6. uniswap-v4-core-solx solidity (both pairs)
- [x] 7. 1inch-swap-vm-solx solidity (via-IR pair ONLY) — HEADLINE RETEST: the 0.1.7 defect is
      FIXED. Verdict cannot-compile, "test-source build fails before any test runs". solx exit 1
      under Hardhat, compile-error marker present, zero artifacts, no build-info written, and
      Hardhat reports Error HHE910: Compilation failed. Control unchanged at 706P.

      Direct-binary replay of the identical standard-JSON input, no Hardhat in the loop
      (triage/1inch-swap-vm/): the binary still exits 0, stderr is now EMPTY, and the
      standard-JSON errors array carries 338 entries — 333 warnings and 5 with severity "error",
      each the LLVM stackification failure for fun_runLoop_62748. Zero contracts are emitted.

      Against 0.1.7 on the same repository and pipeline: exit 0, the fatal error on stderr only,
      an EMPTY errors array, and 242 artifacts every one of which carried empty bytecode, which
      Hardhat reported as "Compiled 149" before the runner found no suites and exited 0.

      So release note #666, reporting worker fatal errors per contract instead of dropping the
      contract, did what it says. Two things are worth separating:
      - The DEFECT is fixed. The failure is now in the structured output, so a consumer that reads
        the errors array cannot miss it. Hardhat reads it, which is why the compile now fails.
      - The exit code is NOT the fix. The binary still exits 0 on a fatal error. A consumer
        relying on the exit code alone would still be misled.
      - The underlying LIMITATION is unchanged: the same recursive runLoop still cannot be
        stackified via-IR. The diagnostic now suggests refactoring to a non-recursive approach.

      Consequence for this harness: the zero-bytecode cannot-compile guard built to catch the 0.1.7
      shape found nothing to catch, because the build no longer succeeds. Its value here is as a
      regression detector, not as a live finding.
- [ ] 8. solady-solx solidity (both pairs)
- [x] 9. aave-v4-solx solidity — LEGACY PAIR NOW PASSES, where the 0.1.7 sweep could not compile
      it at all. via-IR pair unchanged from 0.1.7: pass-uncontrolled.

      via-IR: solx exit 0, 1559P/0F/1S, 329 artifacts, provenance green. The solc-via-IR control
      still cannot compile the test tree, with the identical diagnostic the 0.1.7 evaluation
      recorded: "YulException: Variable var_user is 1 too deep in the stack", then Error HHE910.
      So that half of Finding 2 is unchanged — solx compiles a tree solc's stack scheduler gives
      up on, and it still says nothing about which compiler produces better code.

      This is also the first firing of the pass-uncontrolled verdict, and it is the D1 caveat made
      concrete. The 0.1.7 sweep reported this same shape as "pass" with a hand-written footnote
      marking it uncontrolled. The rule now produces the label, so the two documents disagree on
      the word while agreeing on the measurement. The delta section must say that the verdict
      changed because the harness changed, not because solx did.

      SpokeInstance is 27,809 B on BOTH pipelines and over the limit on both, because the wrapper
      gives it a per-file via-IR override in every profile. The control's via-IR side produced no
      artifacts at all, so it has no size column here.

      0.1.8 legacy: solx exit 0, 1559P/0F/1S, 329 artifacts, 256 with bytecode, provenance green,
      220 s. Control identical at 1559P/0F/1S in 350 s. So solx was FASTER than solc here on
      compile plus tests, and the row is now a CONTROLLED pass on both sides.

      0.1.7 legacy, from its own record: verdict cannot-compile, solx exit 1, and the harness had
      no resourceLimited field yet. Note what the 0.1.7 record does NOT contain: a SIGKILL. Its
      report attributes the failure to the kernel OOM-killing solx, but that came from a separate
      direct replay of the dumped input exiting 137, not from the sweep run, which saw exit 1
      through Hardhat. The report is explicit about that; it is worth restating so this comparison
      is not read as SIGKILL-then-no-SIGKILL.

      ATTRIBUTION IS NOT YET ESTABLISHED. Same host, same 15.6 GiB, and the machine had about 10 GiB
      available when checked. But a passing compile on a busy shared host is not proof that the
      compiler needs less memory. The controlled test is queued below: replay the identical dumped
      legacy input through the 0.1.7 and the 0.1.8 binary on this host, back to back. Not run
      during the sweep, because a second large compile competing for memory could manufacture the
      very OOM under investigation.
- [~] 10. lidofinance-core-solx mocha (via-IR pair only, LIDO_BENCH_INCLUDE_TESTS=1) — first
      attempt failed on BOTH sides and is being re-run scoped. My invocation was wrong, not solx.

      The first attempt passed no --tests, so it ran the whole mocha suite, which includes
      test/integration/**. Those deploy the Lido protocol from scratch and abort on
      "Environment variable DEPLOYER is required". Both sides exited 1 with no test summary, and
      the harness correctly called it harness-failures rather than reading it as a solx result.
      Provenance was green on both sides and the builds succeeded — 531 artifacts, 233 at the
      subject version — so this was purely a test-selection error.

      The 0.1.7 sweep did not run the full suite either. Its recorded command lists 45 explicit
      unit-test files under test/0.8.25/, and its report says so. Comparing an unscoped run against
      that would not be a delta. The re-run uses the identical 45 files, extracted from the 0.1.7
      record rather than retyped, and all 45 verified present at the pinned commit.

      METHOD NOTE FOR THE REPORT: the lido row is scoped in both evaluations, so "full suites once"
      has one documented exception, and it is the same exception both times.

      RE-RUN RESULT: pass. 1266P/0F/1S on both sides, matching the 0.1.7 sweep exactly. Zero
      solx-only, zero shared, zero control-only failures. Provenance behaved as designed for this
      mixed-compiler repository: 7 build-infos per run, 2 at the subject version, and only those 2
      are required to be solx on the solx side.

      lido is a third repository where production contracts cross the limit, and here BOTH
      compilers do. solx has 5 over with a maximum of 34,895 B (VaultHub); the control has 2 over
      with a maximum of 25,993 B (Dashboard). The predicted VaultHub EIP-170 revert did not occur,
      as in 0.1.7, because lido's own config lifts the limit in two places and the wrapper spreads
      it through.

## Sweep complete

18 rows. 17 pass or pass-uncontrolled, 1 cannot-compile (swap-vm, where the 0.1.7 defect is fixed
and the underlying limitation remains). Zero solx-only test failures anywhere in the sweep.
Wall time about 90 minutes, 08:56 to 10:26.
- [ ] lidofinance-vaults-solx: N/A, see the core scenario

## Probes, on a subset rather than every pair

uniswap carries --gas-snapshot and --build-repro; solady carries --gas-snapshot. Those are the two
scenarios where the 0.1.7 evaluation looked for a gas signal and found none. Probes run after the
verdict is settled, so they cannot change one. Reported with the explicit state and reason the
probe records, never as a bare pass or fail.

Approved by the user, who asked to review the outcomes once they are known. Both probes' full
results are in the per-pair JSONs and summarized below, so that review has something to read.

## What was pruned from the archive, and why

The evidence directory reached 476 MB before pruning, against a target of roughly 5 MB compressed.
Almost all of it was full standard-JSON compiler output, which contains every contract's bytecode.

Dropped: the eleven `*-out-*.json` compiler outputs from the triage runs, and the
dump-standard-json corpus directory.

Kept, because each is either load-bearing or a reproducer:
- every per-pair result JSON, every per-run suite log untruncated, and the per-run environment
  captures
- the standard-JSON INPUTS for each triage run, so a third party can replay them
- per-contract size maps, which are the evidence behind the unchanged -O1 claim
- `/usr/bin/time -v` captures, which are the evidence behind the memory claim
- an `*.errors.json` extracted from each dropped output: severity counts, contract counts, empty
  bytecode counts, total deployed bytes, and the full text of every severity-error entry

Two dropped outputs were unparseable because the 0.1.7 binary was killed mid-write. Their
`.errors.json` records that fact and the truncated byte count rather than pretending the file was
readable.

The two aave inputs from the first and second A/B attempts are byte-identical, so only the faithful
second capture is kept. Result: 18 MB on disk, 1.8 MB compressed.

## Required post-sweep commit — installedVersion under pnpm

The manual served-versions.txt capture is accepted for THIS sweep, because its values were
validated identical to the 0.1.7 environment. The code fix must land as an additional commit
after the sweep, so the environment capture cannot silently record null again. Deferred rather
than applied now: changing the harness mid-sweep would attribute earlier records to code that no
longer exists.

Why the current attempt is not enough. installedVersion tries
createRequire(projectDir).resolve("<pkg>/package.json") and then walks parent directories for
node_modules/<pkg>/package.json. Both fail for a TRANSITIVE package under pnpm's isolated
layout: there is no node_modules/<pkg> symlink for a package the project does not depend on
directly, and edr does not export ./package.json. The real file sits at
node_modules/.pnpm/<name-with-+>@<version>/node_modules/<name>/package.json.

Planned resolution order, each step falling through on failure:
1. createRequire(projectDir).resolve("<pkg>/package.json") — direct deps that export it.
2. Walk up from createRequire(projectDir).resolve("<pkg>") to the nearest package.json whose name
   matches — direct deps that do not export ./package.json.
3. The existing parent-directory node_modules walk — npm and yarn flat layouts.
4. Scan node_modules/.pnpm for <name-with-+>@<version> directories and read the version out of
   the real package.json inside each. Return the single version found. If the store holds several,
   return them comma-joined rather than picking one: an ambiguous evidence field must read as
   ambiguous, not as a guess.

Unit test to add, per the reviewer's prescription and the user's request: a temp dir holding only
node_modules/.pnpm/@scope+pkg@1.2.3/node_modules/@scope/pkg/package.json, asserting the helper
resolves 1.2.3 — i.e. a transitive package reachable only through pnpm's store. Plus a flat-layout
case so step 3 stays covered, and a two-versions-in-the-store case pinning that both are reported.

## Probe results — uniswap, both pairs

Gas snapshot. The first differential gas assertion executed in either evaluation, and it fails on
both pipelines.

| pair | state | reason | baseline | function gas | snapshot cheatcodes | total |
|---|---|---|---|---|---|--:|
| legacy | diverged | gas-differences | 598 entries + 20 files | 597 changed, 0 added, 0 removed | 89 changed, 0 added, 0 removed | 686 |
| via-IR | diverged | gas-differences | 598 entries + 20 files | 597 changed, 0 added, 0 removed | 92 changed, 0 added, 0 removed | 689 |

added and removed are zero on every section, so both runs of each pair measured the SAME population
of functions. That is what makes "diverged" a gas result rather than a suite mismatch, and it is why
the measurement-population-differs state did not fire. Counts come from the sections the check
prints for itself, not from a line-shape regex.

## Probe results — solady, both pairs, and why they are inconclusive

state inconclusive, reason control-tests-failed, on both pipelines. Baseline null, no counts, no
divergence figure. That is the correct answer and it is worth spelling out, because it is a live
instance of the defect the gas probe was rewritten to remove.

solady carries one test that fails under BOTH compilers. So the control's --snapshot write run
finished 2040 passing, 1 failing. The plugin writes the function-gas baseline only when the tests
passed, so it wrote nothing, and no .gas-snapshot exists on disk afterwards — verified in the clone.
With no baseline there is nothing for the solx check to compare against.

Under the previous logic the published verdict was matched = (check exit code == 0). The check run
also carries that same failing test, so it exits non-zero, and the row would have rendered as
"DIVERGED (exit 1)" next to a regex-derived divergence count. A published claim of gas divergence,
on a row where no baseline was ever written and no comparison ever ran. The 0.1.7 evaluation would
have shipped exactly that on both solady pairs had it used the probe.

trackedRestored is 0 here, correctly: solady tracks no snapshot files, so there was nothing to
restore. uniswap, which tracks 20, restored 20.

Build determinism, both uniswap pairs: identical true. All four child exit codes 0 each time, 139 artifacts
on both compiles, hashes equal, zero differing contracts. A real answer rather than the false "yes"
two failed compiles used to produce. A property of one compiler, not a repeated measurement of a
pair.

Snapshot state handling verified end to end on the scenario that ships 20 committed baselines:
  removedBeforeWrite ["snapshots"], the write recreated both, then the finally block cleared them
  and restored all 20 tracked files. Checked in the clone afterwards: zero changed entries under
  .gas-snapshot and snapshots/, and no untracked .gas-snapshot left behind.

Known cosmetic flaw, evidence only: the probe's diffSample field also picks up compiler warning
source-location arrows, because its line filter matches two-or-more spaces then a dash. The
published counts do not come from it — they are parsed from the check's own section headers.

## Deltas found so far

D-a. The size tables of the two evaluations are not comparable. The 0.1.7 table counted compiler
     oversize warnings, which include test-harness contracts; this one reads deployed bytecode off
     the artifacts and scopes it to non-test sources at solc 0.8.34. Concretely, the 0.1.7 table
     lists ens-verifiable-factory as overshooting on via-IR at 25,456 B. Scoped to deployable
     contracts it does not overshoot at all: 3,544 B, none over the limit. The 25,456 B contract
     was a test harness, reported here in its own exempt column. So the 0.1.7 claim that every one
     of the nine repositories overshoots under solx has to be restated, not repeated.

D-b. The overshoot is not solx-exclusive, and solx output is not uniformly larger. Measured off
     the artifacts, per side, as a ratio of solx's largest to the control's largest:

     | scenario | pipeline | deployable | test harness |
     |---|---|--:|--:|
     | 1inch-aqua | legacy | 0.71x | 0.79x |
     | 1inch-aqua | via-IR | 0.84x | 0.87x |
     | ens-verifiable-factory | legacy | 0.98x | 0.97x |
     | ens-verifiable-factory | via-IR | 1.37x | 1.17x |
     | openzeppelin | legacy | 1.14x | 1.22x |
     | openzeppelin | via-IR | 1.40x | 1.45x |

     solx is smaller than solc on 1inch-aqua and on ens legacy, and larger on openzeppelin and on
     ens via-IR. The 0.1.7 Finding 4 table shows the controls with zero oversize warnings almost
     everywhere, which reads as an overshoot unique to solx. It is not. The control's own test
     harnesses run 31,422 to 34,422 B here, well past the 24,576 B limit, on every scenario
     measured so far. What the 0.1.7 table actually compared was solx's warning count against a
     control column that was mostly empty, and an empty warning column is not a measurement of
     compliant output — the 0.1.7 document says so in its own caveat, but the table invites the
     other reading.

     The large absolute numbers in that table (up to 162,624 B) belong to test-harness contracts,
     which are large under both compilers and never deploy to a chain.

D-d. graph-horizon is where the EIP-170 finding survives proper scoping. Production contracts,
     not harnesses or mocks or generated wrappers, cross the limit under solx while the solc
     control keeps every one of them under it.

     | pipeline | side | over the limit | which |
     |---|---|--:|---|
     | legacy | solx | 1 | RecurringCollector 27,025 B |
     | legacy | control | 0 | RecurringCollector 24,007 B, 569 B under |
     | via-IR | solx | 2 | RecurringCollector 27,696 B, HorizonStaking 24,858 B |
     | via-IR | control | 0 | RecurringCollector 22,199 B |

     RecurringCollector grows 22,199 -> 27,696 B via-IR, about 25%, and that is what carries it
     past the limit. On both pipelines the control has nothing over. This is the shape the 0.1.7
     Finding 4 was reaching for; unlike its table, it holds up once test harnesses and other-version
     ballast are excluded.

     For contrast, on the same runs the test harnesses are over the limit on BOTH sides: 73 over
     under solx against 72 under the control, maxima 145,735 B and 112,536 B. That is why the two
     populations are reported in separate columns.

D-k. The 0.1.7 report's most quoted size number, aave's "158 contracts over EIP-170", is identical
     on BOTH compilers. This sweep's aave legacy pair: 158 test-harness contracts over the limit
     under solx, and 158 under the solc control. Maxima 210,587 B and 237,357 B.

     So that figure was never a property of solx. It is a property of aave's test suite, which
     compiles 274 test files into harness contracts that the Solidity runner deploys with the limit
     lifted. Scoped to deployable contracts the same pair gives solx 1 over the limit
     (SpokeInstance, 27,809 B) and the control 0 — which IS a solx finding, and a far smaller one
     than 158.

     aave and graph-horizon are the two repositories where a production contract crosses the limit
     under solx and not under solc. Everywhere else measured so far, either neither side overshoots
     on deployable contracts or the control overshoots too.

D-j. Direct confirmation that the 0.1.7 Finding 4 table measured test-harness contracts. Its
     solady figures are 106,224 B via-IR and 93,988 B legacy. This sweep's solady test-harness
     maxima are 105,711 B via-IR and 93,494 B legacy — the same contracts, within a few hundred
     bytes, two solx releases apart. Meanwhile solady's DEPLOYABLE maxima are 4,953 B and 5,059 B,
     with nothing over the limit on either side.

     So the 0.1.7 table's solady row was a statement about test harnesses, reported under a heading
     about deployed-code limits. Same for ens and 1inch-aqua. That makes three of the nine
     repositories where the published overshoot disappears entirely once the population is scoped
     to contracts that can actually be deployed.

D-g. uniswap inverts the 0.1.7 size narrative outright, and it is the clearest evidence that the
     0.1.7 Finding 4 control column was not a measurement.

     | pipeline | side | deployable max | over | test-harness max | over |
     |---|---|--:|--:|--:|--:|
     | legacy | solx | 23,230 B | 0 | 156,612 B | 15 |
     | legacy | control | 26,947 B | 1 | 197,852 B | 17 |
     | via-IR | solx | 23,953 B | 0 | 181,973 B | 16 |
     | via-IR | control | 24,009 B | 0 | 199,254 B | 20 |

     On deployable contracts solx is SMALLER than solc on both pipelines, and on legacy it is the
     CONTROL that puts a contract over the limit while solx does not. On test harnesses the
     control's are larger than solx's on both pipelines, and the control has MORE of them over the
     limit.

     The 0.1.7 Finding 4 table records uniswap as solx 84,732 B with 12 warnings via-IR and
     71,004 B with 7 warnings legacy, against a control column of 0 warnings and no size. The
     control's actual harness maximum is 199,254 B. So the zero in that column recorded an absence
     of warning text, not compliant output, exactly as the 0.1.7 document's own caveat says — but
     the table reads the other way, and on this repository the truth is close to the opposite.

     Taken with graph-horizon, where solx really does push two production contracts over the limit
     and the control none, the honest summary is per-repository rather than universal: solx is
     sometimes larger and sometimes smaller, and both compilers overshoot on test harnesses.

D-h. Finding 5 retested and unchanged: solx runs still lose the source frame that solc runs keep.
     Compared on solady's shared BlockHashLib failure, which fails under both compilers, so the
     compiler is the only variable.

       solx    : Error: EvmError: Revert / Stack Trace Warning: Instruction not found at PC 2
       control : Error: EvmError: Revert / at BlockHashLibTest.testBlockHash
                 (test/BlockHashLib.t.sol:60)

     Identical to what 0.1.7 produced. Attribution is still undetermined between solx's debug
     output and our own DWARF decoder, and we maintain the decoder.

     The harness now computes this rather than leaving it to be noticed: the pair record carries
     identicalRaw false with the first diverging line named. The 0.1.7 records have an empty
     sharedFailureDiffs, so that comparison was made by hand there.

     CAREFUL WORDING NEEDED IN THE REPORT. The verdict detail on this row reads "1 of them fail
     with DIFFERENT text on the two sides", which a reader could take as divergent behaviour under
     the two compilers. It is not. The error is the same, the counterexample is the same, and the
     only difference is the missing stack frame — which is itself the finding. The report must say
     that explicitly next to the row.

     Also flagged: prefixOnly true on this row, so the texts were compared over a truncated
     prefix rather than in full.

D-i. The pinned fuzz seed is fully deterministic, verified across more axes than the 0.1.7
     evaluation claimed. The BlockHashLib counterexample calldata is byte-identical, all 266
     characters, across 0.1.7 via-IR, 0.1.7 legacy and 0.1.8 legacy. So the same corpus is
     explored across compiler versions, across pipelines and across sweeps a day apart.

     One correction to my own earlier reading of the 0.1.7 document. Its Finding 5 quotes the
     trace as test/BlockHashLib.t.sol:45, and the 0.1.8 legacy run shows :60, which looked like a
     change. It is not: the 0.1.7 records show :45 on the via-IR pair and :60 on the legacy pair.
     The report quoted the via-IR figure. Comparing like pipeline with like pipeline, the two
     sweeps agree exactly. Read the records, not the prose.

D-f. Finding 3 retested and unchanged. graph-horizon runs with
     EVM_DISABLE_MEMORY_SAFE_ASM_CHECK=1, and the RecurringCollector spill the 0.1.7 evaluation
     flagged is still there: 26 occurrences in the solx legacy log, the same count the 0.1.7
     document reports, alongside 58 memory-safe-assembly warnings. All 574 tests still pass on both
     sides. So the conclusion carries over verbatim, including its limit: no coverage was measured,
     so "no signal" still cannot be distinguished from "the flagged code was never reached".

D-l. aave legacy's improvement IS the compiler, established by a controlled A/B rather than
     inferred from the sweep. Identical 3,724,371-byte standard-JSON input, captured from the
     scenario with its own env applied, replayed through both binaries back to back on this host.
     Evidence in triage/binary-ab/.

     | binary | exit | peak RSS | wall | outcome |
     |---|--:|--:|--:|---|
     | 0.1.7 | 137 (SIGKILL) | 13.3 GiB | 45 s | killed, output truncated |
     | 0.1.8 | 0 | 10.8 GiB | 77 s | 355 contracts, 413 warnings, ZERO errors |

     Peak resident memory falls about 2.5 GiB, roughly 19%. On a 15.6 GiB host that is the
     difference between being killed and finishing. So the 0.1.7 evaluation's reading was right —
     a resource requirement rather than a compiler defect — and 0.1.8 reduced the requirement
     below this host's ceiling.

     It also independently reproduces the 0.1.7 triage: that report's claim of exit 137 on direct
     replay is confirmed on the same binary a day later.

     A first attempt at this A/B was invalid and is kept only as a lesson: the ad-hoc script did
     not merge the scenario's env, so EVM_DISABLE_MEMORY_SAFE_ASM_CHECK was unset and 0.1.8
     reported 22 memory-unsafe-assembly errors on an input the sweep never compiled. The memory
     figures from that run agreed with the corrected run, because both binaries still received
     byte-identical input, but the artifact counts were meaningless. Always merge
     scenario.definition.env when reproducing a harness run by hand.

D-n. -O1 OUTPUT DID NOT CHANGE. Byte-for-byte identical between 0.1.7 and 0.1.8, on every
     contract of every unit tested. Identical input replayed through both binaries, same host.

     | unit | contracts | 0.1.7 total deployed | 0.1.8 total deployed | delta |
     |---|--:|--:|--:|--:|
     | ens legacy | 62 | 72,805 B | 72,805 B | 0.00% |
     | ens via-IR | 62 | 83,364 B | 83,364 B | 0.00% |
     | uniswap legacy | 174 | 2,090,219 B | 2,090,219 B | 0.00% |

     298 contracts in total: 298 identical, 0 grew, 0 shrank, none present on only one side. So the
     answer to "did -O1 output shrink" is no — it did not move at all. Whatever changed between
     these releases, it was not the code generator's output for anything that compiles under both.

     What DID change is resource use, and substantially, on the same identical inputs:

     | unit | peak RSS 0.1.7 | peak RSS 0.1.8 | wall 0.1.7 | wall 0.1.8 |
     |---|--:|--:|--:|--:|
     | ens legacy | 515,592 KB | 429,976 KB | 1.78 s | 1.64 s |
     | ens via-IR | 393,952 KB | 396,968 KB | 4.53 s | 1.66 s |
     | uniswap legacy | 5,170,952 KB | 2,724,796 KB | 13.32 s | 7.86 s |
     | aave legacy | 13.3 GiB, SIGKILLed | 10.8 GiB, completed | 45 s | 77 s |

     uniswap legacy is the clearest case: peak resident memory roughly halves, 4.9 GiB to 2.6 GiB,
     and wall time falls by 41%, for identical output. That is the same mechanism that carried aave
     legacy from OOM-killed to a clean compile. ens via-IR shows memory flat and time cut to a
     third, so the improvement is not uniform in shape.

     Reported as a compile-stage observation, not a benchmark: n=1 per unit, one host, and the
     timing benchmark is a separate exercise with its own methodology.

D-m. The -O1 size question CANNOT be answered on aave, and the reason is structural rather than a
     gap in the method: 0.1.7 cannot complete that compile, so there is no 0.1.7 output to diff
     against. A size comparison needs a scenario both binaries can build. Running that on ens
     (both pipelines) and uniswap legacy instead.

D-e. Superseded by D-l and D-m. Original plan: answer whether -O1 output shrank between 0.1.7 and 0.1.8 without Hardhat in the
     loop: dump the standard-JSON input once, then feed the identical input to both the 0.1.7 and
     the 0.1.8 binary and diff deployedBytecode lengths per contract. The 0.1.7 binaries survive in
     the old clones under .solx/solx-v0.1.7. The input is compiler-independent, so this is a clean
     same-input comparison, and it is the only way to get artifact-derived 0.1.7 sizes: the 0.1.7
     clones kept only their control-side artifacts, because the control side ran last.

D-c. The two 0.1.7 control-only failures behaved differently on retest, and the split is the
     useful part. Both were attributed to solc in the 0.1.7 report without a mechanism.
     - openzeppelin solidity via-IR, BlockhashTest#testFuzzHistoryBlocks: REPRODUCED, byte for
       byte. Same counterexample calldata, same two assertion values. It is a fuzz test on the
       Solidity runner, which is seed-driven, and the seed is pinned to the same value in both
       sweeps. So this row is deterministic and the failure is a stable control-side property.
     - openzeppelin mocha via-IR, "MerkleTree > push > pushing to a full tree reverts": did NOT
       reproduce. Mocha is not driven by that seed.
     Read together: the seed-pinned Solidity-runner failure is reproducible, and the mocha one is
     not, which is what one would expect if the first is deterministic and the second intermittent.
     Neither is a solx observation. Neither has an established mechanism.
