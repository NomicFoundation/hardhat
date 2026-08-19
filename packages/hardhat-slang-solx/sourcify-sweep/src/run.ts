import type { CorpusContract } from "./generate.js";

import { execFile } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";

import { generateFixture } from "./generate.js";

const SWEEP_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PLUGIN_ROOT = path.dirname(SWEEP_ROOT);

interface LegResult {
  status: "ok" | "fail" | "timeout";
  wallS: number;
  hhe?: string;
  errorTail?: string[];
  /** Full stderr matched a documented solx limitation. */
  unsupported?: boolean;
}

interface CompareResult {
  status: "match" | "mismatch" | "skipped";
  /** Contracts checked (present in both outputs). */
  checked?: number;
  /** "<source>:<Contract>: <field>" per divergence, plus set differences. */
  mismatches?: string[];
}

interface SweepRecord {
  file: string;
  chainId: number;
  nSources: number;
  sourceBytes: number;
  evm: string;
  outcome:
    | "ok"
    | "solx-only-fail"
    | "output-mismatch"
    | "solx-unsupported"
    | "harness-fail"
    | "timeout";
  solx: LegResult;
  solc?: LegResult;
  compare?: CompareResult;
}

/**
 * Documented, intentional solx limitations: contracts hitting these are
 * expected failures (`solx-unsupported`), not regressions.
 */
const SOLX_UNSUPPORTED_PATTERNS = [
  // SELFDESTRUCT, CALLCODE, PC, BLOBHASH, BLOBBASEFEE, ... - solx phrases all
  // of its intentional instruction rejections this way.
  /The `[A-Z0-9]+` instruction is not supported/,
  /memory-unsafe assembly block and a stack-too-deep error/,
];

const { values: args } = parseArgs({
  options: {
    corpus: { type: "string", default: path.join(SWEEP_ROOT, "fixtures") },
    out: { type: "string", default: "sourcify-sweep-results.jsonl" },
    concurrency: {
      type: "string",
      default: String(Math.max(1, os.cpus().length - 2)),
    },
    "shard-count": { type: "string", default: "1" },
    "shard-index": { type: "string", default: "0" },
    "timeout-s": { type: "string", default: "300" },
    limit: { type: "string" },
    // Also build every contract with stock solc and diff the frontend-derived
    // outputs (abi, storageLayout, methodIdentifiers): solx embeds a forked
    // solc frontend, so any divergence is a bug. Roughly doubles the runtime.
    compare: { type: "boolean", default: false },
    workdir: {
      type: "string",
      default: path.join(os.tmpdir(), "slang-solx-sourcify-sweep"),
    },
  },
});

const timeoutMs = Number(args["timeout-s"]) * 1000;

function setUpToolchain(): { toolchain: string; hardhatBin: string } {
  const require = createRequire(path.join(PLUGIN_ROOT, "package.json"));
  const hardhatDir = path.dirname(require.resolve("hardhat/package.json"));
  const toolchain = path.join(args.workdir, "toolchain");
  fs.rmSync(toolchain, { recursive: true, force: true });
  fs.mkdirSync(path.join(toolchain, "@nomicfoundation"), { recursive: true });
  fs.symlinkSync(hardhatDir, path.join(toolchain, "hardhat"));
  fs.symlinkSync(
    PLUGIN_ROOT,
    path.join(toolchain, "@nomicfoundation", "hardhat-slang-solx"),
  );
  const hardhatBin = path.join(hardhatDir, "dist", "src", "cli.js");
  if (!fs.existsSync(hardhatBin)) {
    console.error(
      `${hardhatBin} not found - build the workspace first (pnpm build)`,
    );
    process.exit(1);
  }
  return { toolchain, hardhatBin };
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (typeof value === "object" && value !== null) {
    return `{${Object.entries(value)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

const COMPARED_FIELDS = ["abi", "storageLayout", "methodIdentifiers"] as const;

/** Frontend-derived outputs per "<source>:<Contract>" from the build info. */
function extractOutputs(project: string): Map<string, Record<string, string>> {
  const buildInfoDir = path.join(project, "artifacts", "build-info");
  const result = new Map<string, Record<string, string>>();
  for (const file of fs.readdirSync(buildInfoDir)) {
    if (!file.endsWith(".output.json")) {
      continue;
    }
    const output = JSON.parse(
      fs.readFileSync(path.join(buildInfoDir, file), "utf8"),
    ) as {
      output: {
        contracts?: Record<string, Record<string, Record<string, unknown>>>;
      };
    };
    for (const [source, contracts] of Object.entries(
      output.output.contracts ?? {},
    )) {
      for (const [name, contract] of Object.entries(contracts)) {
        const evm = contract.evm as { methodIdentifiers?: unknown } | undefined;
        result.set(`${source}:${name}`, {
          abi: stableStringify(contract.abi),
          storageLayout: stableStringify(contract.storageLayout),
          methodIdentifiers: stableStringify(evm?.methodIdentifiers),
        });
      }
    }
  }
  return result;
}

function compareOutputs(
  solx: Map<string, Record<string, string>>,
  solc: Map<string, Record<string, string>>,
): CompareResult {
  const mismatches: string[] = [];
  for (const key of new Set([...solx.keys(), ...solc.keys()])) {
    const a = solx.get(key);
    const b = solc.get(key);
    if (a === undefined || b === undefined) {
      mismatches.push(
        `${key}: only in ${a === undefined ? "solc" : "solx"} output`,
      );
      continue;
    }
    for (const field of COMPARED_FIELDS) {
      if (a[field] !== b[field]) {
        mismatches.push(`${key}: ${field}`);
      }
    }
  }
  return mismatches.length === 0
    ? { status: "match", checked: solx.size }
    : { status: "mismatch", checked: solx.size, mismatches };
}

async function build(
  hardhatBin: string,
  project: string,
  profile: "slangSolx" | "default",
): Promise<LegResult> {
  const buildArgs = [hardhatBin, "build"];
  if (profile !== "default") {
    buildArgs.push("--build-profile", profile);
  }
  const start = performance.now();
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      buildArgs,
      {
        cwd: project,
        timeout: timeoutMs,
        killSignal: "SIGKILL",
        maxBuffer: 16 * 1024 * 1024,
      },
      (error, _stdout, stderr) => {
        const wallS = Math.round((performance.now() - start) / 10) / 100;
        if (error === null) {
          resolve({ status: "ok", wallS });
          return;
        }
        const timedOut = error.killed === true || error.signal === "SIGKILL";
        // The most distinctive line ("Error: ... is not supported") is often
        // printed well above the end, so keep leading Error lines + the tail.
        const lines = stderr.split("\n").filter((l) => l.trim() !== "");
        const errorTail = [
          ...lines.filter((l) => l.startsWith("Error")).slice(0, 4),
          ...lines.slice(-6),
        ].filter((l, i, all) => all.indexOf(l) === i);
        resolve({
          status: timedOut ? "timeout" : "fail",
          wallS,
          hhe: stderr.match(/HHE\d+/)?.[0],
          errorTail,
          // Match the full stderr: the signature line is often above the tail.
          unsupported: SOLX_UNSUPPORTED_PATTERNS.some((p) => p.test(stderr))
            ? true
            : undefined,
        });
      },
    );
  });
}

function listShard(corpusDir: string): string[] {
  const contractsDir = path.join(corpusDir, "contracts");
  const all = fs
    .readdirSync(contractsDir)
    .filter((f) => f.endsWith(".json"))
    .sort();
  const shardCount = Number(args["shard-count"]);
  const shardIndex = Number(args["shard-index"]);
  if (
    !Number.isInteger(shardCount) ||
    shardCount < 1 ||
    !Number.isInteger(shardIndex) ||
    shardIndex < 0 ||
    shardIndex >= shardCount
  ) {
    console.error(
      `Invalid sharding: --shard-count ${args["shard-count"]}, --shard-index ${args["shard-index"]} (need integers, 0 <= index < count)`,
    );
    process.exit(1);
  }
  const shard = all.filter((_, i) => i % shardCount === shardIndex);
  return args.limit === undefined ? shard : shard.slice(0, Number(args.limit));
}

async function main(): Promise<void> {
  const { toolchain, hardhatBin } = setUpToolchain();
  const contractsDir = path.join(args.corpus, "contracts");
  const done = new Set<string>();
  if (fs.existsSync(args.out)) {
    for (const line of fs.readFileSync(args.out, "utf8").split("\n")) {
      if (line.trim() !== "") {
        done.add((JSON.parse(line) as SweepRecord).file);
      }
    }
  }
  const queue = listShard(args.corpus).filter((f) => !done.has(f));
  console.log(
    `${queue.length} contracts to run (${done.size} already in ${args.out}), concurrency ${args.concurrency}`,
  );

  const counts = {
    ok: 0,
    "solx-only-fail": 0,
    "solx-unsupported": 0,
    "harness-fail": 0,
    "output-mismatch": 0,
    timeout: 0,
  };
  let started = 0;

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const file = queue.shift();
      if (file === undefined) {
        return;
      }
      const index = ++started;
      const contract = JSON.parse(
        fs.readFileSync(path.join(contractsDir, file), "utf8"),
      ) as CorpusContract;
      const project = path.join(
        args.workdir,
        "fixtures",
        file.replace(/\.json$/, ""),
      );
      const record: SweepRecord = {
        file,
        chainId: contract.chain_id,
        nSources: Object.keys(contract.sources).length,
        sourceBytes: Object.values(contract.sources).reduce(
          (a, s) => a + s.length,
          0,
        ),
        evm: contract.settings.evmVersion ?? "(default)",
        outcome: "ok",
        solx: { status: "ok", wallS: 0 },
      };
      try {
        generateFixture(contract, project, toolchain);
        record.solx = await build(hardhatBin, project, "slangSolx");
        if (args.compare && record.solx.status === "ok") {
          const solxOutputs = extractOutputs(project);
          // Both profiles write into the same artifacts tree, so clear it
          // between the legs.
          fs.rmSync(path.join(project, "artifacts"), {
            recursive: true,
            force: true,
          });
          fs.rmSync(path.join(project, "cache"), {
            recursive: true,
            force: true,
          });
          record.solc = await build(hardhatBin, project, "default");
          if (record.solc.status === "ok") {
            record.compare = compareOutputs(
              solxOutputs,
              extractOutputs(project),
            );
            if (record.compare.status === "mismatch") {
              record.outcome = "output-mismatch";
            }
          } else {
            record.compare = { status: "skipped" };
          }
        }
        if (record.solx.status !== "ok") {
          // Baseline leg: a contract that also fails with stock solc is a
          // harness/reconstruction artifact, not a solx failure.
          record.solc = await build(hardhatBin, project, "default");
          record.outcome =
            record.solx.status === "timeout"
              ? "timeout"
              : record.solc.status !== "ok"
                ? "harness-fail"
                : record.solx.unsupported === true
                  ? "solx-unsupported"
                  : "solx-only-fail";
        }
      } catch (error) {
        record.outcome = "harness-fail";
        record.solx = {
          status: "fail",
          wallS: 0,
          errorTail: [`fixture generation threw: ${String(error)}`],
        };
      }
      counts[record.outcome] += 1;
      fs.appendFileSync(args.out, JSON.stringify(record) + "\n");
      if (record.outcome === "ok") {
        // Keep failing/mismatching fixtures on disk for debugging; drop the rest.
        fs.rmSync(project, { recursive: true, force: true });
      }
      console.log(
        `[${index}] ${file}: ${record.outcome} (solx ${record.solx.wallS}s${
          record.solc === undefined ? "" : `, solc ${record.solc.status}`
        })`,
      );
    }
  }

  await Promise.all(
    Array.from({ length: Number(args.concurrency) }, () => worker()),
  );

  console.log(JSON.stringify(counts));
  process.exitCode =
    counts["solx-only-fail"] > 0 || counts["output-mismatch"] > 0 ? 1 : 0;
}

await main();
