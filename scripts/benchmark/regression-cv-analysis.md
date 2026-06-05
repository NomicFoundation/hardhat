<!-- cSpell:ignore Alchemy lidofinance uniswap aave -->

# Choosing benchmark run counts from observed variance

> Generated with the [`benchmark-run-sizing`](https://github.com/NomicFoundation/hardhat/pull/8370) skill, targeting the **5%** alert-limit rollout. The `aave-v4 / test solidity` row reflects the **post-fuzz-reduction** workload (its stale 82 s history is excluded); every other row is the full stored history.

## Purpose

Each regression benchmark runs a command several times and records the **average** time. CI flags a regression when a benchmark's average rises more than a set **alert limit** (today 10% but we plan to incrementally reduce it to 5%). Running more times gives a more stable average but costs CI time. This note derives, per benchmark, the **minimum run count** so that normal measurement noise stays comfortably below the alert limit.

## Notation

- **run** — one execution of a benchmark command.
- **mean** — the average time over a benchmark's runs (the number CI compares).
- **CV** (coefficient of variation) — run-to-run standard deviation ÷ mean, as a %. Measures intrinsic noisiness; independent of how many times we run.
- **σ** (sigma) — standard deviation of the _comparison_ between a new commit's mean and the previous commit's mean, as a %. This is the noise the alert sees.
- **p95** — 95th percentile: the value exceeded by only 1 in 20 commits.
- **alert limit (L)** — the % slowdown at which CI fails the build.

## Method and formulas

Two standard results (take as given):

1. **Standard error of the mean.** The average of _n_ independent measurements, each with relative spread CV, has relative spread **CV / √n**.
2. **Error propagation of a ratio.** If two independent values each have small relative spread, their ratio's relative spread is the square root of the sum of their squares.

A regression check compares two independent means (new vs old), each with spread CV/√n. By (1) then (2):

    σ = √2 · CV / √n

Targeting σ ≈ L/3 (so a real L% change sits ~3 standard deviations above noise):

| alert limit L | target σ |
| ------------- | -------- |
| 10%           | 3%       |
| 5%            | 1.5%     |
| 3%            | 1%       |

Solving for the run count:

    runs = ceil( 2 · (CV / target σ)² ),  minimum 2

We use the **95th-percentile CV** across commits (broken runs removed first), so the noise target holds on all but the noisiest commits — the ones that actually cause false alarms. Benchmarks marked _(provisional)_ have little history, so their figure is a small-sample estimate that will firm up over time.

## Benchmark variance and recommended runs

| benchmark | ~runtime (s) | p95 CV% | runs @sigma=3% | runs @sigma=1.5% | runs @sigma=1% |
| --- | --- | --- | --- | --- | --- |
| 1inch-aqua / cold compile | 9.3 | 0.31 | 2 | 2 | 2 |
| 1inch-aqua / warm compile | 0.5 | 0.68 | 2 | 2 | 2 |
| 1inch-aqua / test solidity | 0.6 | 0.75 | 2 | 2 | 2 |
| 1inch-cross-chain-swap / cold compile | 239.8 | 0.43 | 2 | 2 | 2 |
| 1inch-cross-chain-swap / warm compile | 0.6 | 0.61 | 2 | 2 | 2 |
| 1inch-cross-chain-swap / test solidity | 3.5 | 5.29 | 7 | 25 | 56 |
| 1inch-swap-vm / cold compile | 248.2 | 0.26 | 2 | 2 | 2 |
| 1inch-swap-vm / warm compile | 1.1 | 0.85 | 2 | 2 | 2 |
| 1inch-swap-vm / test solidity | 1.8 | 1.41 | 2 | 2 | 4 |
| aave-v4 / cold compile | 188.4 | 0.57 | 2 | 2 | 2 |
| aave-v4 / warm compile | 1.0 | 0.97 | 2 | 2 | 2 |
| aave-v4 / test solidity _(provisional, 2 commits)_ | 11.8 | 5.13 | 6 | 24 | 53 |
| ens-verifiable-factory / cold compile | 4.4 | 0.62 | 2 | 2 | 2 |
| ens-verifiable-factory / warm compile | 0.7 | 0.58 | 2 | 2 | 2 |
| ens-verifiable-factory / test solidity | 0.7 | 0.57 | 2 | 2 | 2 |
| lidofinance-dual-governance / cold compile | 53.0 | 0.47 | 2 | 2 | 2 |
| lidofinance-dual-governance / warm compile | 0.6 | 0.79 | 2 | 2 | 2 |
| lidofinance-dual-governance / test solidity | 22.6 | 5.24 | 7 | 25 | 55 |
| uniswap-v4-core / cold compile | 198.1 | 0.31 | 2 | 2 | 2 |
| uniswap-v4-core / warm compile | 1.1 | 0.93 | 2 | 2 | 2 |
| uniswap-v4-core / test solidity | 7.6 | 2.12 | 2 | 4 | 9 |
| uniswap-x / cold compile | 37.6 | 0.35 | 2 | 2 | 2 |
| uniswap-x / warm compile | 0.7 | 0.96 | 2 | 2 | 2 |
| uniswap-x / test solidity | 40.2 | 0.21 | 2 | 2 | 2 |

## Conclusion

Read for the **5% rollout** (the `runs @sigma=1.5%` column):

- **Almost everything is already at the floor.** 20 of 24 benchmarks need only 2 runs for a 5% limit; every compile benchmark is < 1% CV. The cost is concentrated entirely in the `test solidity` benchmarks.
- **Four benchmarks need more for 5%:** `1inch-cross-chain-swap → 25`, `lidofinance-dual-governance → 25`, `aave-v4 → 24`, `uniswap-v4-core → 4`. The whole suite at a 5% limit is ≈ 50 min of wall-clock.
- **aave-v4 was the blocker, and reducing CV was far cheaper than adding runs.** Cutting its fuzz iterations (1000 → 100) dropped per-run time ~7× (82 s → 11.8 s) and its p95 CV from 9.7% to ~5.1%, so its 5% count fell from ~85 runs (~116 min) to **24 runs (~4.7 min)**. This is exactly the `runs ∝ CV²` lever — fewer fuzz iterations — with the runtime cut compounding it. (Its 5.1% is provisional, from 2 post-change commits.) It currently runs **17** times, which is sized for the 10% limit in force today; raise it to **24** when the limit is tightened to 5%.
- **lido's 25-run cost is mostly an artifact** of intermittent live-mainnet-fork (Alchemy) RPC stalls — one run spiked to 61 s, which is also why its "~runtime" shows 22.6 s rather than its true ~3.3 s. Pinning the fork to a fixed block and serving it from an offline cache should collapse its CV toward the < 1% of its clean commits and return it to the floor, removing most of the remaining 5% cost.
- **A robust summary statistic was considered and rejected.** Reporting median/min instead of the mean only helps the outlier-driven suites, is worse for aave at its low run count, and `min` risks masking real regressions — so the reported value stays the **mean** and variance is cut at the source instead.

Net: with aave's workload reduced and lido's fork pinned offline, a **5% limit is affordable** — only `1inch-cross-chain-swap` and `aave-v4` would carry a non-floor count, each cheap per run.
