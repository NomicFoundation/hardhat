#!/usr/bin/env python3
"""Analyze Hardhat regression benchmark variance and recommend run counts.

Reads a github-action-benchmark `data.js` (`window.BENCHMARK_DATA = {...}`) -- or any
file containing that object / a pasted `benches` array -- and, per benchmark:
  * computes the per-commit coefficient of variation (CV) from each commit's run times,
  * removes extreme outliers (MAD modified z-score > 3.5),
  * takes the 95th-percentile CV,
  * recommends run counts for target sigma of 3%, 1.5%, 1%.

Prints one markdown table (all benchmarks) plus a data-driven Findings section.

Usage: python3 analyze.py [path-to-data.js]   (default: hardhat3/data.js)
"""
import sys, re, json, math, statistics
from collections import defaultdict

# --- tunables -------------------------------------------------------------------
# (label, target sigma %, corresponding alert limit %)
TARGETS = [("sigma=3%", 3.0, 10), ("sigma=1.5%", 1.5, 5), ("sigma=1%", 1.0, 3)]
OUTLIER_Z = 3.5          # MAD modified z-score cutoff
PERCENTILE = 95          # CV percentile used for sizing
MIN_RUNS = 2             # floor
PROVISIONAL_BELOW = 5    # commits below this => provisional estimate
# --------------------------------------------------------------------------------


def load(path):
    s = open(path).read()
    s = s[s.index("{"):].rstrip().rstrip(";")     # drop "window.BENCHMARK_DATA = " / trailing ;
    s = re.sub(r",(\s*[}\]])", r"\1", s)           # tolerate trailing commas
    return json.loads(s)


def percentile(xs, p):
    xs = sorted(xs)
    n = len(xs)
    if n == 1:
        return xs[0]
    i = p / 100 * (n - 1)
    lo = math.floor(i)
    hi = math.ceil(i)
    return xs[lo] + (xs[hi] - xs[lo]) * (i - lo)


def drop_outliers(xs):
    if len(xs) < 3:
        return xs
    med = statistics.median(xs)
    mad = statistics.median([abs(x - med) for x in xs])
    if mad == 0:
        return xs
    return [x for x in xs if abs(0.6745 * (x - med) / mad) <= OUTLIER_Z]


def runs_for(cv_pct, target_pct):
    if cv_pct <= 0:
        return MIN_RUNS
    return max(MIN_RUNS, math.ceil(2 * (cv_pct / target_pct) ** 2))


def collect(data):
    """Walk all benchmark groups, chronological order, gathering per-commit CV%."""
    cv = defaultdict(list)
    last_rt = {}
    if "entries" in data:
        iters = [e for lst in data["entries"].values() if isinstance(lst, list) for e in lst]
    elif "benches" in data:                        # pasted single commit
        iters = [data]
    else:
        iters = []
    for entry in iters:
        for b in entry.get("benches", []):
            try:
                t = json.loads(b["extra"])["times"]
            except Exception:
                t = []
            if not t:
                continue
            mean = statistics.mean(t)
            if mean <= 0:
                continue
            last_rt[b["name"]] = mean              # chronological => ends on latest
            if len(t) >= 2:
                cv[b["name"]].append(statistics.stdev(t) / mean * 100)
    return cv, last_rt


SUBORDER = [
    "cold compile",
    "edit & compile Solidity test with min",
    "edit & compile Solidity test with max",
    "edit & compile Solidity contract",
    "warm compile",
    "test solidity",
]


def sort_key(name):
    scenario, _, sub = name.partition(" / ")
    for i, p in enumerate(SUBORDER):
        if sub.startswith(p):
            return (scenario, i, sub)
    return (scenario, len(SUBORDER), sub)


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else "hardhat3/data.js"
    cv, last_rt = collect(load(path))

    rows = []
    for name, vals in cv.items():
        p95 = percentile(drop_outliers(vals), PERCENTILE)
        rec = [runs_for(p95, t) for _, t, _ in TARGETS]
        rows.append((name, last_rt.get(name, float("nan")), p95, len(vals), rec))
    rows.sort(key=lambda r: sort_key(r[0]))

    # --- table ---
    print("### Benchmark variance and recommended runs\n")
    print("| benchmark | ~runtime (s) | p95 CV% | runs @sigma=3% | runs @sigma=1.5% | runs @sigma=1% |")
    print("|---|---|---|---|---|---|")
    for name, rt, p95, nc, rec in rows:
        prov = f" *(provisional, {nc} commit{'' if nc == 1 else 's'})*" if nc < PROVISIONAL_BELOW else ""
        rts = "—" if rt != rt else f"{rt:.1f}"
        print(f"| {name}{prov} | {rts} | {p95:.2f} | {rec[0]} | {rec[1]} | {rec[2]} |")

    # --- findings (objective; the report's Conclusion is written from these) ---
    print("\n### Findings\n")

    def t_secs(rt, k):
        return 0.0 if rt != rt else k * rt

    for idx, (_label, _sigma, limit) in enumerate(TARGETS):
        need = sorted(
            ((r[0], r[4][idx]) for r in rows if r[4][idx] > MIN_RUNS),
            key=lambda x: -x[1],
        )
        total = sum(t_secs(r[1], r[4][idx]) for r in rows)
        base = sum(t_secs(r[1], MIN_RUNS) for r in rows)
        print(
            f"- **sigma={_sigma}% (alert limit ~{limit}%)**: "
            f"{len(rows) - len(need)}/{len(rows)} benchmarks sit at the floor of {MIN_RUNS}; "
            f"est. total ≈ {total / 60:.1f} min (vs {base / 60:.1f} min if all at floor)."
        )
        if need:
            print("    - above floor: " + ", ".join(f"{n} → {k}" for n, k in need))


if __name__ == "__main__":
    main()
