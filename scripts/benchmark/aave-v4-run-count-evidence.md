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

Three post-fuzz-reduction CI runs (self-hosted runner), `aave-v4 / test solidity`:

| run        | n   | mean runtime | within-run CV |
| ---------- | --- | ------------ | ------------- |
| first      | 3   | 11.8 s       | 4.31%         |
| **second** | 17  | 11.8 s       | **5.17%**     |
| third      | 24  | 13.8 s       | 3.90%         |

The within-run CV is stable at **~5%** (p95 ≈ 5.1% across the three commits); the n = 17/24 runs are the trustworthy estimates. Per-run time is ~11.8–13.8 s, down from ~82 s before the fuzz-iteration cut. For reference, the pre-change p95 was 9.74% on the heavier workload, and historical aave per-commit CV ranged 1.2–12.8%. Taking **CV ≈ 5.17%** as the working figure:

## Why 24

At the measured CV = 5.17%, the required run counts are:

| alert limit | target σ | runs required | N = 24                            |
| ----------- | -------- | ------------- | --------------------------------- |
| 10% (today) | 3.0%     | 6             | ✅ ample (4× margin)              |
| **5%**      | **1.5%** | **24**        | ✅ **meets** — σ@24 = 1.49% (~5%) |
| 3%          | 1.0%     | 54            | ❌ would need 54                  |

So **24 is the 5%-limit count** for this benchmark. At 24 runs the comparison noise is **σ = √2·5.17/√24 = 1.49%**, just inside the 1.5% target, keeping a real regression ~3σ clear of noise up to a **~5.0% limit**. It also covers today's 10% limit with large margin, and stops short of the 54 a future 3% limit would need.

**Cost:** 24 × 11.8 s ≈ **4.7 min**. (For comparison, a 5% limit on the pre-fix 82 s workload needed ~85 runs ≈ 116 min — the fuzz reduction is what makes 24 runs cheap.)

## Caveats

**Within-run CV is near the 5% threshold.** 24 satisfies a 5% limit only while CV ≤ 5.20%, and the measured ~5.17% is right at that edge. If more commits firm the CV higher (e.g. the ~5.3% seen on the sibling `1inch`/`lido` test-solidity benchmarks), bump to ~25–26 (still well under 5 min). The 10% limit in force today is unaffected either way (it needs only ~6 runs).

**Between-run drift is the bigger risk, and no run count fixes it.** Across the three runs aave's _mean_ jumped +16.9% in run 3 (11.8 → 13.8 s) on the identical workload — a ~15σ move versus the within-run spread. Co-movement pins the cause as **environmental, not code**: every compile benchmark was flat to ≤ 0.2% across all three runs, while the rise was confined to the `test solidity` (EVM-execution) phase and scaled with how CPU/fuzz-bound each suite is (aave +16.9%, 1inch-swap-vm +6.1%, uniswap-v4 +4.4%, …; the I/O-bound lido/1inch-ccs didn't move). That points to transient CPU contention during the parallel test-execution phase. The CI alert compares means _across_ invocations, so this drift — not the within-run CV — is what would actually trip it, and it can swing far past even a 10% limit regardless of N. Stabilise it at the source before tightening: a dedicated/isolated benchmark runner (no concurrent jobs during the test phase), pinned CPU affinity / disabled turbo, or normalising each suite against an in-run reference.

## Recommendation

Use **24 runs** for the 5% rollout — the skill-recommended count at the measured CV (~5.1% p95 over three commits), ~4.7 min; nudge up 1–2 if the CV firms higher, or down toward the 10%-limit count (~6) if the threshold stays at 10%. But the prerequisite for trusting _any_ tightened limit on this benchmark is **stabilising the between-run environment** (see caveats): until the parallel test-execution phase runs without CPU contention, the run-to-run mean can drift enough to false-fire even at 10%, and adding runs will not help.
