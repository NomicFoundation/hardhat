---
name: benchmark-run-sizing
description: >-
  Analyzes the Hardhat regression benchmark history (the hardhat-benchmark-results
  repo's data.js) and recommends how many times each benchmark should run. It reads
  every commit's individual run times, computes each benchmark's per-commit
  coefficient of variation, removes outliers, takes the 95th-percentile CV, and sizes
  run counts for target noise levels (sigma = 3%, 1.5%, 1%, i.e. regression alert
  limits of 10% / 5% / 3%). Use when asked to right-size benchmark run counts, justify
  or revisit run counts, assess benchmark variance/noise, or decide whether to add or
  remove runs after changing the regression alert threshold.
allowed-tools: Bash(git clone *), Bash(git -C *), Bash(python3 *)
---

# Benchmark run sizing

Reproduces the run-count analysis for the Hardhat regression benchmarks from their
stored history, and emits a copy-ready markdown report.

## Steps

1. **Fetch the data.** Clone (or pull) the results repo and locate `hardhat3/data.js`:

   ```bash
   dir=$(mktemp -d)
   git clone --depth 1 https://github.com/nomic-foundation-automation/hardhat-benchmark-results.git "$dir"
   ```

   (If the user gives a local path or a pasted `benches` array instead, skip the clone
   and point the script at that file.)

2. **Run the analysis script** against the data file:

   ```bash
   python3 ${CLAUDE_SKILL_DIR}/scripts/analyze.py "$dir/hardhat3/data.js"
   ```

   It prints one markdown table (every benchmark, sorted by scenario then command type)
   followed by a **Findings** section. Benchmarks with fewer than 5 commits of history
   are marked *(provisional)* — their CV is a small-sample estimate.

3. **Assemble the report.** Output the template below verbatim, inserting the script's
   table where indicated. Then write the **Conclusion from the Findings the script
   produced** — do not recompute numbers by hand, and do not assert anything the data
   doesn't show. Useful angles to cover *if the data supports them*: which command
   types are stable enough to sit at the run-count floor, where any extra runs are
   concentrated (and on which scenarios), how the cost grows as the target tightens,
   and — since `runs ∝ CV²` — whether reducing a noisy benchmark's CV (e.g. pinned/
   replayed RPC, fewer fuzz iterations, or reporting median/min of runs) is cheaper than
   adding runs. Keep it to a few bullets.

## Method (what the script does)

- For each benchmark, for each commit, CV = stdev(times) / mean(times) of that commit's
  own runs (commits with < 2 runs are skipped).
- Extreme outliers are removed per benchmark (MAD modified z-score > 3.5) to drop
  broken runs.
- The **95th-percentile CV** of the remaining per-commit values is the sizing input
  (conservative: meets the noise target on all but the noisiest ~1-in-20 commits).
- `runs = max(2, ceil(2 · (CV / target σ)²))`. Targets σ = 3% / 1.5% / 1% correspond to
  alert limits 10% / 5% / 3% via σ ≈ limit / 3.
- `~runtime` is the mean run time from the most recent commit.

To change targets, the outlier rule, the percentile, or the floor, edit the constants
at the top of `scripts/analyze.py`.

## Report template

> Replace `<<< INSERT TABLE >>>` with the script's table, and write the Conclusion from
> the script's Findings section (see step 3).

```markdown
# Choosing benchmark run counts from observed variance

## Purpose

Each regression benchmark runs a command several times and records the **average**
time. CI flags a regression when a benchmark's average rises more than a set
**alert limit** (today 10% but we plan to incrementally reduce it to 5%). Running
more times gives a more stable average but costs CI time. This note derives, per
benchmark, the **minimum run count** so that normal measurement noise stays
comfortably below the alert limit.

## Notation

- **run** — one execution of a benchmark command.
- **mean** — the average time over a benchmark's runs (the number CI compares).
- **CV** (coefficient of variation) — run-to-run standard deviation ÷ mean, as a %.
  Measures intrinsic noisiness; independent of how many times we run.
- **σ** (sigma) — standard deviation of the *comparison* between a new commit's mean
  and the previous commit's mean, as a %. This is the noise the alert sees.
- **p95** — 95th percentile: the value exceeded by only 1 in 20 commits.
- **alert limit (L)** — the % slowdown at which CI fails the build.

## Method and formulas

Two standard results (take as given):

1. **Standard error of the mean.** The average of *n* independent measurements, each
   with relative spread CV, has relative spread **CV / √n**.
2. **Error propagation of a ratio.** If two independent values each have small relative
   spread, their ratio's relative spread is the square root of the sum of their squares.

A regression check compares two independent means (new vs old), each with spread
CV/√n. By (1) then (2):

    σ = √2 · CV / √n

Targeting σ ≈ L/3 (so a real L% change sits ~3 standard deviations above noise):

| alert limit L | target σ |
|---|---|
| 10% | 3% |
| 5%  | 1.5% |
| 3%  | 1% |

Solving for the run count:

    runs = ceil( 2 · (CV / target σ)² ),  minimum 2

We use the **95th-percentile CV** across commits (broken runs removed first), so the
noise target holds on all but the noisiest commits — the ones that actually cause
false alarms. Benchmarks marked *(provisional)* have little history, so their figure
is a small-sample estimate that will firm up over time.

## Benchmark variance and recommended runs

<<< INSERT TABLE >>>

## Conclusion

<<< WRITE FROM THE SCRIPT'S FINDINGS — see skill step 3 >>>
```
