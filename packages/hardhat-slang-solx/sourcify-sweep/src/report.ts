import fs from "node:fs";
import { parseArgs } from "node:util";

interface LegResult {
  status: string;
  wallS: number;
  hhe?: string;
  errorTail?: string[];
}

interface SweepRecord {
  file: string;
  chainId: number;
  nSources: number;
  sourceBytes: number;
  evm: string;
  outcome: string;
  solx: LegResult;
  solc?: LegResult;
}

const { values: args } = parseArgs({
  options: {
    results: { type: "string", default: "sourcify-sweep-results.jsonl" },
    "top-failures": { type: "string", default: "20" },
  },
});

const records: SweepRecord[] = fs
  .readFileSync(args.results, "utf8")
  .split("\n")
  .filter((l) => l.trim() !== "")
  .map((l) => JSON.parse(l) as SweepRecord);

function percentile(sorted: number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

/** Groups failures by their most distinctive error line. */
function signature(record: SweepRecord): string {
  const tail = record.solx.errorTail ?? [];
  const errorLine = tail.find((l) => l.includes("Error")) ?? tail[0] ?? "?";
  const prefix = record.solx.hhe === undefined ? "" : `${record.solx.hhe}: `;
  // Strip paths and addresses so identical failures group together.
  return (
    prefix +
    errorLine
      .replaceAll(/"[^"]*"/g, '"..."')
      .replaceAll(/\/[^ ]+/g, "<path>")
      .slice(0, 140)
  );
}

const byOutcome = new Map<string, SweepRecord[]>();
for (const record of records) {
  const list = byOutcome.get(record.outcome) ?? [];
  list.push(record);
  byOutcome.set(record.outcome, list);
}

console.log(`# Sourcify sweep report\n`);
console.log(`Total contracts: ${records.length}\n`);
console.log(`| Outcome | Count | Share |`);
console.log(`|---|---|---|`);
for (const [outcome, list] of [...byOutcome.entries()].sort(
  (a, b) => b[1].length - a[1].length,
)) {
  const share = ((100 * list.length) / records.length).toFixed(2);
  console.log(`| ${outcome} | ${list.length} | ${share}% |`);
}

const okWalls = (byOutcome.get("ok") ?? [])
  .map((r) => r.solx.wallS)
  .sort((a, b) => a - b);
if (okWalls.length > 0) {
  console.log(
    `\nsolx wall time (ok): median ${percentile(okWalls, 0.5)}s, ` +
      `p90 ${percentile(okWalls, 0.9)}s, p99 ${percentile(okWalls, 0.99)}s, ` +
      `max ${okWalls[okWalls.length - 1]}s, ` +
      `total ${Math.round(okWalls.reduce((a, b) => a + b, 0))}s`,
  );
}

for (const outcome of [
  "solx-only-fail",
  "timeout",
  "solx-unsupported",
  "harness-fail",
]) {
  const list = byOutcome.get(outcome) ?? [];
  if (list.length === 0) {
    continue;
  }
  console.log(`\n## ${outcome} (${list.length})\n`);
  const groups = new Map<string, SweepRecord[]>();
  for (const record of list) {
    const sig = signature(record);
    const group = groups.get(sig) ?? [];
    group.push(record);
    groups.set(sig, group);
  }
  for (const [sig, group] of [...groups.entries()].sort(
    (a, b) => b[1].length - a[1].length,
  )) {
    const examples = group
      .slice(0, 3)
      .map((r) => r.file)
      .join(", ");
    console.log(`- ${group.length}x \`${sig}\`\n  e.g. ${examples}`);
  }
  const top = Number(args["top-failures"]);
  if (outcome === "solx-only-fail") {
    console.log(`\nFirst ${Math.min(top, list.length)} with error tails:\n`);
    for (const record of list.slice(0, top)) {
      console.log(`### ${record.file} (chain ${record.chainId})`);
      console.log("```");
      console.log((record.solx.errorTail ?? []).join("\n"));
      console.log("```");
    }
  }
}
