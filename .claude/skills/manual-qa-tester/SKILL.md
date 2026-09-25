---
name: manual-qa-tester
description: Manually validate a feature branch through Hardhat commands in packages/example-project. Use for end-to-end QA or smoke testing. Requires a user-provided feature description, test branch, and base branch; ask for missing inputs. Records results in packages/example-project/scenarios/MANUAL_QA_TESTER_SCENARIO.md.
---

# Validate a feature branch as a user

## 1. Understand the change

Require the **feature description**, **test branch**, and **base branch** from the user; ask for missing inputs. The description defines intent: never reconstruct it from code or commits.

- Check out the test branch. `<base>` is the given base branch name with any `origin/` prefix removed; run `git fetch origin <base>`. Both branches must already carry the latest base changes, so stop and report unless both checks pass:
  - **Base is aligned with its remote:** only when the user gave a local branch name, `git rev-parse <base>` equals `git rev-parse origin/<base>`. Skip this check when they gave `origin/<base>`.
  - **Test branch is aligned with the base:** `git merge-base origin/<base> HEAD` equals `git rev-parse origin/<base>`. Otherwise the test branch is missing base commits and must be updated first.
- Use `git merge-base origin/<base> HEAD` for all comparisons and pre-change artifacts. If it equals `HEAD`, report that there is nothing to validate.
- If `packages/example-project/scenarios/` already exists, tell the user that the previous log and assets will be overwritten and continue only after they confirm; then remove the directory so the run starts empty.
- Without isolated planner contexts, do the spec-only pass in step 3 **before reading implementation, diff or commits**; disclose the lack of independent planning.
- Read `git diff <merge-base>...HEAD` and `git log --format=%B <merge-base>..HEAD`. Summarize affected CLI flags, config, tasks, output, and errors for the code-aware planners.
- Scope covers the description and adjacent regressions sharing its code paths. Stop and report a contradiction: the description and the commits assert opposite behavior. Record under **untested**, with a reason and without scenarios, diff changes outside the description's code paths. Description content the diff does not implement is never untested: it gets scenarios, runs, and fails as a `new-feature defect` (step 6).

## 2. Build

From `packages/example-project`, run:

```sh
pnpm build
pnpm hardhat --version
```

The build updates workspace dependencies' `dist/` output. If either command fails, stop and report the command and error. Do not repair it or assume an environment problem.

## 3. Plan scenarios

Use isolated contexts (sub-agents when available), without inherited implementation context or inter-planner discussion. Start them together when supported and **wait for every result**. Otherwise use separate passes, ordered as in step 1. Rerun failed planners or missing results.

Every planner gets the unchanged description, coverage list below, and execution context: a Hardhat 3 example project without a TTY. Each returns **purpose, commands, expected outcome, its basis** (description, public docs, verified merge-base behavior, or advisory prediction), and **the changed code path it exercises**, directly or as adjacent behavior sharing that path. The spec-only planner omits the code path; assign one from the diff when merging. When the diff has no code path for a description-based scenario, keep the scenario with `path: none (not implemented)`.

| Planner | When | Access and focus |
| --- | --- | --- |
| Hardhat expert | Always | Diff summary and changed code; config, plugins, tasks, CLI combinations, and observable assertions. |
| Ethereum/EVM expert | Chain, gas, hardfork, or network changes | Diff summary and changed code; chain behavior and adjacent regressions. |
| Security-minded contract owner | Execution or network changes | Diff summary and changed code; silent wrong results and edge-case correctness. |
| Spec-only | Exactly one for the whole feature | Public docs for general behavior and syntax; **no branch code, diff, commits, or tests**. The description overrides docs. |

Merge the lists:

- Repair commands; preserve expected outcomes and their basis. Never rewrite expectations to match results.
- Merge compatible duplicates without losing assertions. Keep incompatible expectations as separate scenarios; conflicting predictions alone do not establish a failure.
- Drop proposals that are outside scope, need unavailable hardware, credentials, or network access, or cannot fail. Also drop proposals that reach no changed code path, **unless their basis is the description**: those always run, since they catch promised behavior the branch does not implement. List them under **untested** with the reason, not as scenarios. Run all remaining scenarios.
- No scenario count limit. Cover every dimension below the changed code can reach; report the rest as N/A with the reason.

| Coverage | Include |
| --- | --- |
| Happy paths | Every major usage variant. |
| Config | On/off settings and edge values. |
| CLI | Flag combinations, defaults, overrides, and config conflicts. |
| Errors and edges | Invalid input, missing files, boundaries, empty state; assert error messages. |
| Regressions | Adjacent existing behavior sharing changed code paths. |
| Packaging | Changed exports or entry points: resolve the new surface from the branch build. Changed dependency ranges: exercise the newly allowed or disallowed version pair (step 4). |

## 4. Create assets

- **Files:** Keep assets, captured output, and temporary files under `packages/example-project/scenarios/`, grouped by scenario. Exceptions: normal example-project `cache/` and `artifacts/` directories when testing default paths. Keep scenario writes inside the repo or temporary worktrees. Copy build output into a scenario folder only when an assertion consumes it as input.
- **Imports:** Use workspace libraries' `dist/` paths; do not add dependencies. From `scenarios/<name>/x.mjs`, for example: `../../node_modules/hardhat/node_modules/@nomicfoundation/hardhat-utils/dist/src/eth.js`.
- **Global state:** Redirect every scenario command that accesses global state, including reads, into `scenarios/`, e.g. `XDG_CONFIG_HOME="$PWD/scenarios/<name>-home"`. Even a global-directory lookup can create it. Seed the sandbox by copying existing data if needed; never modify the real state. Capture any listing an assertion relies on, then delete the sandbox tree.
- **Pre-change runs:** Produce compatibility artifacts and merge-base output with pre-change code: `git worktree add <scratch-dir> <merge-base>`, then `pnpm install && pnpm build` there. Copy every artifact and captured run into the main checkout's `packages/example-project/scenarios/` before teardown (step 6).

## 5. Run and record

Run from `packages/example-project` using `pnpm hardhat <command>` or `pnpm hardhat run <script>`. Run **sequentially**: scenarios share cache and artifacts. Later unrelated errors do not invalidate proven assertions.

**Evidence:** Identify what each assertion needs before running. Each scenario folder keeps the exact command lines and the captured stdout and stderr of every run, branch and merge-base alike. A status requires its evidence on disk: a scenario without captured output counts as not attempted, and a merge-base comparison needs captures from both sides. Read each capture before recording a status; a capture lacking the command's expected output means the command did not run.

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

**Corrections:** When a run shows a scenario line describes something that does not exist or was not exercised, rewrite the line to what was actually exercised and set the status from the rewritten text; record the original wording and the reason under **corrections** (step 7). Do not keep the inaccurate line with an explanatory note. A correction may narrow what the scenario exercised, never drop an assertion the description states (step 3); an unmet assertion keeps ❌ and never becomes a divergence.

**Log:** Create `packages/example-project/scenarios/MANUAL_QA_TESTER_SCENARIO.md`. List all planned scenarios before running them; update after every scenario or small batch. Use sequential ids shared by the final report. Before an attempt, leave the box unchecked and omit the status emoji. Once attempted, check the box and place one status emoji immediately after the id; blocked scenarios count as run. For ❌ and ⛔ only, end the scenario line with a Markdown hard break (two spaces followed by a newline), then put `**Why it fails**` on the indented next line, starting with a step 6 label.

End each scenario line with the changed code path it exercises, as `— path: <module or file>`, or `— path: none (not implemented)` for description-based scenarios with no matching change. End the log with the step 7 **Untested**, **Corrections** and **Divergences** sections, so it stands alone.

This block illustrates the visible layout; its trailing spaces are omitted:

```text
- [ ] 1. Pending test **Test description**: what will be tested — path: src/internal/x.ts
- [x] 2. ✅ Passing test **Test description**: what was tested — path: src/internal/x.ts
- [x] 3. ❌ Failing test **Test description**: what was tested — path: src/internal/y.ts
      **Why it fails**: regression — one sentence.
- [x] 4. ⛔ Blocked test **Test description**: what could not be evaluated — path: src/internal/y.ts
      **Why it fails**: blocked — one sentence.
```

## 6. Triage and clean up

Investigate every ❌ against the merge-base using the same command and inputs, or equivalent underlying behavior. Prefer a worktree over a stash to preserve untracked assets. If running old code is impractical, label the failure `unclassified` and explain why; never classify from the diff alone.

| Label | Evidence required |
| --- | --- |
| `regression —` | Comparable existing behavior passes at the merge-base and fails on the branch. |
| `new-feature defect —` | Behavior absent at the merge-base is introduced by the branch and violates the description, or the description promises behavior that neither the branch nor the merge-base has. |
| `pre-existing —` | The **same defect** exists at the merge-base; a missing command or different error is insufficient. |
| `unclassified —` | Failure is established but its origin is unknown. Explain missing evidence; keep ❌. |
| `blocked —` | An obstacle prevents evaluation (⛔); no baseline comparison needed. |

Remove each worktree you created with `git worktree remove <scratch-dir>` as soon as it is no longer needed, including on early stops. Confirm none remain with `git worktree list`. Leave tracked files untouched and stage nothing: at the end `git status` reports no staged or modified tracked file, and nothing the run created outside `packages/example-project/scenarios/`. Revert any other modification.

## 7. Report

- Scenario table: id, purpose, PASS/FAIL/BLOCKED, plus totals.
- Failures: exact repro command, actual vs expected output, triage label, and comparison evidence or limitations.
- **Untested:** every item recorded as untested in steps 1 and 3, with reasons.
- **Corrections:** scenario lines rewritten after a run, with the original wording and the reason.
- **Divergences:** advisory differences only; requirement violations belong under failures.
- N/A coverage dimensions and any lack of independent planning.

Finish when all planned scenarios are attempted, failures and blockers are labeled, temporary worktrees are removed, and the report is delivered. Leave changes and artifacts uncommitted.
