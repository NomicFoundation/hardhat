import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import { DEFAULT_CLONE_DIR } from "../end-to-end/helpers/args.ts";
import {
  loadScenario,
  normalizeScenarioPath,
} from "../end-to-end/helpers/directory.ts";
import {
  ForceCheckout,
  ForcePublish,
  init,
  UseLocal,
} from "../end-to-end/subcommands/init.ts";
import { discoverScenarioPathsByTag } from "./helpers/scenarios.ts";
import { BENCHMARK_SOLC_VERSION } from "./solx-profiles.ts";

const USAGE = `
scripts/benchmark/test-under-solx.ts — can solx output actually RUN the tests?

DESCRIPTION
  Runs a scenario's test suite twice per pair — once with a solx build profile
  and once with a solc control profile — and diffs the failing-test sets.
  The verdict per (scenario x runner x pair) follows the evaluation plan's
  taxonomy: pass / test-failures / harness-failures / cannot-compile, with
  EIP-170 deploy reverts tagged as their own sub-category.

  Mechanics per run: env-merge (scenario.definition.env into the child env —
  the gap gas-compare has) -> hardhat clean -> one command that builds AND
  tests with the active profile -> build-info provenance assert -> parse
  pass/fail/skip counts + failing-test identifiers. Verdicts by
  set-difference: a test failing under BOTH compilers is upstream/pin noise,
  excluded from the solx verdict but recorded. Each solx-only failure is
  re-run once (--grep) to screen flakes.

  Results are checkpointed after every pair: a per-pair JSON under
  <out>/results/, full logs under <out>/logs/, and a regenerated
  <out>/summary.json + <out>/report.md.

OPTIONS
  --scenario <path>    Scenario folder/file (mutually exclusive with --tag)
  --tag <tag>          Run every scenario carrying the tag (e.g. solx)
  --runner <r>         Required: "solidity" or "mocha"
  --pair <a:b>         solxProfile:controlProfile. Repeatable. Defaults to
                       both benchmark pairs: the pinned legacy pair
                       (solx-<pin>:default) and the pinned via-IR pair
                       (solx-<pin>-via-ir:solc-via-ir). <pin> is read from
                       scripts/benchmark/pinned-tool-versions.sh.
  --tests <paths>      Space-separated test files forwarded to the runner
                       (default: the full suite)
  --out <dir>          Evidence dir (default: solx-test-evaluation-evidence)
  --markdown           Also print the regenerated markdown matrix to stdout
  --no-init            Skip e2e init when the clone already exists
  --max-reruns <n>     Cap on determinism re-runs per pair (default 25)
  --e2e-clone-dir <p>  Override clone dir (default: $E2E_CLONE_DIR or ${DEFAULT_CLONE_DIR})
  --dry-run            Print the planned runs without executing

EXAMPLE
  node scripts/benchmark/test-under-solx.ts \\
    --scenario ./end-to-end/ens-verifiable-factory-solx \\
    --runner solidity --markdown
`;

const MAX_BUFFER = 1024 * 1024 * 1024;

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------

function getArg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i !== -1 && i + 1 < process.argv.length
    ? process.argv[i + 1]
    : undefined;
}

function getArgAll(flag: string): string[] {
  const values: string[] = [];
  for (let i = 0; i < process.argv.length - 1; i++) {
    if (process.argv[i] === flag) {
      values.push(process.argv[i + 1]);
    }
  }
  return values;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

/**
 * The solx version the pinned profiles measure. Read from the manifest, not
 * hardcoded, so a pin bump cannot strand this script's default pair names
 * (pinned-tool-versions.test.ts token-scans this file too).
 */
function readSolxPin(): string {
  const manifest = readFileSync(
    path.join(import.meta.dirname, "pinned-tool-versions.sh"),
    "utf8",
  );
  const match = /^SOLX_PINNED_VERSION="(\d+\.\d+\.\d+)"$/m.exec(manifest);
  if (match === null) {
    throw new Error(
      "SOLX_PINNED_VERSION not found in scripts/benchmark/pinned-tool-versions.sh",
    );
  }
  return match[1];
}

interface Pair {
  name: string;
  solxProfile: string;
  controlProfile: string;
}

function parsePair(raw: string): Pair {
  const [solxProfile, controlProfile, ...rest] = raw.split(":");
  if (
    solxProfile === undefined ||
    solxProfile === "" ||
    controlProfile === undefined ||
    controlProfile === "" ||
    rest.length > 0
  ) {
    throw new Error(
      `--pair must be <solxProfile>:<controlProfile>, got: ${raw}`,
    );
  }
  return {
    name: `${solxProfile}-vs-${controlProfile}`,
    solxProfile,
    controlProfile,
  };
}

// ---------------------------------------------------------------------------
// Output parsing
// ---------------------------------------------------------------------------

function stripAnsi(s: string): string {
  // eslint-disable-next-line no-control-regex -- ANSI escapes are control chars
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

interface Failure {
  /** Stable identifier: "Contract#test" (solidity) or "A > B > title" (mocha). */
  id: string;
  /** The failure's detail block (error message + trace), for triage. */
  raw: string;
}

interface ParsedCounts {
  passing: number | null;
  failing: number | null;
  skipped: number | null;
}

function parseCounts(clean: string): ParsedCounts {
  const passing = /^\s*(\d+) passing/m.exec(clean);
  const failing = /^\s*(\d+) failing/m.exec(clean);
  // Solidity runner says "skipped"; mocha says "pending".
  const skipped = /^\s*(\d+) (?:skipped|pending)/m.exec(clean);
  return {
    passing: passing === null ? null : Number(passing[1]),
    failing: failing === null ? null : Number(failing[1]),
    skipped: skipped === null ? null : Number(skipped[1]),
  };
}

/**
 * Solidity-runner failures. The details section prints each failure as
 * "N) Contract#test" followed by its reason/trace. The inline per-suite
 * lines lack the contract prefix, so only the '#' form is collected.
 */
function parseSolidityFailures(clean: string): Failure[] {
  const failures = new Map<string, string>();
  const headerRe = /^\s*\d+\) (\S+#[^\n]+)$/gm;
  let match: RegExpExecArray | null;
  while ((match = headerRe.exec(clean)) !== null) {
    const id = match[1].trim();
    const start = match.index + match[0].length;
    const next = clean.slice(start).search(/^\s*\d+\) \S+#/m);
    const raw = clean
      .slice(
        start,
        next === -1 ? Math.min(start + 4000, clean.length) : start + next,
      )
      .trim();
    if (!failures.has(id)) {
      failures.set(id, raw);
    }
  }
  return [...failures.entries()].map(([id, raw]) => ({ id, raw }));
}

/**
 * Mocha failures. The epilogue (after the "N passing" summary) prints each
 * failure as a numbered, indented title path whose last line ends with ':',
 * then the error. The title path becomes "A > B > title".
 */
function parseMochaFailures(clean: string): Failure[] {
  // Anchor on the LAST summary match: test console output may itself print
  // "N passing" at a line start, and only the real epilogue lists failures.
  const summaryMatches = [...clean.matchAll(/^\s*\d+ passing/gm)];
  const epilogue =
    summaryMatches.length === 0
      ? clean
      : clean.slice(summaryMatches[summaryMatches.length - 1].index);
  const lines = epilogue.split("\n");
  const failures = new Map<string, string>();

  let i = 0;
  while (i < lines.length) {
    const header = /^\s{0,6}(\d+)\) (.*)$/.exec(lines[i]);
    if (header === null) {
      i++;
      continue;
    }
    const parts: string[] = [];
    let part = header[2].trim();
    let j = i + 1;
    while (!part.endsWith(":") && j < lines.length) {
      parts.push(part);
      const next = lines[j].trim();
      if (next === "" || /^\d+\) /.test(next)) {
        break;
      }
      part = next;
      j++;
    }
    // A real mocha failure title path always ends with ':' (Base.list
    // appends it). A numbered line whose walk never reaches one is error
    // text quoting "N) ..." — discard it rather than mint a phantom id.
    const sawColon = part.endsWith(":");
    if (sawColon) {
      parts.push(part.slice(0, -1));
    }
    const id = sawColon ? parts.filter((p) => p !== "").join(" > ") : "";

    // Raw block: everything until the next numbered header.
    let end = j;
    while (end < lines.length && !/^\s{0,6}\d+\) /.test(lines[end])) {
      end++;
    }
    const raw = lines.slice(j, end).join("\n").trim().slice(0, 4000);
    if (id !== "" && !failures.has(id)) {
      failures.set(id, raw);
    }
    i = Math.max(j, i + 1);
  }
  return [...failures.entries()].map(([id, raw]) => ({ id, raw }));
}

function parseFailures(runner: string, clean: string): Failure[] {
  return runner === "solidity"
    ? parseSolidityFailures(clean)
    : parseMochaFailures(clean);
}

const EIP170_RE =
  /code size|CodeSizeLimit|initcode|EIP-?170|CreateContractSizeLimit|max code/i;

// Solc's "TypeError:" is only trusted with a source-location arrow on the
// next line; a bare match would also catch JavaScript runtime TypeErrors.
const COMPILE_ERROR_RE =
  /compilation failed|failed to compile|CompilationJobCreationError|Error HHE\d+|HardhatError: HHE\d+|ParserError|DeclarationError|CompilerError|Stack too deep|Subprocess exited with code|TypeError:[^\n]*\n\s*-->/i;

// ---------------------------------------------------------------------------
// Child processes
// ---------------------------------------------------------------------------

interface ExecResult {
  exitCode: number | null;
  signal: string | null;
  output: string;
  durationMs: number;
}

function runChild(
  argv: string[],
  cwd: string,
  env: Record<string, string | undefined>,
  logFile: string,
  label: string,
): ExecResult {
  console.error(`[test-under-solx] ${label}: $ ${argv.join(" ")} (cwd ${cwd})`);
  const started = Date.now();
  const result = spawnSync(argv[0], argv.slice(1), {
    cwd,
    env,
    encoding: "utf8",
    maxBuffer: MAX_BUFFER,
  });
  const durationMs = Date.now() - started;
  const output = `${result.stdout ?? ""}\n--- stderr ---\n${result.stderr ?? ""}`;
  writeFileSync(
    logFile,
    `$ ${argv.join(" ")}\ncwd: ${cwd}\nexit: ${result.status} signal: ${result.signal}\nduration_ms: ${durationMs}\n\n${output}`,
  );
  console.error(
    `[test-under-solx] ${label}: exit ${result.status} in ${(durationMs / 1000).toFixed(0)}s (log: ${logFile})`,
  );
  return {
    exitCode: result.status,
    signal: result.signal === null ? null : String(result.signal),
    output,
    durationMs,
  };
}

// ---------------------------------------------------------------------------
// Provenance
// ---------------------------------------------------------------------------

interface ProvenanceResult {
  ok: boolean;
  buildInfoCount: number;
  subjectCount: number;
  problems: string[];
}

/**
 * All build-info files under the project that this run produced. Not
 * hardcoded to artifacts/build-info: repos may relocate the artifacts dir
 * (graph-horizon emits to build/contracts/build-info). The walk skips
 * node_modules/.git and, via the mtime guard, ignores stale build-info trees
 * (e.g. committed ignition deployment records).
 */
function findBuildInfoFiles(projectDir: string, sinceMs: number): string[] {
  const files: string[] = [];
  const walk = (dir: string, depth: number): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (
          entry.name === "node_modules" ||
          entry.name === ".git" ||
          depth >= 6
        ) {
          continue;
        }
        walk(full, depth + 1);
      } else if (
        path.basename(dir) === "build-info" &&
        entry.name.endsWith(".json") &&
        !entry.name.endsWith(".output.json") &&
        statSync(full).mtimeMs >= sinceMs
      ) {
        files.push(full);
      }
    }
  };
  walk(projectDir, 0);
  return files;
}

/**
 * Every build-info entry at the benchmark solc version (0.8.34) must be
 * compilerType "solx" with the pin in solcLongVersion on solx runs; control
 * runs must contain no solx build-info at all. Scoped to the subject version
 * because lido-core legitimately carries solc ballast build-infos. Only
 * build-info written after this run's clean counts (sinceMs).
 */
function checkProvenance(
  projectDir: string,
  side: "solx" | "control",
  pin: string,
  sinceMs: number,
): ProvenanceResult {
  const problems: string[] = [];
  let buildInfoCount = 0;
  let subjectCount = 0;

  const buildInfoFiles = findBuildInfoFiles(projectDir, sinceMs);
  if (buildInfoFiles.length === 0) {
    return {
      ok: false,
      buildInfoCount,
      subjectCount,
      problems: [
        `no fresh build-info files found under ${projectDir} (build may not have run)`,
      ],
    };
  }

  for (const file of buildInfoFiles) {
    const name = path.relative(projectDir, file);
    buildInfoCount++;
    const info = JSON.parse(readFileSync(file, "utf8"));
    const { solcVersion, solcLongVersion, compilerType } = info;

    if (side === "control" && compilerType === "solx") {
      problems.push(`${name}: compilerType "solx" on a control run`);
    }
    if (solcVersion !== BENCHMARK_SOLC_VERSION) {
      continue;
    }
    subjectCount++;
    if (side === "solx") {
      if (compilerType !== "solx") {
        problems.push(
          `${name}: solcVersion ${solcVersion} has compilerType "${compilerType}", expected "solx"`,
        );
      }
      if (
        typeof solcLongVersion !== "string" ||
        !solcLongVersion.includes(pin)
      ) {
        problems.push(
          `${name}: solcLongVersion "${solcLongVersion}" does not carry the pin ${pin}`,
        );
      }
    }
  }

  if (side === "solx" && subjectCount === 0) {
    problems.push(
      `no build-info at solcVersion ${BENCHMARK_SOLC_VERSION} — nothing proves solx compiled the subject`,
    );
  }
  return { ok: problems.length === 0, buildInfoCount, subjectCount, problems };
}

// ---------------------------------------------------------------------------
// Single run
// ---------------------------------------------------------------------------

interface RunRecord {
  profile: string;
  side: "solx" | "control";
  command: string;
  exitCode: number | null;
  signal: string | null;
  durationMs: number;
  passing: number | null;
  failing: number | null;
  skipped: number | null;
  failures: Failure[];
  provenance: ProvenanceResult;
  compileErrorMarker: boolean;
  logFile: string;
}

function runSide(
  side: "solx" | "control",
  profile: string,
  runner: string,
  testFiles: string[],
  projectDir: string,
  env: Record<string, string | undefined>,
  pin: string,
  logFile: string,
  label: string,
): RunRecord {
  // Clean first: nothing stale can leak across profiles, and the provenance
  // assert only sees build-info this run produced (mtime >= startedMs).
  const startedMs = Date.now();
  const clean = runChild(
    ["npx", "hardhat", "clean"],
    projectDir,
    env,
    `${logFile}.clean.log`,
    `${label} clean`,
  );
  if (clean.exitCode !== 0) {
    throw new Error(
      `hardhat clean failed for ${label}; see ${logFile}.clean.log`,
    );
  }

  const argv = [
    "npx",
    "hardhat",
    "test",
    runner,
    ...testFiles,
    "--build-profile",
    profile,
  ];
  const run = runChild(argv, projectDir, env, logFile, label);
  const cleanOutput = stripAnsi(run.output);
  const counts = parseCounts(cleanOutput);
  const failures = parseFailures(runner, cleanOutput);
  const provenance = checkProvenance(projectDir, side, pin, startedMs);

  return {
    profile,
    side,
    command: argv.join(" "),
    exitCode: run.exitCode,
    signal: run.signal,
    durationMs: run.durationMs,
    ...counts,
    failures,
    provenance,
    compileErrorMarker: COMPILE_ERROR_RE.test(cleanOutput),
    logFile: path.relative(process.cwd(), logFile),
  };
}

// ---------------------------------------------------------------------------
// Determinism screen
// ---------------------------------------------------------------------------

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Leaf test name for --grep: after '#' (solidity) or the last '>' segment (mocha). */
function leafName(id: string): string {
  if (id.includes("#")) {
    return id.slice(id.indexOf("#") + 1);
  }
  const parts = id.split(" > ");
  return parts[parts.length - 1];
}

interface DeterminismEntry {
  id: string;
  outcome:
    | "reproduced"
    | "flaky-under-evaluation"
    | "grep-matched-nothing"
    | "rerun-aborted"
    | "unscreened";
  logFile?: string;
}

function screenDeterminism(
  solxOnly: Failure[],
  runner: string,
  testFiles: string[],
  solxProfile: string,
  projectDir: string,
  env: Record<string, string | undefined>,
  logPrefix: string,
  maxReruns: number,
): DeterminismEntry[] {
  const entries: DeterminismEntry[] = [];
  let rerunIndex = 0;
  for (const failure of solxOnly) {
    if (rerunIndex >= maxReruns) {
      entries.push({ id: failure.id, outcome: "unscreened" });
      continue;
    }
    rerunIndex++;
    const leaf = leafName(failure.id);
    const logFile = `${logPrefix}.rerun-${rerunIndex}.log`;
    // No clean: the solx build is re-created from cache; only the grepped
    // tests re-execute. The point is input determinism, not build freshness.
    const argv = [
      "npx",
      "hardhat",
      "test",
      runner,
      ...testFiles,
      "--grep",
      escapeRegExp(leaf),
      "--build-profile",
      solxProfile,
    ];
    const run = runChild(argv, projectDir, env, logFile, `rerun ${failure.id}`);
    const clean = stripAnsi(run.output);
    const counts = parseCounts(clean);
    const rerunFailures = parseFailures(runner, clean);
    const failedAgain = rerunFailures.some((f) => f.id === failure.id);
    // A rerun that crashes with no summary is its own signal — do not let
    // the null passing count masquerade as a grep miss.
    const aborted = counts.passing === null && counts.failing === null;
    const ranNothing =
      (counts.passing ?? 0) === 0 && rerunFailures.length === 0;

    entries.push({
      id: failure.id,
      outcome: failedAgain
        ? "reproduced"
        : aborted
          ? "rerun-aborted"
          : ranNothing
            ? "grep-matched-nothing"
            : "flaky-under-evaluation",
      logFile: path.relative(process.cwd(), logFile),
    });
  }
  return entries;
}

// ---------------------------------------------------------------------------
// Pair verdicts
// ---------------------------------------------------------------------------

type Verdict =
  | "pass"
  | "test-failures"
  | "harness-failures"
  | "cannot-compile"
  | "invalid-provenance";

interface PairRecord {
  scenarioId: string;
  runner: string;
  pair: string;
  solxProfile: string;
  controlProfile: string;
  verdict: Verdict;
  verdictDetail: string;
  solx: RunRecord;
  control: RunRecord | null;
  solxOnlyFailures: string[];
  bothFailures: string[];
  controlOnlyFailures: string[];
  eip170Failures: string[];
  determinism: DeterminismEntry[];
  timestamp: string;
}

/** A run whose printed summary is trustworthy for set-difference math. */
function summaryProblems(run: RunRecord): string | null {
  const ranNoTests =
    run.passing === null && run.failing === null && run.skipped === null;
  if (ranNoTests) {
    return `run aborted with no test summary (exit ${run.exitCode}, signal ${run.signal})`;
  }
  if (run.exitCode !== 0 && (run.failing ?? 0) === 0) {
    return `non-zero exit (${run.exitCode}) with no parsed test failures`;
  }
  if ((run.failing ?? 0) !== run.failures.length) {
    return `failure parse mismatch: summary says ${run.failing} failing but ${run.failures.length} identifiers were parsed`;
  }
  return null;
}

function classify(
  solx: RunRecord,
  control: RunRecord,
): { verdict: Verdict; detail: string } {
  // A solx compile failure first: build-info is only written when the whole
  // build succeeds, so the provenance gate would otherwise mask the plan's
  // cannot-compile verdict as invalid-provenance.
  const solxRanNoTests =
    solx.passing === null && solx.failing === null && solx.skipped === null;
  if (solxRanNoTests && solx.exitCode !== 0 && solx.compileErrorMarker) {
    return {
      verdict: "cannot-compile",
      detail: "test-source build fails before any test runs",
    };
  }
  if (!solx.provenance.ok) {
    return {
      verdict: "invalid-provenance",
      detail:
        "provenance check failed — the run is INVALID, not a solx result: " +
        solx.provenance.problems.join("; "),
    };
  }
  const solxProblem = summaryProblems(solx);
  if (solxProblem !== null) {
    return { verdict: "harness-failures", detail: solxProblem };
  }

  // A green exit that executed NOTHING is not a pass. Seen on 1inch-swap-vm:
  // solx hits "LLVM ERROR: Stackification failed" on the test tree, hardhat
  // still reports the build compiled, and the runner finds zero suites while
  // the control runs hundreds.
  const solxTotal = (solx.passing ?? 0) + (solx.failing ?? 0);
  const controlTotal = (control.passing ?? 0) + (control.failing ?? 0);
  if (solxTotal === 0) {
    return {
      verdict: "harness-failures",
      detail:
        `solx executed no tests (the control executed ${controlTotal}) — ` +
        `a green exit that ran nothing is not a pass (check the build log ` +
        `for swallowed compiler errors)`,
    };
  }

  // The solx side ran tests and has zero failures: the verdict is pass
  // regardless of the control's health (nothing to set-difference). A broken
  // control (aave: solc-via-ir cannot compile the test tree) is recorded as
  // a note, not held against solx.
  if (solx.failures.length === 0 && solx.exitCode === 0) {
    const controlProblem = summaryProblems(control);
    const controlNote = !control.provenance.ok
      ? ` (control provenance failed: ${control.provenance.problems.join("; ")})`
      : controlProblem !== null
        ? ` (control-side issue, recorded but irrelevant to a fully-green solx run: ${controlProblem})`
        : controlTotal === 0
          ? " (control-side issue: the control executed no tests)"
          : "";
    return { verdict: "pass", detail: controlNote.trim() };
  }

  // solx has failures: without a control that ran the suite, the
  // set-difference is not computable.
  if (controlTotal === 0) {
    return {
      verdict: "harness-failures",
      detail:
        "control executed no tests — set-difference not computable for the " +
        "solx failures (check the control build log)",
    };
  }

  // solx has failures: the set-difference needs a trustworthy control.
  if (!control.provenance.ok) {
    return {
      verdict: "invalid-provenance",
      detail:
        "control-run provenance failed — set-difference not computable: " +
        control.provenance.problems.join("; "),
    };
  }
  const controlProblem = summaryProblems(control);
  if (controlProblem !== null) {
    return {
      verdict: "harness-failures",
      detail: `control run untrustworthy — set-difference not computable: ${controlProblem}`,
    };
  }
  return { verdict: "pass", detail: "" };
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

function loadAllResults(outDir: string): PairRecord[] {
  const resultsDir = path.join(outDir, "results");
  if (!existsSync(resultsDir)) {
    return [];
  }
  return readdirSync(resultsDir)
    .filter((f) => f.endsWith(".json") && !f.endsWith(".environment.json"))
    .sort()
    .map((f) => JSON.parse(readFileSync(path.join(resultsDir, f), "utf8")));
}

function fmtCounts(run: RunRecord | null): string {
  if (run === null) {
    return "—";
  }
  if (run.passing === null && run.failing === null) {
    return `no summary (exit ${run.exitCode})`;
  }
  return `${run.passing ?? 0}P/${run.failing ?? 0}F/${run.skipped ?? 0}S`;
}

function renderMarkdown(records: PairRecord[], pin: string): string {
  const lines = [
    `# solx test-execution evaluation — running matrix`,
    "",
    `solx pin: ${pin}. Legend: P/F/S = passing/failing/skipped.`,
    "",
    "| scenario | runner | pair | verdict | solx | control | solx-only | both | EIP-170 | flaky |",
    "|---|---|---|---|---|---|--:|--:|--:|--:|",
  ];
  for (const r of records) {
    const flaky = r.determinism.filter(
      (d) => d.outcome === "flaky-under-evaluation",
    ).length;
    lines.push(
      `| ${r.scenarioId} | ${r.runner} | ${r.solxProfile} vs ${r.controlProfile} | ` +
        `**${r.verdict}** | ${fmtCounts(r.solx)} | ${fmtCounts(r.control)} | ` +
        `${r.solxOnlyFailures.length} | ${r.bothFailures.length} | ` +
        `${r.eip170Failures.length} | ${flaky} |`,
    );
  }

  const withDetail = records.filter(
    (r) => r.verdict !== "pass" || r.solxOnlyFailures.length > 0,
  );
  if (withDetail.length > 0) {
    lines.push("", "## Details");
    for (const r of withDetail) {
      lines.push("", `### ${r.scenarioId} / ${r.runner} / ${r.pair}`, "");
      if (r.verdictDetail !== "") {
        lines.push(r.verdictDetail, "");
      }
      if (r.solxOnlyFailures.length > 0) {
        lines.push("solx-only failures:", "");
        for (const id of r.solxOnlyFailures) {
          const det = r.determinism.find((d) => d.id === id);
          const tag = [
            r.eip170Failures.includes(id) ? "EIP-170" : null,
            det?.outcome ?? null,
          ]
            .filter((t) => t !== null)
            .join(", ");
          lines.push(`- \`${id}\`${tag === "" ? "" : ` (${tag})`}`);
        }
      }
      if (r.controlOnlyFailures.length > 0) {
        lines.push("", "control-only failures (not a solx problem):", "");
        for (const id of r.controlOnlyFailures) {
          lines.push(`- \`${id}\``);
        }
      }
      if (r.bothFailures.length > 0) {
        lines.push(
          "",
          "failing under BOTH compilers (upstream/pin noise, excluded from the solx verdict):",
          "",
        );
        for (const id of r.bothFailures) {
          lines.push(`- \`${id}\``);
        }
      }
    }
  }
  return lines.join("\n");
}

function regenerateReports(outDir: string, pin: string): string {
  const records = loadAllResults(outDir);
  const markdown = renderMarkdown(records, pin);
  writeFileSync(path.join(outDir, "report.md"), markdown);
  writeFileSync(
    path.join(outDir, "summary.json"),
    JSON.stringify(
      records.map((r) => ({
        scenarioId: r.scenarioId,
        runner: r.runner,
        solxProfile: r.solxProfile,
        controlProfile: r.controlProfile,
        verdict: r.verdict,
        verdictDetail: r.verdictDetail,
        solx: {
          passing: r.solx.passing,
          failing: r.solx.failing,
          skipped: r.solx.skipped,
          exitCode: r.solx.exitCode,
          durationMs: r.solx.durationMs,
        },
        control:
          r.control === null
            ? null
            : {
                passing: r.control.passing,
                failing: r.control.failing,
                skipped: r.control.skipped,
                exitCode: r.control.exitCode,
                durationMs: r.control.durationMs,
              },
        solxOnlyFailures: r.solxOnlyFailures,
        bothFailures: r.bothFailures,
        controlOnlyFailures: r.controlOnlyFailures,
        eip170Failures: r.eip170Failures,
        determinism: r.determinism,
        timestamp: r.timestamp,
      })),
      null,
      2,
    ),
  );
  return markdown;
}

// ---------------------------------------------------------------------------
// Environment metadata
// ---------------------------------------------------------------------------

function captureEnvironment(
  projectDir: string,
  workingDir: string,
  pin: string,
  scenarioCommit: string | undefined,
  outDir: string,
  scenarioId: string,
): void {
  const meta: Record<string, unknown> = {
    scenarioId,
    scenarioCommit,
    solxPin: pin,
    capturedAt: new Date().toISOString(),
  };
  const head = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: workingDir,
    encoding: "utf8",
  });
  meta.checkoutHead = head.status === 0 ? head.stdout.trim() : null;

  const solxBinary = path.join(projectDir, ".solx", `solx-v${pin}`);
  if (existsSync(solxBinary)) {
    const version = spawnSync(solxBinary, ["--version"], { encoding: "utf8" });
    meta.solxVersionOutput =
      version.status === 0 ? version.stdout.trim() : version.stderr?.trim();
  }
  writeFileSync(
    path.join(outDir, `${scenarioId}.environment.json`),
    JSON.stringify(meta, null, 2),
  );
}

/** Plan §7: assert the packed hardhat-solx in the checkout is fresh. */
function assertFreshHardhatSolx(
  projectDir: string,
  env: Record<string, string | undefined>,
): void {
  const result = spawnSync(
    "diff",
    [
      "-rq",
      ".solx/expected-dist-src",
      "node_modules/@nomicfoundation/hardhat-solx/dist/src",
    ],
    { cwd: projectDir, env, encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(
      `stale hardhat-solx in ${projectDir}: ${result.stdout} ${result.stderr} — re-init the scenario`,
    );
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  if (process.argv.length <= 2 || hasFlag("--help")) {
    console.log(USAGE);
    process.exit(0);
  }

  const pin = readSolxPin();
  const runner = getArg("--runner");
  if (runner !== "solidity" && runner !== "mocha") {
    console.error('--runner must be "solidity" or "mocha"');
    console.log(USAGE);
    process.exit(1);
  }

  const scenarioArg = getArg("--scenario");
  const tagArg = getArg("--tag");
  if ((scenarioArg === undefined) === (tagArg === undefined)) {
    console.error("exactly one of --scenario or --tag is required");
    process.exit(1);
  }
  const scenarioPaths =
    scenarioArg !== undefined
      ? [normalizeScenarioPath(scenarioArg)]
      : discoverScenarioPathsByTag(tagArg!);

  const pairArgs = getArgAll("--pair");
  const pairs = (
    pairArgs.length > 0
      ? pairArgs
      : [`solx-${pin}:default`, `solx-${pin}-via-ir:solc-via-ir`]
  ).map(parsePair);

  const testFiles = (getArg("--tests") ?? "").split(/\s+/).filter(Boolean);
  const outDir = path.resolve(
    getArg("--out") ?? "solx-test-evaluation-evidence",
  );
  const cloneDir =
    getArg("--e2e-clone-dir") ?? process.env.E2E_CLONE_DIR ?? DEFAULT_CLONE_DIR;
  const noInit = hasFlag("--no-init");
  const dryRun = hasFlag("--dry-run");
  const maxReruns = Number(getArg("--max-reruns") ?? "25");
  if (!Number.isFinite(maxReruns) || maxReruns < 0) {
    console.error("--max-reruns must be a nonnegative number");
    process.exit(1);
  }

  mkdirSync(path.join(outDir, "logs"), { recursive: true });
  mkdirSync(path.join(outDir, "results"), { recursive: true });

  let hadInvalidOrError = false;

  for (const scenarioPath of scenarioPaths) {
    const scenario = loadScenario(cloneDir, scenarioPath);
    const projectDir = path.join(
      scenario.workingDir,
      scenario.definition.workdir ?? ".",
    );
    const env = { ...process.env, ...scenario.definition.env };

    if (dryRun) {
      for (const pair of pairs) {
        console.log(
          `[dry-run] ${scenario.id} / ${runner} / ${pair.solxProfile} vs ${pair.controlProfile} (cwd ${projectDir})`,
        );
      }
      continue;
    }

    if (!noInit || !existsSync(scenario.workingDir)) {
      await init(
        cloneDir,
        scenarioPath,
        UseLocal.Yes,
        ForceCheckout.Yes,
        ForcePublish.No,
      );
    }
    assertFreshHardhatSolx(projectDir, env);
    captureEnvironment(
      projectDir,
      scenario.workingDir,
      pin,
      scenario.definition.commit,
      outDir,
      scenario.id,
    );

    for (const pair of pairs) {
      const slug = `${scenario.id}--${runner}--${pair.name}`;
      const logPrefix = path.join(outDir, "logs", slug);

      const solx = runSide(
        "solx",
        pair.solxProfile,
        runner,
        testFiles,
        projectDir,
        env,
        pin,
        `${logPrefix}.solx.log`,
        `${slug} [solx]`,
      );

      // Control-run discipline: the control always runs, even when the solx
      // side already failed — "fails under both" and "fails under solx only"
      // are different verdicts.
      const control = runSide(
        "control",
        pair.controlProfile,
        runner,
        testFiles,
        projectDir,
        env,
        pin,
        `${logPrefix}.control.log`,
        `${slug} [control]`,
      );

      const controlIds = new Set(control.failures.map((f) => f.id));
      const solxIds = new Set(solx.failures.map((f) => f.id));
      const solxOnly = solx.failures.filter((f) => !controlIds.has(f.id));
      const both = solx.failures.filter((f) => controlIds.has(f.id));
      const controlOnly = control.failures.filter((f) => !solxIds.has(f.id));

      let { verdict, detail } = classify(solx, control);
      if (verdict === "pass" && solxOnly.length > 0) {
        verdict = "test-failures";
        detail = `${solxOnly.length} test(s) fail under solx but pass under the solc control`;
      }

      const eip170 = solxOnly
        .filter((f) => EIP170_RE.test(f.raw))
        .map((f) => f.id);

      const determinism =
        verdict === "test-failures"
          ? screenDeterminism(
              solxOnly,
              runner,
              testFiles,
              pair.solxProfile,
              projectDir,
              env,
              logPrefix,
              maxReruns,
            )
          : [];

      const record: PairRecord = {
        scenarioId: scenario.id,
        runner,
        pair: pair.name,
        solxProfile: pair.solxProfile,
        controlProfile: pair.controlProfile,
        verdict,
        verdictDetail: detail,
        solx,
        control,
        solxOnlyFailures: solxOnly.map((f) => f.id),
        bothFailures: both.map((f) => f.id),
        controlOnlyFailures: controlOnly.map((f) => f.id),
        eip170Failures: eip170,
        determinism,
        timestamp: new Date().toISOString(),
      };

      writeFileSync(
        path.join(outDir, "results", `${slug}.json`),
        JSON.stringify(record, null, 2),
      );
      const markdown = regenerateReports(outDir, pin);
      console.error(
        `[test-under-solx] ${slug}: verdict ${verdict}` +
          (detail === "" ? "" : ` — ${detail}`),
      );
      if (hasFlag("--markdown")) {
        console.log(markdown);
      }
      if (verdict === "invalid-provenance") {
        hadInvalidOrError = true;
      }
    }
  }

  process.exit(hadInvalidOrError ? 2 : 0);
}

await main();
