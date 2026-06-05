<!-- cSpell:ignore aave -->

# Evidence: `aave-v4 / test solidity` runs **24** times

## Decision

`aave-v4 / test solidity` runs **24 times** — the count the run-sizing methodology recommends for a **5% regression alert limit** at the benchmark's measured post-change variance.

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

The **n = 17 run is the trustworthy estimate** (the n = 3 figure was a small sample that happened to land low). Runtime is stable at **~11.8 s/run**, down from ~82 s before the fuzz-iteration cut. For reference, the pre-change p95 was 9.74% on the heavier workload, and historical aave per-commit CV ranged 1.2–12.8%. Taking **CV ≈ 5.17%** as the working figure:

## Why 24

At the measured CV = 5.17%, the required run counts are:

| alert limit | target σ | runs required | N = 24                            |
| ----------- | -------- | ------------- | --------------------------------- |
| 10% (today) | 3.0%     | 6             | ✅ ample (4× margin)              |
| **5%**      | **1.5%** | **24**        | ✅ **meets** — σ@24 = 1.49% (~5%) |
| 3%          | 1.0%     | 54            | ❌ would need 54                  |

So **24 is the 5%-limit count** for this benchmark. At 24 runs the comparison noise is **σ = √2·5.17/√24 = 1.49%**, just inside the 1.5% target, keeping a real regression ~3σ clear of noise up to a **~5.0% limit**. It also covers today's 10% limit with large margin, and stops short of the 54 a future 3% limit would need.

**Cost:** 24 × 11.8 s ≈ **4.7 min**. (For comparison, a 5% limit on the pre-fix 82 s workload needed ~85 runs ≈ 116 min — the fuzz reduction is what makes 24 runs cheap.)

## Caveat

The CV is provisional (one full n = 17 sample), and 24 sits **essentially on the 5% threshold**: 24 runs satisfies a 5% limit only while CV ≤ 5.20%, and the measured 5.17% is right at that edge. If a few more post-change commits firm the CV up to e.g. the ~5.3% seen on the sibling `1inch`/`lido` test-solidity benchmarks, bump to ~25–26 (still well under 5 min). The 10% limit in force today is unaffected either way (it needs only ~6 runs).

## Recommendation

Use **24 runs** for the 5% rollout — the skill-recommended count at the measured CV, ~4.7 min. Re-run the `benchmark-run-sizing` skill once several post-change commits exist to confirm the CV (currently ~5.17% from one full sample); nudge the count up by 1–2 if it firms higher, or down toward the 10%-limit count (~6) if the threshold stays at 10%.
