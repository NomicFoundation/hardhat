---
name: manual-qa-tester
description: Manually validate a feature branch through Hardhat commands in packages/example-project. Use for end-to-end QA or smoke testing. Requires a user-provided feature description, test branch, and base branch; ask for missing inputs. Records results in packages/example-project/scenarios/MANUAL_QA_TESTER_SCENARIO.md.
---

# Validate a feature branch as a user

## 1. Understand the change

Require the **feature description**, **test branch**, and **base branch** from the user; ask for missing inputs. The description defines intent: never reconstruct it from code or commits.

- Check out the test branch. Run `git fetch origin <base>`; if `git rev-parse <base>` and `git rev-parse origin/<base>` differ, stop and report that the local base branch is not aligned with its remote. Use `git merge-base origin/<base> HEAD` for all comparisons and pre-change artifacts. If it equals `HEAD`, report that there is nothing to validate.
- If `packages/example-project/scenarios/` already exists, tell the user that the previous log and assets will be overwritten and continue only after they confirm; then remove the directory so the run starts empty.
- Without isolated planner contexts, do the spec-only pass in step 3 **before reading implementation, diff or commits**; disclose the lack of independent planning.
- Read `git diff <merge-base>...HEAD` and `git log --format=%B <merge-base>..HEAD`. Summarize affected CLI flags, config, tasks, output, and errors for the code-aware planners.
- Scope covers the description and adjacent regressions sharing its code paths. Report unrelated changes as **untested**. Stop and report contradictions between the description and commits.

## 2. Build

From `packages/example-project`, run:

```sh
pnpm build
pnpm hardhat --version
```

The build updates workspace dependencies' `dist/` output. If either command fails, stop and report the command and error. Do not repair it or assume an environment problem.

## 3. Plan scenarios

Use isolated contexts (sub-agents when available), without inherited implementation context or inter-planner discussion. Start them together when supported and **wait for every result**. Otherwise use separate passes, ordered as in step 1. Rerun failed planners or missing results.

Every planner gets the unchanged description, coverage list below, and execution context: a Hardhat 3 example project without a TTY. Each returns **purpose, commands, expected outcome, and its basis** (description, public docs, verified merge-base behavior, or advisory prediction).

| Planner | When | Access and focus |
| --- | --- | --- |
| Hardhat expert | Always | Diff summary and changed code; config, plugins, tasks, CLI combinations, and observable assertions. |
| Ethereum/EVM expert | Chain, gas, hardfork, or network changes | Diff summary and changed code; chain behavior and adjacent regressions. |
| Security-minded contract owner | Execution or network changes | Diff summary and changed code; silent wrong results and edge-case correctness. |
| Spec-only | Exactly one for the whole feature | Public docs for general behavior and syntax; **no branch code, diff, commits, or tests**. The description overrides docs. |

Merge the lists:

- Repair commands; preserve expected outcomes and their basis. Never rewrite expectations to match results.
- Merge compatible duplicates without losing assertions. Keep incompatible expectations as separate scenarios; conflicting predictions alone do not establish a failure.
- Drop proposals outside scope or requiring unavailable hardware, credentials, or network access. List them under **untested**, not in the scenario log. Run all remaining scenarios.
- No scenario count limit. Cover every applicable dimension below; report others as N/A with a reason.

| Coverage | Include |
| --- | --- |
| Happy paths | Every major usage variant. |
| Config | On/off settings and edge values. |
| CLI | Flag combinations, defaults, overrides, and config conflicts. |
| Errors and edges | Invalid input, missing files, boundaries, empty state; assert error messages. |
| Regressions | Adjacent existing behavior sharing changed code paths. |

## 4. Create assets

- **Files:** Keep assets, captured output, and temporary files under `packages/example-project/scenarios/`, grouped by scenario. Exceptions: normal example-project `cache/` and `artifacts/` directories when testing default paths. Keep scenario writes inside the repo or temporary worktrees.
- **Imports:** Use workspace libraries' `dist/` paths; do not add dependencies. From `scenarios/<name>/x.mjs`, for example: `../../node_modules/hardhat/node_modules/@nomicfoundation/hardhat-utils/dist/src/eth.js`.
- **Global state:** Redirect every scenario command that accesses global state, including reads, into `scenarios/`, e.g. `XDG_CONFIG_HOME="$PWD/scenarios/<name>-home"`. Even a global-directory lookup can create it. Seed the sandbox by copying existing data if needed; never modify the real state.
- **Compatibility artifacts:** Generate them using pre-change code: `git worktree add <scratch-dir> <merge-base>`, then `pnpm install && pnpm build` there. Save generated artifacts into the main checkout's `packages/example-project/scenarios/`. Teardown follows step 6.

## 5. Run and record

Run from `packages/example-project` using `pnpm hardhat <command>` or `pnpm hardhat run <script>`. Run **sequentially**: scenarios share cache and artifacts. Identify the evidence needed for each assertion before running; later unrelated errors do not invalidate proven assertions.

Requirements come from the description and documented or verified existing behavior it does not intentionally change. Check suspected regressions against the merge-base before dismissing them as advisory differences.

| Result | Meaning |
| --- | --- |
| ✅ | Required assertions pass. Record differences from unsupported advisory predictions under **divergences**. |
| ❌ | A requirement is violated; classify it in step 6. |
| ⛔ | An external obstacle prevents evaluating required assertions. A branch error violating an assertion is a failure. |

**Prompts:** Pace stdin answers so each prompt is ready. Never mock or patch prompts. If a real TTY is required, mark the scenario blocked.

```sh
(printf 'pass\n'; sleep 1; printf 'pass\n'; sleep 1; printf 'value\n'; sleep 1) | pnpm hardhat keystore set KEY
```

**Log:** Create `packages/example-project/scenarios/MANUAL_QA_TESTER_SCENARIO.md`. List all planned scenarios before running them; update after every scenario or small batch. Use sequential ids shared by the final report. Before an attempt, leave the box unchecked and omit the status emoji. Once attempted, check the box and place one status emoji immediately after the id; blocked scenarios count as run. For ❌ and ⛔ only, end the scenario line with a Markdown hard break (two spaces followed by a newline), then put `**Why it fails**` on the indented next line, starting with a step 6 label.

This block illustrates the visible layout; its trailing spaces are omitted:

```text
- [ ] 1. Pending test **Test description**: what will be tested.
- [x] 2. ✅ Passing test **Test description**: what was tested.
- [x] 3. ❌ Failing test **Test description**: what was tested.
      **Why it fails**: regression — one sentence.
- [x] 4. ⛔ Blocked test **Test description**: what could not be evaluated.
      **Why it fails**: blocked — one sentence.
```

## 6. Triage and clean up

Investigate every ❌ against the merge-base using the same command and inputs, or equivalent underlying behavior. Prefer a worktree over a stash to preserve untracked assets. If running old code is impractical, use a targeted probe or the diff and disclose that limitation.

| Label | Evidence required |
| --- | --- |
| `regression —` | Comparable existing behavior passes at the merge-base and fails on the branch. |
| `new-feature defect —` | Behavior absent at the merge-base is introduced by the branch and violates the description. |
| `pre-existing —` | The **same defect** exists at the merge-base; a missing command or different error is insufficient. |
| `unclassified —` | Failure is established but its origin is unknown. Explain missing evidence; keep ❌. |
| `blocked —` | An obstacle prevents evaluation (⛔); no baseline comparison needed. |

Remove each worktree you created with `git worktree remove <scratch-dir>` as soon as it is no longer needed, including on early stops. Confirm none remain with `git worktree list`.

## 7. Report

- Scenario table: id, purpose, PASS/FAIL/BLOCKED, plus totals.
- Failures: exact repro command, actual vs expected output, triage label, and comparison evidence or limitations.
- **Untested:** dropped proposals and unrelated branch changes, with reasons.
- **Divergences:** advisory differences only; requirement violations belong under failures.
- N/A coverage dimensions and any lack of independent planning.

Finish when all planned scenarios are attempted, failures and blockers are labeled, temporary worktrees are removed, and the report is delivered. Leave changes and artifacts uncommitted.
