<!-- cSpell:ignore Alchemy lidofinance uniswap aave testFuzz CDF -->

# Regression-benchmark variance: root causes and how to afford a tighter alert limit

## Why this exists

The regression benchmark (`scripts/benchmark/regression.ts`, `.github/workflows/regression-benchmark.yml`) runs each command N times and records a summary time. CI fails a PR when a benchmark rises past the **alert limit** (today `110%`, i.e. +10%). We want to tighten that toward **5%** and eventually **3%**.

The run count needed to keep measurement noise under the limit grows with the **square** of a benchmark's per-run coefficient of variation (CV):

```
sigma_comparison ≈ √2 · CV / √runs        runs ≈ 2 · (CV / sigma_target)²,  sigma_target ≈ limit / 3
```

So halving a benchmark's CV quarters the runs it needs — reducing CV is far cheaper than adding runs. This note finds where the variance comes from and what actually moves the needle.

## Method

- Variance/run-sizing numbers come from the **`benchmark-run-sizing`** skill's `analyze.py`, run against the stored history (`nomic-foundation-automation/hardhat-benchmark-results`, `hardhat3/data.js`). It computes each benchmark's p95 per-commit CV (broken runs dropped via a MAD filter) and the runs each alert limit needs.
- Two supplementary analyses were run over the same history's per-run `times` to evaluate the **summary-statistic** lever (mean vs median vs min):
  1. a per-commit **bootstrap** of each statistic's standard error → an effective CV, fed through the skill's exact sizing formula;
  2. the **realized false-alarm count**: replaying github-action-benchmark's own comparison (consecutive-commit _increase_ > limit) across the history under each statistic. This is what CI actually does, so it is the ground truth for "how often would this have falsely failed a PR".

## Baseline (mean, today's reported value)

Everything except four `test solidity` benchmarks sits at the run-count floor of 2, even for a 3% limit. The cost is entirely concentrated here:

| benchmark | ~runtime (s) | p95 CV% | runs @5% | runs @3% |
| --- | --- | --- | --- | --- |
| aave-v4 / test solidity | 82.0 | 9.74 | 85 | 190 |
| 1inch-cross-chain-swap / test solidity | 3.5 | 5.29 | 25 | 56 |
| lidofinance-dual-governance / test solidity | 22.6 | 5.24 | 25 | 55 |
| uniswap-v4-core / test solidity | 7.6 | 2.12 | 4 | 9 |

`aave-v4 / test solidity` alone (≈82 s/run × 85 runs) makes a 5% limit cost well over an hour.

## Root cause of each noisy benchmark

The per-run times reveal the **shape** of the noise, which decides what helps:

| benchmark | example run times (s) | shape | source |
| --- | --- | --- | --- |
| aave-v4 | `75.2, 76.7, 94.0` | broad spread, n=3 | wall-clock jitter on a big **deterministic** fuzz workload |
| 1inch | `3.5 ×7, 3.9, 4.8` | tight + rare slow run | occasional slow run; ~3.5 s base magnifies it in % |
| lido | `3.2, 3.3, 61.1` | catastrophic outlier | **live mainnet fork (Alchemy) RPC stall** |
| uniswap-v4 | `7.5, 7.5, 7.6, 7.6, 7.7, 7.7, 7.7` | tight, symmetric | already fine |

Key facts established from the projects' configs and the Hardhat source:

- **Fuzz inputs are not a source of variance.** Hardhat pins a default fuzz seed (`DEFAULT_FUZZ_SEED` in `packages/hardhat/.../solidity-test/config.ts`); aave and uniswap also pin their own (`0x640`, `0x4444`). So fuzz _inputs_ are identical run-to-run — the variance is execution-time jitter, not randomized inputs. (This refutes the "randomized fuzz" hypothesis.) There is **no env/CLI knob** for fuzz runs/seed — only the project config sets them.
- **Only lido forks the network.** Its scenario sets `MAINNET_RPC_URL = ${localEnv:ALCHEMY_URL}`; the others do not fork. Lido's 61 s spike landed on the _last_ of its three runs (not the first), so it is a **mid-run transient RPC stall**, not a cold-cache start effect. That single spike is why the table reports lido's "~runtime" as 22.6 s when its true time is ~3.3 s.
- **aave is the cost driver and forks nothing.** Its ~10% CV is pure wall-clock jitter on an 82 s, 1000-iteration-per-test fuzz run.

## The summary-statistic lever (mean vs median vs min)

Switching the reported `value` from the mean to a robust statistic was the cheapest hypothesized lever. The data shows it is **real but partial**, and not the clean win it first appears.

**Realized false alarms** (consecutive-commit increases over the limit, summed across the four noisy benchmarks — lower is better):

| limit | mean | median | min    |
| ----- | ---- | ------ | ------ |
| > 5%  | 8    | 11     | 9      |
| > 3%  | 18   | 22     | **12** |

Worst single increase, lido: **mean 607%** → median 18% → min 19%.

What this means:

- **`min`** gives the lowest false-alarm rate at a tight limit and nearly eliminates them on the outlier-driven suites (1inch 3→0, lido 7→2, uniswap 1→0 at the 3% limit). Downsides: it reports best-case time, so it can **mask a regression** that raises the typical/tail time without raising the floor; and it is sensitive to run count.
- **`median`** kills the catastrophic outlier (lido's 607% → 18%) without best-case bias, but at n=3 (aave, lido) it is itself a noisy estimator, so it _adds_ marginal small flags and is the worst by raw count. The bootstrap confirms this: at n=3, median/min need _more_ runs than the mean to hit the same sigma target.
- **No statistic helps aave-v4.** Its noise is broad and symmetric at n=3, exactly the case where the mean is optimal and robust statistics are worse.

Conclusion: a global statistic swap trades the expensive aave benchmark for the cheap ones, and `min`'s gains come with a regression-masking risk. It is not the right primary lever. **The reported `value` is therefore left as the mean**, and the variance is attacked at its source instead.

## What was changed, and what is recommended

### Implemented: cut aave-v4's benchmark fuzz workload (the cost driver)

`end-to-end/aave-v4/preinstall.sh` reduces the Solidity-test fuzz iterations (`fuzz.runs` 1000 → 100) on the cloned project before the benchmark runs, wired in via `"preinstall"` in `end-to-end/aave-v4/scenario.json`.

Rationale: the seed is pinned, so fewer iterations exercise the same code deterministically while slashing the per-run time. Even if the CV is unchanged, the affordability math is transformed — the ~57–85 runs a 5% limit needs cost minutes instead of >1 hour once each run drops from ~82 s to a fraction of that. This is a **benchmark-only workload reduction**: it produces a one-time step in this entry's stored series (the series continues — github-action-benchmark keys on the benchmark _name_, which is unchanged). `FUZZ_RUNS` in the script is the tuning knob.

_Verification:_ the patch was checked against the pinned commit's real `hardhat.config.ts` (it edits exactly the `fuzz.runs` value and nothing else, and fails loudly if the expected marker is gone). The end-to-end CV/runtime effect must be confirmed by a CI run on a self-hosted runner — it cannot be measured in a sandbox without the network fork, Verdaccio, and the external clone.

### Recommended (needs a CI run to verify)

- **lido — pin the fork block and serve it offline.** The 607% catastrophe is a live-RPC stall. Pinning the fork to a fixed mainnet block and pre-populating a complete on-disk fork cache (so no timed run hits Alchemy) removes the stalls at the source and should collapse the CV to the ~0.1–1% seen on its clean commits — making even the mean stable at the floor. This requires patching the project's fork setup, so it is left as a follow-up rather than an unverified blind patch.
- **1inch — already cheap.** 3.5 s/run; the occasional slow run is the only issue. Leave as-is, or pin a fork block if it forks.
- **uniswap-v4 — leave it.** p95 CV 2.1%, 4 runs @5% / 9 @3%; not worth touching.
- **Compile/edit benchmarks — leave at the floor of 2.** All are < 1% CV.

## Is 5% / 3% affordable?

- For **1inch, lido (post fork-pin), and uniswap**: yes — small runtimes mean even the runs a 3% limit needs cost only minutes.
- For **aave-v4**: it was the blocker, and no statistic swap rescues it. The fuzz-workload reduction makes its required runs **affordable** (cheap per-run) even though it stays above the run-count floor. Hitting the "≤ ~5 runs" ideal for aave additionally needs its CV down near ~2.4% (5%) / ~1.5% (3%); whether the lighter workload reaches that is the open question a CI run must answer.

Net: with aave's workload cut and lido's fork pinned, a **5% limit becomes affordable**, and **3%** is within reach pending the measured post-change CVs.
