<!-- cSpell:ignore aave -->

# Evidence: `aave-v4 / test solidity` run count

## Decision

`aave-v4 / test solidity` runs **17 times**. With the latest measured variance, 17 runs is a sound, margin-rich choice for the **10% alert limit in force today** and lands just short of a strict **5%** guarantee (which needs ~24); a 3% limit would need ~54.

## Method (same formula the `benchmark-run-sizing` skill uses)

A regression check compares a new commit's summary time to the previous one. Each summary is an average of `n` runs, so each carries relative noise `CV / √n`, and the comparison of two of them has noise:

```
σ_comparison = √2 · CV / √n
```

We size `n` so that noise stays well under the alert limit `L`, targeting `σ ≈ L / 3` (a real `L%` regression then sits ~3σ above noise):

```
n = ceil( 2 · (CV / σ_target)² )      σ_target = 3% (L=10%), 1.5% (L=5%), 1% (L=3%)
```

- **CV** = per-run standard deviation ÷ mean (the benchmark's intrinsic run-to-run noisiness; independent of `n`).

## Measured input

Two post-fuzz-reduction CI runs (self-hosted runner), `aave-v4 / test solidity`:

| run        | n   | mean runtime | CV        |
| ---------- | --- | ------------ | --------- |
| first      | 3   | 11.8 s       | 4.31%     |
| **second** | 17  | 11.8 s       | **5.17%** |

The **n = 17 run is the trustworthy estimate** (the n = 3 figure was a small sample that happened to land low). Runtime is stable at **~11.8 s/run**, down from ~82 s before the fuzz-iteration cut. For reference, the pre-change p95 was 9.74% on the heavier workload, and historical aave per-commit CV ranged 1.2–12.8%. Taking **CV ≈ 5.2%** as the working figure:

## Required runs at CV ≈ 5.17%

| alert limit | target σ | runs required | N = 17                          |
| ----------- | -------- | ------------- | ------------------------------- |
| 10% (today) | 3.0%     | 6             | ✅ ample (≈3× margin)           |
| 5%          | 1.5%     | 24            | ⚠️ short — σ@17 = 1.77% (~5.9%) |
| 3%          | 1.0%     | 54            | ❌ would need 54                |

At 17 runs the comparison noise is **σ = √2·5.17/√17 = 1.77%**, which keeps a real regression ~3σ clear of noise up to a **~5.9% limit** — comfortably inside today's 10% limit (which needs only ~6 runs), and just outside a strict 5%.

**Cost:** 17 × 11.8 s ≈ **3.3 min** (24 runs ≈ 4.7 min, 54 runs ≈ 10.6 min). For comparison, a 5% limit on the pre-fix 82 s workload needed ~85 runs ≈ 116 min — the fuzz reduction is what makes any of these cheap.

## Robustness

CV is still estimated from few commits, so here is the noise `N = 17` delivers across a plausible CV range, and which limits it satisfies:

| per-run CV% | σ at 17 runs | meets 10% (σ≤3) | meets 5% (σ≤1.5) | meets 3% (σ≤1) |
| --- | --- | --- | --- | --- |
| 3.00 | 1.03% | yes | yes | no |
| 4.00 | 1.37% | yes | yes | no |
| **5.17 (measured, n=17)** | **1.77%** | **yes** | **no** | no |
| 6.00 | 2.06% | yes | no | no |
| 8.70 | 2.98% | yes | no | no |
| 9.74 (old 82 s workload) | 3.34% | no | no | no |

Equivalently, the largest CV at which 17 runs still satisfies each limit:

| alert limit | 17 runs holds while CV ≤ |
| ----------- | ------------------------ |
| 10%         | **8.75%**                |
| 5%          | 4.37%                    |
| 3%          | 2.92%                    |

Reading this:

- **For the 10% limit in force today, 17 runs is safe for any CV up to 8.75%** — robust even if the true CV is ~1.7× the measured 5.17%. This is the binding guarantee until the threshold is actually tightened.
- **For a 5% limit, 17 runs is marginally short** at the measured CV (holds only while CV ≤ 4.37%; measured is 5.17%). A clean 5% guarantee needs ~24 runs.
- **For an eventual 3% limit**, 17 is well short (needs ~54).

## Recommendation

Keep **17 runs while the alert limit is 10%** — it is ~3× the runs that limit requires and stays safe across the full plausible CV range, at ~3 min. When the limit is tightened to **5%, raise to ~24** (≈4.7 min); for **3%, ~54** (≈10.6 min). Re-run the `benchmark-run-sizing` skill once several post-change commits exist to firm up the CV (currently ~5.2% from one full sample) before locking in the 5%/3% counts.
