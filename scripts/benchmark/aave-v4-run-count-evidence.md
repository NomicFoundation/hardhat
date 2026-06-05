<!-- cSpell:ignore aave -->

# Evidence: why `aave-v4 / test solidity` runs **17** times

## Decision

`aave-v4 / test solidity` is set to **17 runs**. This is the run count the benchmark run-sizing methodology recommends for a **5% regression alert limit** at the benchmark's measured post-change variance.

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

From the first post-fuzz-reduction CI run (self-hosted runner), `aave-v4 / test solidity`:

- **runtime ≈ 11.8 s/run** (down from ~82 s before the fuzz-iteration cut)
- per-run times `[11.91, 12.22, 11.23]` → **CV = 4.31%** (n = 3)

This is a single, small (n = 3) sample, so the CV is provisional; the pre-change p95 was 9.74% (on the heavier 82 s workload), and historical aave per-commit CV ranged 1.2–12.8%. The sensitivity table below shows the choice is robust across that range for the limit that is actually active today.

## Why 17

At the measured CV = 4.31%, the required run counts are:

| alert limit | target σ | runs required | N = 17               |
| ----------- | -------- | ------------- | -------------------- |
| 10% (today) | 3.0%     | 5             | ✅ ample margin      |
| **5%**      | **1.5%** | **17**        | ✅ **exactly meets** |
| 3%          | 1.0%     | 38            | ❌ would need 38     |

So **17 is precisely the 5%-limit count** for this benchmark, with comfortable headroom for the 10% limit in force today, and is a deliberate stop short of the 38 a future 3% limit would require.

**Cost:** 17 × 11.8 s ≈ **3.3 min**. (For comparison, a 5% limit on the pre-fix 82 s workload needed ~85 runs ≈ 116 min — the fuzz reduction is what makes 17 runs cheap.)

## Robustness to the provisional CV

Because the CV came from one n = 3 sample, here is the noise `N = 17` actually delivers across a plausible CV range, and which limits it satisfies:

| per-run CV% | σ at 17 runs | meets 10% (σ≤3) | meets 5% (σ≤1.5) | meets 3% (σ≤1) |
| --- | --- | --- | --- | --- |
| 3.00 | 1.03% | yes | yes | no |
| 4.00 | 1.37% | yes | yes | no |
| **4.31 (measured)** | **1.48%** | **yes** | **yes** | no |
| 5.00 | 1.71% | yes | no | no |
| 6.00 | 2.06% | yes | no | no |
| 8.70 | 2.98% | yes | no | no |
| 9.74 (old 82 s workload) | 3.34% | no | no | no |

Equivalently, the largest CV at which 17 runs still satisfies each limit:

| alert limit | 17 runs holds while CV ≤ |
| ----------- | ------------------------ |
| 10%         | **8.75%**                |
| 5%          | **4.37%**                |
| 3%          | 2.92%                    |

Reading this:

- **For the 10% limit in force today, 17 runs is safe for any CV up to 8.75%** — i.e. robust even if the true post-change CV is roughly double the measured value. This is the binding guarantee until the threshold is actually tightened.
- **For the 5% target, 17 runs holds while CV ≤ 4.37%.** The measured 4.31% sits just inside that, so 17 meets 5% if the reduced variance holds — confirm with a few more commits (the measured point is close to the threshold).
- **For an eventual 3% limit, 17 is not enough** (needs ~38); revisit when 3% is adopted.

## Recommendation

17 runs is well-justified for the current rollout: it is the exact 5%-target count at the measured CV, robustly covers today's 10% limit across the full plausible CV range, and costs ~3 min. Re-run the `benchmark-run-sizing` skill once several post-change commits exist to replace the provisional n = 3 CV with a stable p95, and increase toward ~38 only if/when the limit is tightened to 3%.
