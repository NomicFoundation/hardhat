import { execSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { totalmem } from "node:os";
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
import {
  BENCHMARK_SOLC_VERSION,
  FUZZ_SEED_ENV_VAR,
  PINNED_FUZZ_SEED,
  SOLX_COMPILER_TYPE,
} from "./solx-profiles.ts";

const USAGE = `
scripts/benchmark/test-under-solx.ts — can solx output actually RUN the tests?

DESCRIPTION
  Runs a scenario's test suite twice per pair — once with a solx build profile
  and once with a solc control profile — and diffs the failing-test sets.
  Verdict per (scenario x runner x pair): pass / pass-uncontrolled /
  test-failures / harness-failures / cannot-compile / invalid-provenance,
  with EIP-170 deploy reverts tagged as their own sub-category.

  Mechanics per run: env-merge (scenario.definition.env into the child env —
  the gap gas-compare has) -> hardhat clean -> one command that builds AND
  tests with the active profile -> build-info provenance assert -> artifact
  inventory + bytecode scan -> parse pass/fail/skip counts + failing-test
  identifiers. Verdicts by set-difference: a test failing under BOTH compilers
  is upstream/pin noise, excluded from the solx verdict but recorded. Each
  solx-only failure is re-run once (--grep) to screen flakes.

  Nothing is inferred from an absent error. A green build that produced no
  bytecode is a cannot-compile verdict, and a contract carrying bytecode on
  the control side but none on the solx side is a harness-failures verdict —
  the shape of the solx 0.1.7 silent-empty-build defect, which a green exit
  code, an empty JSON errors array and a passing provenance check all missed.
  A set-difference also only means something when both sides ran the same
  suite, so a solx test count below 90% of the control's is harness-failures,
  not a pass, and a pass with no working control is reported as
  pass-uncontrolled rather than pass.

  Results are checkpointed after every pair: a per-pair JSON under
  <out>/results/, full logs under <out>/logs/, and a regenerated
  <out>/summary.json + <out>/report.md. A scenario that throws is recorded as
  <out>/results/<scenario>.error.json and the sweep continues with the next
  scenario, so one bad repo cannot discard the rest of a multi-hour run.

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
  --no-prime           Skip the scenario's declared prime steps (the
                       measure:false steps of its benchmark step sequences).
                       They run once per scenario by default: the sweep needs
                       the same preparation the benchmark cells declare
                       (workspace deps, relaxed dependency pragmas, warm
                       compiler caches), and doing it by hand is how a
                       documented method stops reproducing a run. The forge
                       warm-cache steps are always skipped: this harness never
                       invokes forge, so they are cost and failure surface with
                       no effect on any result here.
  --max-reruns <n>     Cap on determinism re-runs per pair (default 25)
  --repetitions <n>    Run every pair n times (default 1). Each repetition
                       past the first gets its own fuzz seed, held fixed
                       across that repetition's two runs, so the pair stays a
                       controlled comparison while the corpus varies. Results
                       land in separate per-repetition records.
  --fuzz-seed <hex>    Seed for the first repetition (default: the wrapper
                       config's PINNED_FUZZ_SEED)
  --gas-snapshot       After each pair, write a gas snapshot from the control
                       run (--snapshot) and check the solx run against it
                       (--snapshot-check). Recorded as divergence data, never
                       as a verdict: two compilers are expected to differ on
                       gas. Every outcome the comparison did not actually reach
                       is recorded as inconclusive with its reason. Solidity
                       runner only — the flags belong to it, so this does
                       nothing under --runner mocha.
  --build-repro        After each pair, compile the solx profile twice from
                       clean and diff the artifact sizes, to test build
                       determinism (costs two extra builds per pair). A
                       property of one compiler, not a repeated measurement of
                       a pair.
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

export interface Failure {
  /** Stable identifier: "Contract#test" (solidity) or "A > B > title" (mocha). */
  id: string;
  /** The failure's detail block (error message + trace), for triage. */
  raw: string;
  /** True when the detail block was cut at RAW_CAP, so `raw` is a prefix. */
  truncated: boolean;
}

/**
 * How much of a failure's detail block is kept. Comparing two failures' text
 * therefore compares a prefix, which is why diffSharedFailures records when a
 * raw hit the cap: two traces that diverge only past it look identical.
 */
const RAW_CAP = 4000;

interface ParsedCounts {
  passing: number | null;
  failing: number | null;
  skipped: number | null;
}

/** The LAST match's count: test console output may itself print a summary line. */
function lastCount(re: RegExp, clean: string): number | null {
  const matches = [...clean.matchAll(re)];
  return matches.length === 0 ? null : Number(matches[matches.length - 1][1]);
}

export function parseCounts(clean: string): ParsedCounts {
  return {
    passing: lastCount(/^\s*(\d+) passing/gm, clean),
    failing: lastCount(/^\s*(\d+) failing/gm, clean),
    // Solidity runner says "skipped"; mocha says "pending".
    skipped: lastCount(/^\s*(\d+) (?:skipped|pending)/gm, clean),
  };
}

/**
 * Solidity-runner failures. The details section prints each failure as
 * "N) Contract#test" followed by its reason/trace. The inline per-suite
 * lines lack the contract prefix, so only the '#' form is collected.
 */
export function parseSolidityFailures(clean: string): Failure[] {
  const failures = new Map<string, Failure>();
  const headerRe = /^\s*\d+\) (\S+#[^\n]+)$/gm;
  let match: RegExpExecArray | null;
  while ((match = headerRe.exec(clean)) !== null) {
    const id = match[1].trim();
    const start = match.index + match[0].length;
    const next = clean.slice(start).search(/^\s*\d+\) \S+#/m);
    const end = next === -1 ? clean.length : start + next;
    const raw = clean.slice(start, Math.min(end, start + RAW_CAP)).trim();
    if (!failures.has(id)) {
      failures.set(id, { id, raw, truncated: end > start + RAW_CAP });
    }
  }
  return [...failures.values()];
}

/**
 * Mocha failures. The epilogue (after the "N passing" summary) prints each
 * failure as a numbered, indented title path whose last line ends with ':',
 * then the error. The title path becomes "A > B > title".
 */
export function parseMochaFailures(clean: string): Failure[] {
  // Anchor on the LAST summary match: test console output may itself print
  // "N passing" at a line start, and only the real epilogue lists failures.
  const summaryMatches = [...clean.matchAll(/^\s*\d+ passing/gm)];
  const epilogue =
    summaryMatches.length === 0
      ? clean
      : clean.slice(summaryMatches[summaryMatches.length - 1].index);
  const lines = epilogue.split("\n");
  const failures = new Map<string, Failure>();

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
    const block = lines.slice(j, end).join("\n").trim();
    if (id !== "" && !failures.has(id)) {
      failures.set(id, {
        id,
        raw: block.slice(0, RAW_CAP),
        truncated: block.length > RAW_CAP,
      });
    }
    i = Math.max(j, i + 1);
  }
  return [...failures.values()];
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

// Below this share of the control's test count, the two sides did not run the
// same suite, so a set-difference over their failures is not a solx result.
// Test counts are expected to match exactly; the slack absorbs a suite whose
// own count varies (a conditional skip, a timing-dependent case) without
// letting a wholesale disappearance of suites read as a pass.
const UNIVERSE_SHORTFALL_FLOOR = 0.9;

// ---------------------------------------------------------------------------
// Child processes
// ---------------------------------------------------------------------------

export interface ExecResult {
  exitCode: number | null;
  signal: string | null;
  output: string;
  durationMs: number;
  /**
   * Why the child never ran, when spawnSync itself failed (ENOENT, EAGAIN, a
   * maxBuffer overrun). It leaves the same traces a rejected build does — a
   * null exit code and no output — so the reason has to be carried explicitly
   * or a host failure is read as a compiler result.
   */
  spawnError: string | null;
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
  const spawnError =
    result.error === undefined ? null : String(result.error.message);
  const output = `${result.stdout ?? ""}\n--- stderr ---\n${result.stderr ?? ""}`;
  writeFileSync(
    logFile,
    `$ ${argv.join(" ")}\ncwd: ${cwd}\nexit: ${result.status} signal: ${result.signal}\n` +
      `spawn error: ${spawnError ?? "none"}\nduration_ms: ${durationMs}\n\n${output}`,
  );
  console.error(
    `[test-under-solx] ${label}: exit ${result.status} in ${(durationMs / 1000).toFixed(0)}s (log: ${logFile})` +
      (spawnError === null ? "" : ` — SPAWN FAILED: ${spawnError}`),
  );
  return {
    exitCode: result.status,
    signal: result.signal === null ? null : String(result.signal),
    output,
    durationMs,
    spawnError,
  };
}

// ---------------------------------------------------------------------------
// Provenance
// ---------------------------------------------------------------------------

export interface ProvenanceResult {
  ok: boolean;
  buildInfoCount: number;
  subjectCount: number;
  problems: string[];
}

/** One build-info file's provenance-relevant fields, as parsed from disk. */
export interface BuildInfoSummary {
  /** Path relative to the project dir, for problem messages. */
  name: string;
  /** The build-info's own id, which every artifact carries as buildInfoId. */
  id?: unknown;
  solcVersion?: unknown;
  solcLongVersion?: unknown;
  compilerType?: unknown;
  /** Set when the file could not be read or parsed; the reason. */
  unreadable?: string;
}

/**
 * Depth cap for both project walks. Deep enough for every scenario's artifacts
 * and build-info location (graph-horizon's build/contracts/build-info is the
 * deepest at 3), while still refusing to descend forever. A build-info tree
 * found AT the cap is walked; one below it would be missed, so both walks
 * record the directories the cap refused to enter and the run record carries
 * that list (inventory.truncatedAt).
 */
const MAX_WALK_DEPTH = 10;

/** Directories neither walk ever descends into. */
const SKIPPED_DIRS = new Set(["node_modules", ".git"]);

/**
 * Directories and files the walk could not read, and the directories its depth
 * cap refused to enter. Both are recorded rather than thrown or dropped: a
 * dangling symlink or a permission error in scenario 7 must not discard
 * scenarios 8 and 9, and an absence that was never looked at is not evidence.
 */
interface WalkProblems {
  /** Directories the depth cap refused to enter. Empty in a healthy run. */
  truncatedAt: string[];
  /** Paths that could not be listed or stat'ed. Empty in a healthy run. */
  unreadable: string[];
}

interface ProjectScan extends WalkProblems {
  /** Fresh build-info JSONs (not the .output.json siblings). */
  buildInfoFiles: string[];
  /** Their parsed provenance fields, in buildInfoFiles order. */
  summaries: BuildInfoSummary[];
  /** Ids of the build-infos at the subject solc version (0.8.34). */
  subjectBuildInfoIds: Set<string>;
}

/** readdirSync that records the failure instead of throwing. */
function readDirEntries(
  dir: string,
  projectDir: string,
  problems: WalkProblems,
): Array<{ name: string; isDirectory: boolean }> {
  try {
    return readdirSync(dir, { withFileTypes: true }).map((e) => ({
      name: e.name,
      isDirectory: e.isDirectory(),
    }));
  } catch (error) {
    problems.unreadable.push(
      `${path.relative(projectDir, dir)}: ${(error as Error).message}`,
    );
    return [];
  }
}

/** mtime in ms, or null when the file cannot be stat'ed (recorded, not thrown). */
function mtimeMs(
  file: string,
  projectDir: string,
  problems: WalkProblems,
): number | null {
  try {
    return statSync(file).mtimeMs;
  } catch (error) {
    problems.unreadable.push(
      `${path.relative(projectDir, file)}: ${(error as Error).message}`,
    );
    return null;
  }
}

/**
 * All build-info files under the project that this run produced, with their
 * provenance fields already parsed. Not hardcoded to artifacts/build-info:
 * repos may relocate the artifacts dir (graph-horizon emits to
 * build/contracts/build-info). The walk skips node_modules/.git and, via the
 * mtime guard, ignores stale build-info trees (e.g. committed ignition
 * deployment records).
 *
 * A build-info whose JSON does not parse becomes a summary with no fields, so
 * the provenance rules see it and report it rather than the run dying on a
 * bare JSON.parse.
 */
function scanProject(projectDir: string, sinceMs: number): ProjectScan {
  const buildInfoFiles: string[] = [];
  const problems: WalkProblems = { truncatedAt: [], unreadable: [] };
  const walk = (dir: string, depth: number): void => {
    for (const entry of readDirEntries(dir, projectDir, problems)) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory) {
        if (SKIPPED_DIRS.has(entry.name)) {
          continue;
        }
        if (depth >= MAX_WALK_DEPTH) {
          problems.truncatedAt.push(path.relative(projectDir, full));
          continue;
        }
        walk(full, depth + 1);
      } else if (
        path.basename(dir) === "build-info" &&
        entry.name.endsWith(".json") &&
        !entry.name.endsWith(".output.json") &&
        (mtimeMs(full, projectDir, problems) ?? -1) >= sinceMs
      ) {
        buildInfoFiles.push(full);
      }
    }
  };
  walk(projectDir, 0);

  const summaries: BuildInfoSummary[] = [];
  const subjectBuildInfoIds = new Set<string>();
  for (const file of buildInfoFiles) {
    const name = path.relative(projectDir, file);
    let info: Record<string, unknown>;
    try {
      info = JSON.parse(readFileSync(file, "utf8"));
    } catch (error) {
      summaries.push({ name, unreadable: (error as Error).message });
      continue;
    }
    summaries.push({
      name,
      id: info.id,
      solcVersion: info.solcVersion,
      solcLongVersion: info.solcLongVersion,
      compilerType: info.compilerType,
    });
    if (
      info.solcVersion === BENCHMARK_SOLC_VERSION &&
      typeof info.id === "string"
    ) {
      subjectBuildInfoIds.add(info.id);
    }
  }
  return { buildInfoFiles, summaries, subjectBuildInfoIds, ...problems };
}

/**
 * The provenance rules, over already-parsed build-info summaries. Pure, so
 * every branch is unit-testable (see test-under-solx.test.ts): the four
 * branches are a solx run whose subject build-info is not solx, a solx run
 * whose solcLongVersion does not carry the pin, a control run carrying solx
 * build-info, and a solx run with no subject build-info at all.
 *
 * Every build-info entry at the benchmark solc version (0.8.34) must be
 * compilerType "slangSolx" (SOLX_COMPILER_TYPE — the type the plugin
 * registers) with the pin in solcLongVersion on solx runs; control runs must
 * contain no solx build-info at all. Scoped to the subject version because
 * lido-core legitimately carries solc ballast build-infos.
 *
 * Note what this does NOT establish: which compiler produced the bytecode
 * that actually executed, or that any bytecode was produced at all. The
 * inventory scan below covers what was produced; etched and literal-embedded
 * bytecode (vm.etch, typechain factories) bypasses both.
 */
export function evaluateProvenance(
  infos: BuildInfoSummary[],
  side: "solx" | "control",
  pin: string,
): ProvenanceResult {
  const problems: string[] = [];
  let subjectCount = 0;

  if (infos.length === 0) {
    return {
      ok: false,
      buildInfoCount: 0,
      subjectCount: 0,
      problems: ["no fresh build-info files found (build may not have run)"],
    };
  }

  for (const info of infos) {
    const { name, solcVersion, solcLongVersion, compilerType } = info;

    // An unreadable build-info proves nothing either way, so it is a problem
    // in its own right rather than an entry that quietly passes every rule.
    if (info.unreadable !== undefined) {
      problems.push(
        `${name}: build-info could not be read (${info.unreadable}) — provenance unverifiable`,
      );
      continue;
    }
    if (side === "control" && compilerType === SOLX_COMPILER_TYPE) {
      problems.push(
        `${name}: compilerType "${SOLX_COMPILER_TYPE}" on a control run`,
      );
    }
    if (solcVersion !== BENCHMARK_SOLC_VERSION) {
      continue;
    }
    subjectCount++;
    if (side === "solx") {
      if (compilerType !== SOLX_COMPILER_TYPE) {
        problems.push(
          `${name}: solcVersion ${solcVersion} has compilerType "${compilerType}", expected "${SOLX_COMPILER_TYPE}"`,
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
  return {
    ok: problems.length === 0,
    buildInfoCount: infos.length,
    subjectCount,
    problems,
  };
}

/** Applies evaluateProvenance to a scan's parsed build-info summaries. */
function checkProvenance(
  scan: ProjectScan,
  projectDir: string,
  side: "solx" | "control",
  pin: string,
): ProvenanceResult {
  const result = evaluateProvenance(scan.summaries, side, pin);
  if (!result.ok && scan.summaries.length === 0) {
    return {
      ...result,
      problems: [
        `no fresh build-info files found under ${projectDir} (build may not have run)`,
      ],
    };
  }
  return result;
}

// ---------------------------------------------------------------------------
// Artifact inventory: what the build actually produced
// ---------------------------------------------------------------------------

/** EIP-170's deployed-code limit, in bytes. */
const EIP170_LIMIT_BYTES = 24576;

/** How many oversize contracts to name per run in the record. */
const MAX_OVERSIZE_NAMED = 25;

/** How many unparseable artifact paths to name per run in the record. */
const MAX_UNPARSEABLE_NAMED = 25;

export interface ArtifactEntry {
  /** "src/Foo.sol:Foo". */
  id: string;
  /** Deployed (runtime) bytecode length in bytes. 0 for interfaces. */
  runtimeBytes: number;
  /** Creation bytecode length in bytes. */
  creationBytes: number;
  /**
   * The build-info this artifact came out of, as the artifact records it. Null
   * when the artifact carries no buildInfoId, which leaves it unattributable
   * to a compiler version.
   */
  buildInfoId: string | null;
  /**
   * True when the source is part of the repo's test tree. Solidity-test
   * harness contracts are deployed by the runner with the code-size limit
   * lifted, so they are not part of an EIP-170 population.
   */
  testSource: boolean;
}

/** One population of artifacts, summarized. */
export interface InventoryScope {
  artifactCount: number;
  /** Artifacts carrying non-empty deployed bytecode. */
  withBytecode: number;
  /** Artifacts with empty deployed bytecode (interfaces, abstract, or bugs). */
  withoutBytecode: number;
  /** Largest deployed bytecode seen, and the contract carrying it. */
  maxRuntimeBytes: number;
  maxRuntimeContract: string | null;
  /** Contracts whose deployed bytecode exceeds EIP-170, named (capped). */
  overLimit: string[];
  overLimitCount: number;
}

export interface InventoryResult extends InventoryScope {
  /** Set to true when no artifacts were found at all. */
  empty: boolean;
  /** Artifact files whose JSON did not parse, named (capped) and counted. */
  unparseable: string[];
  unparseableCount: number;
  /** Directories the depth cap refused to enter. Empty in a healthy run. */
  truncatedAt: string[];
  /** Paths the walks could not list or stat. Empty in a healthy run. */
  unreadable: string[];
  /** How many fresh build-infos sit at the subject solc version (0.8.34). */
  subjectBuildInfoCount: number;
  /**
   * Artifacts attributed to a subject-version build-info. The scope every
   * claim about the compiler under test is made over: the project-global
   * numbers also count solc ballast (lidofinance-core compiles six other
   * versions), which is enough to mask an all-empty subject build.
   */
  subject: InventoryScope;
  /** Subject artifacts from non-test sources: the EIP-170 population. */
  subjectDeployable: InventoryScope;
  /** Subject artifacts from test sources, exempt from the EIP-170 limit. */
  subjectTestHarness: InventoryScope;
  entries: ArtifactEntry[];
}

/** Hex string ("0x...") length in bytes; "0x" and "" are 0. */
export function hexBytes(value: unknown): number {
  if (typeof value !== "string") {
    return 0;
  }
  const body = value.startsWith("0x") ? value.slice(2) : value;
  return Math.floor(body.length / 2);
}

/**
 * Whether a source name belongs to the repo's test tree.
 *
 * Path-based, because that is what the corpus expresses: every scenario keeps
 * its Solidity tests under a top-level or nested `test/`/`tests/` directory,
 * and Foundry-style test contracts additionally end in `.t.sol`. Used to keep
 * test-harness contracts out of the EIP-170 population, never to decide a
 * verdict.
 */
export function isTestSource(sourceName: string): boolean {
  return /(^|\/)tests?\//i.test(sourceName) || /\.t\.sol$/i.test(sourceName);
}

/** Summarize one population of artifacts. */
function summarizeScope(entries: ArtifactEntry[]): InventoryScope {
  const withBytecode = entries.filter((e) => e.runtimeBytes > 0);
  const overLimit = withBytecode
    .filter((e) => e.runtimeBytes > EIP170_LIMIT_BYTES)
    .sort((a, b) => b.runtimeBytes - a.runtimeBytes);
  const max = withBytecode.reduce<ArtifactEntry | null>(
    (best, e) =>
      best === null || e.runtimeBytes > best.runtimeBytes ? e : best,
    null,
  );
  return {
    artifactCount: entries.length,
    withBytecode: withBytecode.length,
    withoutBytecode: entries.length - withBytecode.length,
    maxRuntimeBytes: max?.runtimeBytes ?? 0,
    maxRuntimeContract: max === null ? null : max.id,
    overLimit: overLimit
      .slice(0, MAX_OVERSIZE_NAMED)
      .map((e) => `${e.id} (${e.runtimeBytes}B)`),
    overLimitCount: overLimit.length,
  };
}

export interface InventoryInputs {
  entries: ArtifactEntry[];
  /** Ids of the build-infos at the subject solc version. */
  subjectBuildInfoIds?: Iterable<string>;
  /** Artifact paths whose JSON did not parse. */
  unparseable?: string[];
  truncatedAt?: string[];
  unreadable?: string[];
}

/**
 * Summarize a run's artifacts, project-global and scoped to the subject
 * compile. Pure, so every scope is unit-testable.
 */
export function summarizeInventory(inputs: InventoryInputs): InventoryResult {
  const { entries } = inputs;
  const subjectIds = new Set(inputs.subjectBuildInfoIds ?? []);
  const unparseable = inputs.unparseable ?? [];
  const subject = entries.filter(
    (e) => e.buildInfoId !== null && subjectIds.has(e.buildInfoId),
  );
  return {
    ...summarizeScope(entries),
    empty: entries.length === 0,
    unparseable: unparseable.slice(0, MAX_UNPARSEABLE_NAMED),
    unparseableCount: unparseable.length,
    truncatedAt: inputs.truncatedAt ?? [],
    unreadable: inputs.unreadable ?? [],
    subjectBuildInfoCount: subjectIds.size,
    subject: summarizeScope(subject),
    subjectDeployable: summarizeScope(subject.filter((e) => !e.testSource)),
    subjectTestHarness: summarizeScope(subject.filter((e) => e.testSource)),
    // Copied, so a caller holding the summary cannot mutate the input list.
    entries: [...entries],
  };
}

/**
 * Every contract artifact this run wrote, with its bytecode sizes.
 *
 * Discovery follows the build-info dirs rather than assuming
 * artifacts/build-info: a scenario may relocate the artifacts root
 * (graph-horizon emits to build/contracts). The artifacts root is a
 * build-info dir's parent, and artifacts sit at <root>/<sourceName>/<C>.json.
 * The mtime guard keeps committed or stale artifact trees out.
 *
 * The sizes are read straight off the artifacts, which is why this also
 * replaces grepping compiler warnings for oversize contracts: the warning text
 * differs per compiler, while `deployedBytecode` does not.
 *
 * Each entry keeps the artifact's own `buildInfoId`, which is what lets the
 * summary separate the subject compile from the solc ballast a repo may also
 * build.
 */
function inventoryFromScan(
  projectDir: string,
  sinceMs: number,
  scan: ProjectScan,
): InventoryResult {
  const buildInfoDirs = new Set(
    scan.buildInfoFiles.map((f) => path.dirname(f)),
  );
  const problems: WalkProblems = {
    truncatedAt: [...scan.truncatedAt],
    unreadable: [...scan.unreadable],
  };
  if (buildInfoDirs.size === 0) {
    return summarizeInventory({ entries: [], ...problems });
  }

  const entries: ArtifactEntry[] = [];
  const unparseable: string[] = [];
  const seen = new Set<string>();
  const walk = (dir: string, depth: number): void => {
    for (const entry of readDirEntries(dir, projectDir, problems)) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory) {
        if (SKIPPED_DIRS.has(entry.name) || entry.name === "build-info") {
          continue;
        }
        if (depth >= MAX_WALK_DEPTH) {
          problems.truncatedAt.push(path.relative(projectDir, full));
          continue;
        }
        walk(full, depth + 1);
        continue;
      }
      if (
        !entry.name.endsWith(".json") ||
        entry.name.endsWith(".dbg.json") ||
        (mtimeMs(full, projectDir, problems) ?? -1) < sinceMs
      ) {
        continue;
      }
      let artifact;
      try {
        artifact = JSON.parse(readFileSync(full, "utf8"));
      } catch (error) {
        // Counted, not skipped silently: on the control side a dropped
        // artifact shrinks the baseline the solx side is compared against, so
        // a parse failure could only ever weaken an assert.
        unparseable.push(
          `${path.relative(projectDir, full)}: ${(error as Error).message}`,
        );
        continue;
      }
      // An artifact is identified structurally, not by path: the artifacts
      // root also holds build manifests and typing files.
      if (
        typeof artifact?.contractName !== "string" ||
        typeof artifact?.sourceName !== "string" ||
        !("bytecode" in artifact)
      ) {
        continue;
      }
      const id = `${artifact.sourceName}:${artifact.contractName}`;
      if (seen.has(id)) {
        continue;
      }
      seen.add(id);
      entries.push({
        id,
        runtimeBytes: hexBytes(artifact.deployedBytecode),
        creationBytes: hexBytes(artifact.bytecode),
        buildInfoId:
          typeof artifact.buildInfoId === "string"
            ? artifact.buildInfoId
            : null,
        testSource: isTestSource(artifact.sourceName),
      });
    }
  };
  for (const dir of buildInfoDirs) {
    walk(path.dirname(dir), 0);
  }
  return summarizeInventory({
    entries,
    subjectBuildInfoIds: scan.subjectBuildInfoIds,
    unparseable,
    ...problems,
  });
}

/** inventoryFromScan over a fresh scan of the project. */
export function collectInventory(
  projectDir: string,
  sinceMs: number,
): InventoryResult {
  return inventoryFromScan(
    projectDir,
    sinceMs,
    scanProject(projectDir, sinceMs),
  );
}

export interface InventoryComparison {
  /** Both sides produced artifacts, so the comparison means something. */
  comparable: boolean;
  /** Non-empty bytecode on the control, empty on solx — the 0.1.7 defect. */
  emptyUnderSolx: string[];
  /** Artifacts the control produced and solx did not. */
  missingUnderSolx: string[];
  /** Artifacts solx produced and the control did not. */
  extraUnderSolx: string[];
  /** Contracts whose bytecode is non-empty on both sides. */
  bothNonEmpty: number;
}

/**
 * Compare what the two sides produced. Pure, so it is unit-testable.
 *
 * This is the assert the 0.1.7 sweep did not have. solx 0.1.7 on
 * 1inch-swap-vm printed a fatal LLVM error on stderr, exited 0, returned an
 * empty JSON errors array, and emitted 242 artifacts with empty bytecode. The
 * provenance check stayed green, the test runner found no suites, and the
 * verdict logic saw a green exit. Comparing per-contract bytecode presence
 * against the control catches it at the build, with the contract names.
 */
export function compareInventories(
  solx: InventoryResult,
  control: InventoryResult,
): InventoryComparison {
  const comparable = !solx.empty && !control.empty;
  const solxById = new Map(solx.entries.map((e) => [e.id, e]));
  const controlById = new Map(control.entries.map((e) => [e.id, e]));

  const emptyUnderSolx: string[] = [];
  const missingUnderSolx: string[] = [];
  let bothNonEmpty = 0;
  for (const [id, controlEntry] of controlById) {
    const solxEntry = solxById.get(id);
    if (solxEntry === undefined) {
      missingUnderSolx.push(id);
      continue;
    }
    if (controlEntry.runtimeBytes > 0 && solxEntry.runtimeBytes === 0) {
      emptyUnderSolx.push(id);
    } else if (controlEntry.runtimeBytes > 0) {
      bothNonEmpty++;
    }
  }
  const extraUnderSolx = [...solxById.keys()].filter(
    (id) => !controlById.has(id),
  );

  return {
    comparable,
    emptyUnderSolx: emptyUnderSolx.sort(),
    missingUnderSolx: missingUnderSolx.sort(),
    extraUnderSolx: extraUnderSolx.sort(),
    bothNonEmpty,
  };
}

// ---------------------------------------------------------------------------
// Single run
// ---------------------------------------------------------------------------

/** The inventory as it is serialized: the summary without the entry list. */
export type InventorySummary = Omit<InventoryResult, "entries">;

export interface RunRecord {
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
  inventory: InventorySummary;
  compileErrorMarker: boolean;
  /** True when the run died on a signal or the shell's OOM exit code. */
  resourceLimited: boolean;
  /** Set when the process never started; see ExecResult.spawnError. */
  spawnError: string | null;
  logFile: string;
}

/**
 * A run killed by the host rather than rejected by the compiler. SIGKILL with
 * no exit code is what the OOM killer leaves behind, and 137 is the shell's
 * encoding of the same thing. Recorded so a host-resource outcome is never
 * published as a compiler limitation without the reader seeing which it was.
 */
export function isResourceLimited(run: ExecResult): boolean {
  return run.signal === "SIGKILL" || run.exitCode === 137;
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
): { run: RunRecord; inventory: InventoryResult } {
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
  // One walk feeds both the provenance assert and the inventory: they read the
  // same build-info files, and the inventory needs their ids to tell the
  // subject compile apart from ballast.
  const scan = scanProject(projectDir, startedMs);
  const provenance = checkProvenance(scan, projectDir, side, pin);
  const inventory = inventoryFromScan(projectDir, startedMs, scan);
  const { entries: _entries, ...inventorySummary } = inventory;
  console.error(
    `[test-under-solx] ${label}: ${inventory.artifactCount} artifacts, ` +
      `${inventory.withBytecode} with bytecode ` +
      `(subject-version: ${inventory.subject.artifactCount} artifacts, ` +
      `${inventory.subject.withBytecode} with bytecode), max deployable ` +
      `${inventory.subjectDeployable.maxRuntimeBytes}B ` +
      `(${inventory.subjectDeployable.overLimitCount} over EIP-170)` +
      (inventory.unparseableCount > 0
        ? `, ${inventory.unparseableCount} UNPARSEABLE artifact(s)`
        : ""),
  );

  return {
    run: {
      profile,
      side,
      command: argv.join(" "),
      exitCode: run.exitCode,
      signal: run.signal,
      durationMs: run.durationMs,
      ...counts,
      failures,
      provenance,
      inventory: inventorySummary,
      compileErrorMarker: COMPILE_ERROR_RE.test(cleanOutput),
      resourceLimited: isResourceLimited(run),
      spawnError: run.spawnError,
      logFile: path.relative(process.cwd(), logFile),
    },
    inventory,
  };
}

// ---------------------------------------------------------------------------
// Determinism screen
// ---------------------------------------------------------------------------

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Leaf test name for --grep: after '#' (solidity) or the last '>' segment (mocha). */
export function leafName(id: string): string {
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
    // No explicit clean, but not a cheap rerun either: the control side ran
    // last and its own clean removed the solx artifacts and the cache, so each
    // rerun is a full cold solx rebuild plus the grepped tests. Budget the
    // sweep accordingly. The point of the rerun is input determinism.
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

export type Verdict =
  | "pass"
  /**
   * solx ran the suite clean, but the control did not run it, so there is no
   * differential comparison behind the green. Its own label because "pass"
   * next to a blank control column is exactly what a skimmer misreads.
   */
  | "pass-uncontrolled"
  | "test-failures"
  | "harness-failures"
  | "cannot-compile"
  | "invalid-provenance";

/** A failure present under both compilers, with its two raw texts compared. */
export interface SharedFailure {
  id: string;
  /** Whether each side actually reported this failure. */
  found: { solx: boolean; control: boolean };
  /**
   * True when the two sides' failure text is byte-identical, false when it
   * differs, null when a side did not report the failure at all — two absences
   * are not a match.
   */
  identicalRaw: boolean | null;
  /** True when either side's text was cut at RAW_CAP, so only a prefix matched. */
  prefixOnly: boolean;
  /** First differing line of the two raws, when they differ. */
  rawDivergence?: { solx: string; control: string };
}

/**
 * What the gas comparison actually established.
 *
 * `matched`/`diverged` are only used when the check really compared the solx
 * run against a control baseline that exists. Every other outcome — a control
 * that never produced a baseline, a run with nothing to measure, a solx side
 * whose tests or build failed before the comparison — is `inconclusive` with
 * the reason, because a non-zero exit code alone cannot tell them apart.
 */
type GasProbeState = "matched" | "diverged" | "inconclusive";

type GasProbeReason =
  | "gas-identical"
  | "gas-differences"
  | "control-build-failed"
  | "control-tests-failed"
  | "no-measurements"
  | "solx-tests-failed"
  | "solx-build-failed"
  /**
   * The check found added or removed measurements and nothing changed. The
   * plugin passes on that, but the two runs measured different sets of
   * functions, so there is no gas comparison behind the pass.
   */
  | "measurement-population-differs"
  | "check-did-not-report";

/** The changed/added/removed counts a check section prints for itself. */
interface GasSectionCounts {
  changed: number;
  added: number;
  removed: number;
}

interface GasSnapshotResult {
  /** Exit code of the control's --snapshot write. */
  writeExitCode: number | null;
  /** Exit code of the solx --snapshot-check run. */
  checkExitCode: number | null;
  state: GasProbeState;
  reason: GasProbeReason;
  /** What the write run actually left on disk, measured after it ran. */
  baseline: {
    /** Entries in .gas-snapshot after the write; null when absent. */
    gasSnapshotEntries: number | null;
    /** Files in snapshots/ after the write; null when absent. */
    snapshotCheatcodeFiles: number | null;
    /** True when the write recreated at least one of the two. */
    recreated: boolean;
  };
  /** Counts the check printed for itself; null when it printed no section. */
  functionGas: GasSectionCounts | null;
  snapshotCheatcodes: GasSectionCounts | null;
  /** changed+added+removed across both sections; null when neither reported. */
  divergingMeasurements: number | null;
  /** Sample lines of the check's own diff output, capped. For triage only. */
  diffSample: string[];
  /** Snapshot state removed before the write, and restored after the probe. */
  removedBeforeWrite: string[];
  trackedRestored: string[];
  writeLogFile: string;
  checkLogFile: string;
}

interface BuildReproResult {
  /** Hash over (contract id, sizes) of every artifact, per compile. */
  firstHash: string;
  secondHash: string;
  /**
   * True when both compiles produced identical sizes, false when they did not,
   * null when the question was never answered: a failed clean, a failed
   * compile, or a first compile that produced no artifacts all hash two empty
   * maps to the same value.
   */
  identical: boolean | null;
  /** Why identical is null. */
  inconclusiveReason: string | null;
  cleanExitCodes: Array<number | null>;
  compileExitCodes: Array<number | null>;
  artifactCount: number;
  secondArtifactCount: number;
  /** Contracts differing between the compiles, from both key sets. */
  differingContracts: string[];
}

export interface PairRecord {
  scenarioId: string;
  runner: string;
  pair: string;
  solxProfile: string;
  controlProfile: string;
  /** 1-based repetition index; >1 rows ran with a different fuzz seed. */
  repetition: number;
  repetitions: number;
  fuzzSeed: string;
  verdict: Verdict;
  verdictDetail: string;
  solx: RunRecord;
  control: RunRecord | null;
  solxOnlyFailures: string[];
  bothFailures: string[];
  /** The same shared failures, with their two raw texts diffed (M5). */
  sharedFailureDiffs: SharedFailure[];
  controlOnlyFailures: string[];
  eip170Failures: string[];
  inventoryComparison: InventoryComparison | null;
  determinism: DeterminismEntry[];
  compileErrorMarker: { solx: boolean; control: boolean };
  resourceLimited: boolean;
  gasSnapshot: GasSnapshotResult | null;
  buildRepro: BuildReproResult | null;
  timestamp: string;
}

/**
 * A compile-error pattern found in a run's own log. Worth surfacing even when
 * the run exited green: solx can print a fatal compiler error and still exit 0,
 * which is exactly how the empty-build defect stayed invisible. Recorded rather
 * than promoted to a verdict, so a green run with a suspicious log is visible
 * without a regex deciding the result.
 */
function markerNote(run: RunRecord): string {
  return run.compileErrorMarker
    ? ` (compile-error pattern present in the ${run.side} log despite the run reporting success — inspect ${run.logFile})`
    : "";
}

/** A run whose printed summary is trustworthy for set-difference math. */
export function summaryProblems(run: RunRecord): string | null {
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

/** Human-readable list, capped so a verdict detail stays readable. */
function nameSome(ids: string[], cap = 8): string {
  return ids.length <= cap
    ? ids.join(", ")
    : `${ids.slice(0, cap).join(", ")}, and ${ids.length - cap} more`;
}

/**
 * The population the zero-bytecode guard is evaluated over, and its label.
 *
 * The subject-version subset when the run's build-infos identify one, because
 * the project-global numbers also count ballast: lidofinance-core compiles six
 * other solc versions into the same artifacts root, and their bytecode alone
 * is enough to hide a subject build in which every artifact came out empty.
 * Falls back to project-global only when no fresh build-info sat at the
 * subject version, and says so.
 */
export function bytecodeScope(inventory: InventorySummary): {
  scope: InventoryScope;
  label: string;
} {
  return inventory.subjectBuildInfoCount > 0
    ? { scope: inventory.subject, label: `at solc ${BENCHMARK_SOLC_VERSION}` }
    : {
        scope: inventory,
        label:
          "project-wide (no fresh build-info at solc " +
          `${BENCHMARK_SOLC_VERSION}, so the subject compile could not be ` +
          "scoped out)",
      };
}

/**
 * Why this control cannot serve as a baseline, or null when it ran the suite.
 *
 * The single notion of "the control actually ran" the verdicts share: it
 * decides both the pass-uncontrolled label and whether a control's test count
 * is low enough to mean anything.
 */
function controlNotWorking(
  control: RunRecord,
  controlTotal: number,
): string | null {
  const controlProblem = summaryProblems(control);
  const controlScope = bytecodeScope(control.inventory);
  return control.spawnError != null
    ? `the control run could not be spawned on this host: ${control.spawnError}`
    : !control.provenance.ok
      ? `control provenance failed: ${control.provenance.problems.join("; ")}`
      : controlProblem !== null
        ? `control-side issue: ${controlProblem}`
        : controlTotal === 0
          ? "the control executed no tests"
          : // Scoped like every other artifact claim here: on a repo that also
            // compiles solc ballast, the project-wide count stays non-zero even
            // when the control's own subject compile produced nothing.
            controlScope.scope.artifactCount === 0
            ? `the control produced no artifacts ${controlScope.label}`
            : null;
}

export function classify(
  solx: RunRecord,
  control: RunRecord,
  inventory: InventoryComparison,
): { verdict: Verdict; detail: string } {
  // A process that never started is a statement about this host, not about
  // the compiler. It leaves a null exit code and no output, which every
  // cannot-compile guard below would read as a build that was rejected.
  if (solx.spawnError != null) {
    return {
      verdict: "harness-failures",
      detail:
        `the solx run could not be spawned on this host: ${solx.spawnError} ` +
        `— no compiler ran, so this row says nothing about solx`,
    };
  }

  // A solx compile failure first: build-info is only written when the whole
  // build succeeds, so the provenance gate would otherwise mask a
  // cannot-compile verdict as invalid-provenance.
  const solxRanNoTests =
    solx.passing === null && solx.failing === null && solx.skipped === null;
  const resourceNote = solx.resourceLimited
    ? ` — HOST RESOURCE LIMIT, not a compiler rejection: the run died on ` +
      `signal ${solx.signal ?? "?"} (exit ${solx.exitCode}) on a host with ` +
      `${(totalmem() / 1024 ** 3).toFixed(1)} GiB of RAM`
    : "";
  if (solxRanNoTests && solx.exitCode !== 0 && solx.compileErrorMarker) {
    return {
      verdict: "cannot-compile",
      detail: `test-source build fails before any test runs${resourceNote}`,
    };
  }
  // The same conclusion without needing the log regex: no artifacts at all
  // plus a non-zero exit is a build that did not happen.
  if (solxRanNoTests && solx.exitCode !== 0 && solx.inventory.empty) {
    return {
      verdict: "cannot-compile",
      detail:
        `no artifacts were produced and no tests ran (exit ${solx.exitCode})` +
        resourceNote,
    };
  }

  // A build that "succeeded" and produced nothing executable. This is the
  // check the 0.1.7 sweep lacked: solx exited 0 with an empty errors array
  // over 242 artifacts that all carried empty bytecode, and every other gate
  // stayed green. Placed before the provenance gate for the same reason
  // cannot-compile is: build-info exists, so provenance passes.
  const { scope: solxScope, label: scopeLabel } = bytecodeScope(solx.inventory);
  if (solxScope.artifactCount > 0 && solxScope.withBytecode === 0) {
    return {
      verdict: "cannot-compile",
      detail:
        `the solx build wrote ${solxScope.artifactCount} artifacts ` +
        `${scopeLabel} and NONE carries bytecode — the compiler produced no ` +
        `executable code while reporting success (exit ${solx.exitCode}); ` +
        `check the run log for a fatal error on stderr`,
    };
  }
  // Build-infos at the subject version exist, but no artifact says it came out
  // of one. Then the scoped guard above had nothing to evaluate, and the
  // measurement — not necessarily the compiler — is broken.
  if (
    solx.inventory.subjectBuildInfoCount > 0 &&
    solx.inventory.subject.artifactCount === 0 &&
    solx.inventory.artifactCount > 0
  ) {
    return {
      verdict: "harness-failures",
      detail:
        `artifact attribution failed: ${solx.inventory.artifactCount} ` +
        `artifact(s) were written and none references a build-info at solc ` +
        `${BENCHMARK_SOLC_VERSION}, so nothing here can be scoped to the ` +
        `compiler under test`,
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
  // An artifact that did not parse is not an artifact that was not written. On
  // the control side it silently shrinks the baseline the solx side is
  // compared against, so it can only ever weaken the asserts below.
  const unparseable = [
    ...(solx.inventory.unparseableCount > 0
      ? [`${solx.inventory.unparseableCount} on the solx side`]
      : []),
    ...(control.inventory.unparseableCount > 0
      ? [`${control.inventory.unparseableCount} on the control side`]
      : []),
  ];
  if (unparseable.length > 0) {
    return {
      verdict: "harness-failures",
      detail:
        `unparseable artifact(s) (${unparseable.join(", ")}) — the inventory ` +
        `comparison is over an incomplete artifact set, so it cannot be ` +
        `trusted: ` +
        nameSome([
          ...solx.inventory.unparseable,
          ...control.inventory.unparseable,
        ]),
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
        `test universe mismatch: solx executed no tests (the control executed ` +
        `${controlTotal}) — a green exit that ran nothing is not a pass (check ` +
        `the build log for swallowed compiler errors)`,
    };
  }

  // A partial shortfall is the same defect with some suites surviving. Only the
  // all-or-nothing case was caught originally, so a 700-of-706 disappearance
  // would have read as a pass.
  if (controlTotal > 0 && solxTotal < controlTotal * UNIVERSE_SHORTFALL_FLOOR) {
    const share = ((solxTotal / controlTotal) * 100).toFixed(1);
    return {
      verdict: "harness-failures",
      detail:
        `test universe mismatch: solx executed ${solxTotal} tests against the ` +
        `control's ${controlTotal} (${share}%, below the ` +
        `${(UNIVERSE_SHORTFALL_FLOOR * 100).toFixed(0)}% floor) — the two sides ` +
        `did not run the same suite, so the set-difference is not a solx result ` +
        `(check the build log for swallowed compiler errors)`,
    };
  }

  // The same shortfall the other way round. Only a control that actually ran
  // the suite has a test universe to be short of: the shapes that produce a
  // pass-uncontrolled verdict below never ran it, and their low counts are
  // already reported as what they are.
  if (
    controlNotWorking(control, controlTotal) === null &&
    controlTotal < solxTotal * UNIVERSE_SHORTFALL_FLOOR
  ) {
    const share = ((controlTotal / solxTotal) * 100).toFixed(1);
    return {
      verdict: "harness-failures",
      detail:
        `test universe mismatch: the control executed ${controlTotal} tests ` +
        `against solx's ${solxTotal} (${share}%, below the ` +
        `${(UNIVERSE_SHORTFALL_FLOOR * 100).toFixed(0)}% floor) — the two sides ` +
        `did not run the same suite, so the set-difference is not a solx result ` +
        `(check the control build log)`,
    };
  }

  // Per-contract bytecode presence, against the control. A contract the
  // control compiled to code and solx compiled to nothing is the defect class
  // this whole comparison exists to catch, and it is invisible in test counts
  // whenever the affected contract has no test of its own.
  if (inventory.comparable && inventory.emptyUnderSolx.length > 0) {
    return {
      verdict: "harness-failures",
      detail:
        `bytecode inventory mismatch: ${inventory.emptyUnderSolx.length} ` +
        `contract(s) carry bytecode under the control and NONE under solx ` +
        `(${nameSome(inventory.emptyUnderSolx)}) — the two sides did not ` +
        `execute the same code, so the set-difference is not a solx result`,
    };
  }
  if (inventory.comparable && inventory.missingUnderSolx.length > 0) {
    return {
      verdict: "harness-failures",
      detail:
        `artifact inventory mismatch: the control produced ` +
        `${inventory.missingUnderSolx.length} artifact(s) that the solx build ` +
        `did not (${nameSome(inventory.missingUnderSolx)}) — the two sides ` +
        `did not compile the same contract set`,
    };
  }

  // The solx side ran tests and has zero failures. A broken control (aave:
  // solc-via-ir cannot compile the test tree) is not held against solx, but
  // it is not a controlled pass either: without a control there is nothing to
  // set-difference against, so it gets its own verdict.
  if (solx.failures.length === 0 && solx.exitCode === 0) {
    const controlIssue = controlNotWorking(control, controlTotal);
    if (controlIssue !== null) {
      return {
        verdict: "pass-uncontrolled",
        detail:
          `solx ran ${solxTotal} test(s) clean, but this row has NO working ` +
          `control (${controlIssue}), so nothing here is a differential ` +
          `result — it establishes the test universe under solx only` +
          markerNote(solx) +
          markerNote(control),
      };
    }
    return {
      verdict: "pass",
      detail: (markerNote(solx) + markerNote(control)).trim(),
    };
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
  return {
    verdict: "pass",
    detail: (markerNote(solx) + markerNote(control)).trim(),
  };
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

function loadAllResults(outDir: string): PairRecord[] {
  const resultsDir = path.join(outDir, "results");
  if (!existsSync(resultsDir)) {
    return [];
  }
  const records: PairRecord[] = [];
  for (const file of readdirSync(resultsDir).sort()) {
    if (
      !file.endsWith(".json") ||
      file.endsWith(".environment.json") ||
      file.endsWith(".error.json")
    ) {
      continue;
    }
    // A single unreadable checkpoint must not stop the report from being
    // regenerated for every other pair in a multi-hour sweep.
    try {
      records.push(
        JSON.parse(readFileSync(path.join(resultsDir, file), "utf8")),
      );
    } catch (error) {
      console.error(
        `[test-under-solx] skipping unreadable result ${file}: ${(error as Error).message}`,
      );
    }
  }
  return records;
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

export function renderMarkdown(records: PairRecord[], pin: string): string {
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

  // Deployed-bytecode sizes, read off the artifacts rather than grepped out of
  // compiler warnings: the two compilers word their oversize warning
  // differently, and a control that emits no warning at all is not the same
  // thing as a control that stayed under the limit.
  lines.push(
    "",
    `## Deployed bytecode sizes (EIP-170 limit ${EIP170_LIMIT_BYTES} B)`,
    "",
    `Scoped to non-test sources compiled at solc ${BENCHMARK_SOLC_VERSION}. ` +
      "Contracts from a repo's test tree are deployed by the Solidity test " +
      "runner with the code-size limit lifted, so they are exempt from the " +
      "limit and are shown in their own column rather than counted as " +
      "over-limit. Artifacts from other solc versions a repo also compiles " +
      "(lidofinance-core builds six) are excluded entirely: neither compiler " +
      "under comparison produced them. Sizes are read off the artifacts, not " +
      "the warning text. A cell reads `unattributed` when the run wrote no " +
      `build-info at solc ${BENCHMARK_SOLC_VERSION} to scope by. Mocks and ` +
      "generated test-support contracts that live in source trees rather than " +
      "a test tree are still counted (openzeppelin's contracts-exposed " +
      "wrappers, graph-horizon's and lidofinance-core's contracts/mocks): the " +
      "limit does apply to them. Read a row as a statement about everything " +
      "the repo compiles, not about its public library surface.",
    "",
    "| scenario | runner | pair | solx max | solx over | control max | control over | largest under solx | solx test-harness max (exempt) |",
    "|---|---|---|--:|--:|--:|--:|---|--:|",
  );
  /** A scope cell: the value, or why there is none. */
  const sizeCell = (
    inv: InventorySummary | undefined,
    read: (s: InventoryScope) => number | string | null,
  ): string => {
    if (inv === undefined) {
      return "—";
    }
    if (inv.subjectBuildInfoCount === undefined) {
      return "n/a (pre-scoping record)";
    }
    if (inv.subjectBuildInfoCount === 0) {
      return "unattributed";
    }
    const value = read(inv.subjectDeployable);
    return value === null ? "—" : String(value);
  };
  for (const r of records) {
    const si = r.solx.inventory;
    const ci = r.control?.inventory;
    const harness =
      si?.subjectBuildInfoCount === undefined || si.subjectBuildInfoCount === 0
        ? sizeCell(si, () => null)
        : si.subjectTestHarness.artifactCount === 0
          ? // No test-tree contracts at all, which is not the same as no
            // oversize ones.
            "none"
          : `${si.subjectTestHarness.maxRuntimeBytes} B`;
    lines.push(
      `| ${r.scenarioId} | ${r.runner} | ${r.solxProfile} vs ${r.controlProfile} | ` +
        `${sizeCell(si, (s) => `${s.maxRuntimeBytes} B`)} | ` +
        `${sizeCell(si, (s) => s.overLimitCount)} | ` +
        `${sizeCell(ci, (s) => `${s.maxRuntimeBytes} B`)} | ` +
        `${sizeCell(ci, (s) => s.overLimitCount)} | ` +
        `${sizeCell(si, (s) => s.maxRuntimeContract)} | ` +
        `${harness} |`,
    );
  }

  // Nullish, not !== null: a record written before the probes existed has no
  // such key at all, and undefined would pass a !== null filter and then be
  // dereferenced.
  const withGas = records.filter((r) => r.gasSnapshot != null);
  if (withGas.length > 0) {
    lines.push(
      "",
      "## Gas snapshot check (solx measured against the control's snapshot)",
      "",
      "Divergence data, not a verdict: two compilers are expected to differ " +
        "on gas. The outcome column is the state the comparison actually " +
        "reached. `inconclusive` means no comparison happened, with the " +
        "reason: the control never wrote a baseline, the run measured " +
        "nothing, the solx side's build or tests failed first, or the two " +
        "runs measured different sets of functions. A non-zero exit code " +
        "alone cannot tell those apart from a real gas difference, which is " +
        "why it is not the signal here. The counts are the ones the check " +
        "prints for itself (changed + added + removed); a matched row reads 0 " +
        "because a fully matching check prints no differences at all.",
      "",
      "| scenario | pair | outcome | reason | diverging measurements | gas baseline entries | cheatcode baseline files |",
      "|---|---|---|---|--:|--:|--:|",
    );
    for (const r of withGas) {
      const g = r.gasSnapshot!;
      lines.push(
        `| ${r.scenarioId} | ${r.solxProfile} vs ${r.controlProfile} | ` +
          `${g.state === "matched" ? "matched" : g.state === "diverged" ? "DIVERGED" : "inconclusive"} | ` +
          `${g.reason} | ` +
          `${g.divergingMeasurements ?? "—"} | ` +
          `${g.baseline?.gasSnapshotEntries ?? "—"} | ` +
          `${g.baseline?.snapshotCheatcodeFiles ?? "—"} |`,
      );
    }
  }

  const withRepro = records.filter((r) => r.buildRepro != null);
  if (withRepro.length > 0) {
    lines.push(
      "",
      "## Build determinism (same profile compiled twice from clean)",
      "",
      "Whether one compiler produces the same output twice. Not a repeated " +
        "measurement of a pair: the test suites still ran once each. " +
        "`inconclusive` means the two compiles cannot be compared, because a " +
        "clean or a compile failed, or the first compile produced no " +
        "artifacts — two empty builds hash equal.",
      "",
      "| scenario | profile | artifacts | identical sizes | note |",
      "|---|---|--:|---|---|",
    );
    for (const r of withRepro) {
      const b = r.buildRepro!;
      lines.push(
        `| ${r.scenarioId} | ${r.solxProfile} | ${b.artifactCount} | ` +
          `${b.identical === null ? "inconclusive" : b.identical ? "yes" : `NO (${b.differingContracts.length} differ)`} | ` +
          `${b.inconclusiveReason ?? ""} |`,
      );
    }
  }

  // A pass computed over a set the walk could not fully read is exactly the
  // shape this harness refuses elsewhere, so a row with walk caveats gets a
  // detail block even when its verdict is a clean pass.
  const hasWalkCaveats = (r: PairRecord): boolean =>
    [r.solx.inventory, r.control?.inventory].some(
      (inv) =>
        inv !== undefined &&
        ((inv.unparseableCount ?? 0) > 0 ||
          (inv.truncatedAt ?? []).length > 0 ||
          (inv.unreadable ?? []).length > 0),
    );
  const withDetail = records.filter(
    (r) =>
      r.verdict !== "pass" ||
      r.solxOnlyFailures.length > 0 ||
      r.bothFailures.length > 0 ||
      hasWalkCaveats(r),
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
          // Identical text under both compilers is what makes "same failure"
          // a defensible claim. A shared identifier failing for two different
          // reasons is the shape a miscompilation could hide behind, so the
          // raws are diffed rather than assumed equal.
          const diff = r.sharedFailureDiffs?.find((d) => d.id === id);
          const tag =
            diff === undefined
              ? ""
              : diff.identicalRaw === null
                ? ` (NOT COMPARED — the failure text is missing on ${diff.found?.solx === false && diff.found?.control === false ? "both sides" : diff.found?.solx === false ? "the solx side" : "the control side"})`
                : diff.identicalRaw
                  ? diff.prefixOnly === true
                    ? ` (failure text identical for the first ${RAW_CAP} recorded characters; the traces are longer than that, so they may diverge past it)`
                    : " (identical failure text on both sides)"
                  : " (DIFFERENT failure text on the two sides — inspect before" +
                    " calling it the same failure)";
          lines.push(`- \`${id}\`${tag}`);
          if (diff?.rawDivergence !== undefined) {
            lines.push(
              `  - solx: \`${diff.rawDivergence.solx}\``,
              `  - control: \`${diff.rawDivergence.control}\``,
            );
          }
        }
      }
      const inv = r.inventoryComparison;
      if (
        inv !== null &&
        inv !== undefined &&
        (inv.emptyUnderSolx.length > 0 ||
          inv.missingUnderSolx.length > 0 ||
          inv.extraUnderSolx.length > 0)
      ) {
        lines.push("", "bytecode/artifact inventory differences:", "");
        if (inv.emptyUnderSolx.length > 0) {
          lines.push(
            `- ${inv.emptyUnderSolx.length} contract(s) with bytecode under the control and EMPTY under solx: ${nameSome(inv.emptyUnderSolx, 20)}`,
          );
        }
        if (inv.missingUnderSolx.length > 0) {
          lines.push(
            `- ${inv.missingUnderSolx.length} artifact(s) the control produced and solx did not: ${nameSome(inv.missingUnderSolx, 20)}`,
          );
        }
        if (inv.extraUnderSolx.length > 0) {
          lines.push(
            `- ${inv.extraUnderSolx.length} artifact(s) solx produced and the control did not: ${nameSome(inv.extraUnderSolx, 20)}`,
          );
        }
      }
      // Anything the artifact walks could not read. Printed because a number
      // computed over a set that was not fully readable is not the number the
      // column claims to be.
      for (const side of ["solx", "control"] as const) {
        const si = side === "solx" ? r.solx.inventory : r.control?.inventory;
        if (si === undefined) {
          continue;
        }
        const notes = [
          (si.unparseableCount ?? 0) > 0
            ? `${si.unparseableCount} unparseable artifact(s): ${nameSome(si.unparseable ?? [], 10)}`
            : null,
          (si.truncatedAt ?? []).length > 0
            ? `walk depth cap stopped at: ${nameSome(si.truncatedAt, 10)}`
            : null,
          (si.unreadable ?? []).length > 0
            ? `unreadable path(s): ${nameSome(si.unreadable, 10)}`
            : null,
        ].filter((n) => n !== null);
        if (notes.length > 0) {
          lines.push("", `${side} inventory caveats:`, "");
          for (const note of notes) {
            lines.push(`- ${note}`);
          }
        }
      }
    }
  }
  return lines.join("\n");
}

/** Scenarios whose body threw, from the checkpointed error files. */
function loadScenarioErrors(
  outDir: string,
): Array<{ scenarioId: string; message: string }> {
  const resultsDir = path.join(outDir, "results");
  if (!existsSync(resultsDir)) {
    return [];
  }
  const errors: Array<{ scenarioId: string; message: string }> = [];
  for (const file of readdirSync(resultsDir).sort()) {
    if (!file.endsWith(".error.json")) {
      continue;
    }
    try {
      const parsed = JSON.parse(
        readFileSync(path.join(resultsDir, file), "utf8"),
      );
      errors.push({
        scenarioId: parsed.scenarioId ?? file,
        message: parsed.message ?? "(no message recorded)",
      });
    } catch {
      errors.push({ scenarioId: file, message: "(error file unreadable)" });
    }
  }
  return errors;
}

function regenerateReports(outDir: string, pin: string): string {
  const records = loadAllResults(outDir);
  const errors = loadScenarioErrors(outDir);
  const markdown =
    renderMarkdown(records, pin) +
    (errors.length === 0
      ? ""
      : [
          "",
          "",
          "## Scenarios that did not produce results",
          "",
          "These scenarios threw before or between their pairs, so the matrix " +
            "above has no rows for them. An absent row is not a passing row.",
          "",
          "| scenario | error |",
          "|---|---|",
          ...errors.map((e) => `| ${e.scenarioId} | ${e.message} |`),
        ].join("\n"));
  writeFileSync(path.join(outDir, "report.md"), markdown);
  // An object rather than a bare array of pairs, so the machine-readable file
  // carries the scenarios that produced no pairs at all. A consumer reading
  // only successful pairs would infer a clean sweep from their absence.
  writeFileSync(
    path.join(outDir, "summary.json"),
    JSON.stringify(
      {
        scenarioErrors: errors,
        pairs: records.map((r) => ({
          scenarioId: r.scenarioId,
          runner: r.runner,
          solxProfile: r.solxProfile,
          controlProfile: r.controlProfile,
          repetition: r.repetition ?? 1,
          repetitions: r.repetitions ?? 1,
          fuzzSeed: r.fuzzSeed ?? null,
          verdict: r.verdict,
          verdictDetail: r.verdictDetail,
          solx: {
            passing: r.solx.passing,
            failing: r.solx.failing,
            skipped: r.solx.skipped,
            exitCode: r.solx.exitCode,
            durationMs: r.solx.durationMs,
            inventory: r.solx.inventory ?? null,
            resourceLimited: r.solx.resourceLimited ?? false,
            spawnError: r.solx.spawnError ?? null,
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
                  inventory: r.control.inventory ?? null,
                  resourceLimited: r.control.resourceLimited ?? false,
                  spawnError: r.control.spawnError ?? null,
                },
          solxOnlyFailures: r.solxOnlyFailures,
          bothFailures: r.bothFailures,
          sharedFailureDiffs: r.sharedFailureDiffs ?? [],
          controlOnlyFailures: r.controlOnlyFailures,
          eip170Failures: r.eip170Failures,
          inventoryComparison: r.inventoryComparison ?? null,
          gasSnapshot: r.gasSnapshot ?? null,
          buildRepro: r.buildRepro ?? null,
          determinism: r.determinism,
          // Per-pair JSONs written before this field existed carry the marker
          // only inside the two run records, so fall back to those.
          compileErrorMarker: r.compileErrorMarker ?? {
            solx: r.solx.compileErrorMarker,
            control: r.control?.compileErrorMarker ?? false,
          },
          timestamp: r.timestamp,
        })),
      },
      null,
      2,
    ),
  );
  return markdown;
}

/**
 * regenerateReports, with a reporting failure kept out of the sweep's way.
 *
 * Used at the two points that sit outside the per-pair loop: the scenario
 * catch block, and the end of the run. A throw there would be unhandled, so a
 * rendering bug would discard results that are already checkpointed on disk —
 * which is the failure mode the per-scenario isolation exists to prevent.
 */
function tryRegenerateReports(outDir: string, pin: string): boolean {
  try {
    regenerateReports(outDir, pin);
    return true;
  } catch (error) {
    console.error(
      `[test-under-solx] could not regenerate the report from ` +
        `${outDir}/results: ${(error as Error).message} — the per-pair JSONs ` +
        `are intact`,
    );
    return false;
  }
}

// ---------------------------------------------------------------------------
// Environment metadata
// ---------------------------------------------------------------------------

/** The `version` field of a package.json, or null when it cannot be read. */
function readManifestVersion(manifest: string): string | null {
  try {
    return JSON.parse(readFileSync(manifest, "utf8")).version ?? null;
  } catch {
    return null;
  }
}

/**
 * Walk up from a resolved file to the package.json that owns it, matched by
 * name so a parent package's manifest cannot be mistaken for the target's.
 */
function owningVersion(entry: string, packageName: string): string | null {
  let dir = path.dirname(entry);
  for (;;) {
    const manifest = path.join(dir, "package.json");
    if (existsSync(manifest)) {
      try {
        const pkg = JSON.parse(readFileSync(manifest, "utf8"));
        if (pkg.name === packageName) {
          return pkg.version ?? null;
        }
      } catch {
        // Keep walking; an unreadable manifest on the way up is not the answer.
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
}

/**
 * Versions of a package as it sits in pnpm's isolated store, read from the real
 * manifest rather than parsed out of the directory name.
 *
 * The store encodes `<name-with-+>@<version>`, and several versions of one
 * package can coexist there because different dependents asked for different
 * ranges. Returning one of them arbitrarily reports a transitive dependency's
 * copy as the one in use — measured during the 0.1.8 sweep, where a
 * name-scanning probe reported hardhat 2.23.0 and EDR 0.10.0 for a Hardhat 3
 * scenario. So every distinct version found is returned, and the caller renders
 * an ambiguous answer as ambiguous.
 */
function pnpmStoreVersions(projectDir: string, packageName: string): string[] {
  // Walking up, because a workspace package's store sits at the repo root:
  // graph-horizon runs in packages/horizon and its store is two levels above.
  let store: string | null = null;
  let dir = projectDir;
  for (;;) {
    const candidate = path.join(dir, "node_modules", ".pnpm");
    if (existsSync(candidate)) {
      store = candidate;
      break;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  if (store === null) {
    return [];
  }
  const prefix = `${packageName.replace("/", "+")}@`;
  const versions = new Set<string>();
  let entries: string[];
  try {
    entries = readdirSync(store);
  } catch {
    return [];
  }
  for (const entry of entries) {
    if (!entry.startsWith(prefix)) {
      continue;
    }
    const version = readManifestVersion(
      path.join(store, entry, "node_modules", packageName, "package.json"),
    );
    if (version !== null) {
      versions.add(version);
    }
  }
  return [...versions].sort();
}

/**
 * The version of a package as the checkout resolves it, if resolvable.
 *
 * Four strategies, because no single one covers the layouts in this corpus. A
 * transitive dependency under pnpm has no `node_modules/<pkg>` symlink and may
 * not export `./package.json`, so the first three all miss it and only the
 * store scan answers — which is why the 0.1.8 sweep's environment captures
 * recorded null for `@nomicfoundation/edr`.
 */
export function installedVersion(
  projectDir: string,
  packageName: string,
): string | null {
  const require_ = createRequire(path.join(projectDir, "index.js"));

  // 1. Direct dependencies that export ./package.json.
  try {
    return readManifestVersion(require_.resolve(`${packageName}/package.json`));
  } catch {
    // Not exported, or not resolvable from here.
  }

  // 2. Resolvable packages that do not export their manifest: resolve the
  //    entry point and walk up to the manifest that owns it.
  try {
    const version = owningVersion(require_.resolve(packageName), packageName);
    if (version !== null) {
      return version;
    }
  } catch {
    // Not resolvable from the project dir at all.
  }

  // 3. Flat node_modules, walking up: monorepo scenarios hoist to the clone
  //    root rather than the workdir's own node_modules.
  let dir = projectDir;
  for (;;) {
    const manifest = path.join(
      dir,
      "node_modules",
      packageName,
      "package.json",
    );
    if (existsSync(manifest)) {
      return readManifestVersion(manifest);
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }

  // 4. pnpm's isolated store, for transitive packages the resolver cannot see
  //    from here. Several versions means the answer is ambiguous, and it is
  //    reported as ambiguous rather than narrowed to a guess.
  const stored = pnpmStoreVersions(projectDir, packageName);
  return stored.length === 0 ? null : stored.join(", ");
}

function captureEnvironment(
  projectDir: string,
  workingDir: string,
  pin: string,
  scenarioCommit: string | undefined,
  outDir: string,
  scenarioId: string,
  fuzzSeed: string,
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

  // The harness's own revision. Without it the evidence cannot be tied to the
  // code that produced it, which is how the previous sweep ended up carrying a
  // verdict string that no committed harness emitted.
  const harnessHead = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: import.meta.dirname,
    encoding: "utf8",
  });
  meta.harnessCommit =
    harnessHead.status === 0 ? harnessHead.stdout.trim() : null;
  const harnessDirty = spawnSync("git", ["status", "--porcelain"], {
    cwd: import.meta.dirname,
    encoding: "utf8",
  });
  meta.harnessDirty =
    harnessDirty.status === 0 ? harnessDirty.stdout.trim() !== "" : null;

  // The versions actually SERVED into the checkout, which are not necessarily
  // this monorepo's sources: only the locally-built packages come from here,
  // the rest resolve through the registry.
  meta.installedVersions = {
    hardhat: installedVersion(projectDir, "hardhat"),
    "@nomicfoundation/edr": installedVersion(
      projectDir,
      "@nomicfoundation/edr",
    ),
    "@nomicfoundation/hardhat-slang-solx": installedVersion(
      projectDir,
      "@nomicfoundation/hardhat-slang-solx",
    ),
    "@nomicfoundation/hardhat-vendored": installedVersion(
      projectDir,
      "@nomicfoundation/hardhat-vendored",
    ),
  };

  meta.host = {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    totalMemoryGb: Number((totalmem() / 1024 ** 3).toFixed(2)),
  };
  meta.fuzzSeed = fuzzSeed;

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

// ---------------------------------------------------------------------------
// Prime steps
// ---------------------------------------------------------------------------

export interface PrimeStep {
  name: string;
  command: string;
}

/**
 * The scenario's declared preparation steps: the `measure: false` steps of its
 * benchmark step sequences (e.g. graph-horizon's workspace-dep build,
 * 1inch-swap-vm's dependency-pragma relaxation, the warm-cache compiles).
 *
 * The 0.1.7 sweep ran these by hand and recorded them only in a state file,
 * which means its documented commands did not reproduce it. Reading them out
 * of scenario.json keeps one declaration.
 */
export function collectPrimeSteps(definition: {
  benchmark?: {
    commands?: Record<string, unknown>;
  };
}): PrimeStep[] {
  const steps: PrimeStep[] = [];
  for (const entry of Object.values(definition.benchmark?.commands ?? {})) {
    const stepMap = (entry as { steps?: Record<string, unknown> }).steps;
    if (stepMap === undefined) {
      continue;
    }
    for (const [name, step] of Object.entries(stepMap)) {
      const { command, measure } = step as {
        command: string;
        measure?: boolean;
      };
      // measure:true steps are the benchmark's own timed compiles. They are
      // measurements, not preparation, so they are not run here.
      if (measure === false) {
        steps.push({ name, command });
      }
    }
  }
  return steps;
}

/** A prime step that runs forge. */
export function isForgeStep(step: PrimeStep): boolean {
  return /(^|[\s/&|;])forge(\s|$)/.test(step.command);
}

/**
 * Prime steps minus the forge ones.
 *
 * Every solx scenario declares a "warm forge solc cache" step, because the
 * timing benchmark compares against forge. This harness never invokes forge,
 * so those steps change no result here — they only add minutes per scenario
 * and a failure mode (a missing ./.foundry/forge, a foundry profile that no
 * longer resolves) that would otherwise abort a scenario for no gain.
 */
export function dropForgeSteps(steps: PrimeStep[]): {
  kept: PrimeStep[];
  skipped: PrimeStep[];
} {
  return {
    kept: steps.filter((s) => !isForgeStep(s)),
    skipped: steps.filter((s) => isForgeStep(s)),
  };
}

function runPrimeSteps(
  steps: PrimeStep[],
  workingDir: string,
  env: Record<string, string | undefined>,
  logFile: string,
): void {
  if (steps.length === 0) {
    return;
  }
  const log: string[] = [];
  for (const step of steps) {
    console.error(
      `[test-under-solx] prime step "${step.name}": ${step.command}`,
    );
    const started = Date.now();
    try {
      const output = execSync(step.command, {
        shell: "/bin/bash",
        cwd: workingDir,
        env,
        encoding: "utf8",
        maxBuffer: MAX_BUFFER,
        stdio: ["ignore", "pipe", "pipe"],
      });
      log.push(
        `=== ${step.name} (ok, ${Date.now() - started}ms)\n$ ${step.command}\n${output}`,
      );
    } catch (error) {
      const e = error as { status?: number; stdout?: string; stderr?: string };
      log.push(
        `=== ${step.name} (FAILED exit ${e.status})\n$ ${step.command}\n${e.stdout ?? ""}\n${e.stderr ?? ""}`,
      );
      writeFileSync(logFile, log.join("\n\n"));
      throw new Error(
        `prime step "${step.name}" failed (exit ${e.status}) in ${workingDir}; see ${logFile}`,
      );
    }
  }
  writeFileSync(logFile, log.join("\n\n"));
}

// ---------------------------------------------------------------------------
// Gas snapshot probe and build-reproducibility probe
// ---------------------------------------------------------------------------

/** Where hardhat's gas-analytics plugin keeps its baselines, under paths.root. */
const GAS_SNAPSHOT_FILE = ".gas-snapshot";
const SNAPSHOT_CHEATCODES_DIR = "snapshots";

/** Lines of a --snapshot-check run worth sampling into the record, for triage. */
const GAS_DIFF_SAMPLE_RE = /^\s{2,}[-+~]|\(\d+ ->/;

const MAX_GAS_DIFF_SAMPLE = 40;

/**
 * The changed/added/removed counts a check section prints for itself. Parsed
 * rather than inferred from a line-shape regex: the plugin formats the header
 * as "<section>: 3 changed, 1 added, 2 removed" (helpers/utils.ts
 * formatSectionHeader), which is the only place those numbers are exact. A
 * regex over diff-looking lines counts bullets and negative numbers too.
 */
export function parseGasSectionCounts(
  clean: string,
  section: string,
): GasSectionCounts | null {
  const header = new RegExp(`^${escapeRegExp(section)}:(.*)$`, "m").exec(clean);
  // The same header carries the plugin's no-baseline message, which is not a
  // report of zero differences: it says nothing was compared.
  if (header === null || /no snapshots? found/.test(header[1])) {
    return null;
  }
  const read = (word: string): number => {
    const match = new RegExp(`(\\d+) ${word}`).exec(header[1]);
    return match === null ? 0 : Number(match[1]);
  };
  return {
    changed: read("changed"),
    added: read("added"),
    removed: read("removed"),
  };
}

/** Entries in a written .gas-snapshot (one per line), or null when absent. */
function countGasSnapshotEntries(projectDir: string): number | null {
  const file = path.join(projectDir, GAS_SNAPSHOT_FILE);
  if (!existsSync(file)) {
    return null;
  }
  try {
    return readFileSync(file, "utf8")
      .split("\n")
      .filter((line) => line.trim() !== "").length;
  } catch {
    return null;
  }
}

/** Files in a written snapshots/ dir, or null when absent. */
function countSnapshotCheatcodeFiles(projectDir: string): number | null {
  const dir = path.join(projectDir, SNAPSHOT_CHEATCODES_DIR);
  if (!existsSync(dir)) {
    return null;
  }
  try {
    return readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile())
      .length;
  } catch {
    return null;
  }
}

/** The snapshot paths a scenario tracks in git, relative to projectDir. */
function trackedSnapshotPaths(projectDir: string): string[] {
  const tracked = spawnSync(
    "git",
    ["ls-files", "--", GAS_SNAPSHOT_FILE, SNAPSHOT_CHEATCODES_DIR],
    { cwd: projectDir, encoding: "utf8" },
  );
  if (tracked.status !== 0) {
    return [];
  }
  return tracked.stdout.split("\n").filter((line) => line.trim() !== "");
}

/**
 * Remove any gas-snapshot state before a probe writes its own.
 *
 * `hardhat clean` clears the artifacts dir and the cache; it does not touch
 * `.gas-snapshot` or `snapshots/`, and nothing else in the sweep does either
 * until the next `init`. Left in place, a baseline written for one pair's
 * control becomes the baseline the NEXT pair's solx run is checked against
 * whenever that pair's own write fails — a legacy-solc baseline silently
 * standing in for a via-IR one, with nothing flagging it.
 */
function clearGasSnapshotState(projectDir: string): string[] {
  const removed: string[] = [];
  for (const target of [GAS_SNAPSHOT_FILE, SNAPSHOT_CHEATCODES_DIR]) {
    const full = path.join(projectDir, target);
    if (existsSync(full)) {
      rmSync(full, { recursive: true, force: true });
      removed.push(target);
    }
  }
  return removed;
}

/** Everything the gas verdict is decided from. Pure inputs, so it is testable. */
export interface GasProbeObservations {
  writeExitCode: number | null;
  /** Whether the write run printed a test summary at all. */
  writePrintedSummary: boolean;
  /** Entries in .gas-snapshot after the write; null when the file is absent. */
  baselineEntries: number | null;
  /** Files in snapshots/ after the write; null when the dir is absent. */
  baselineCheatcodeFiles: number | null;
  /** Whether the check run printed a test summary at all. */
  checkPrintedSummary: boolean;
  /** Failing tests the check run reported. */
  checkFailing: number;
  /** Counts the two check sections printed for themselves; null when silent. */
  functionGas: GasSectionCounts | null;
  snapshotCheatcodes: GasSectionCounts | null;
  /** Whether each section printed its no-baseline message. */
  functionGasNoBaseline: boolean;
  snapshotCheatcodesNoBaseline: boolean;
  /** Whether the check printed its own pass or fail line. */
  checkReportedPassed: boolean;
  checkReportedFailed: boolean;
}

/**
 * What the gas comparison established, from what was observed.
 *
 * Pure and exported because it is the most intricate decision in the harness,
 * and because each of its branches exists to refuse a claim the exit code
 * alone would have made. The plugin's own semantics behind each branch:
 * `handleSnapshot` writes the function-gas baseline only when the control's
 * tests passed; the check runs at all only when the solx tests passed;
 * `checkFunctionGasSnapshots` passes vacuously when the run produced nothing
 * to measure; and it passes on added/removed alone, which is a different
 * measured population rather than identical gas.
 */
export function gasProbeVerdict(observed: GasProbeObservations): {
  state: GasProbeState;
  reason: GasProbeReason;
} {
  const total = (counts: GasSectionCounts | null): number =>
    counts === null ? 0 : counts.changed + counts.added + counts.removed;
  const changed =
    (observed.functionGas?.changed ?? 0) +
    (observed.snapshotCheatcodes?.changed ?? 0);
  const reported =
    total(observed.functionGas) + total(observed.snapshotCheatcodes);

  if (observed.writeExitCode !== 0) {
    return {
      state: "inconclusive",
      reason: observed.writePrintedSummary
        ? "control-tests-failed"
        : "control-build-failed",
    };
  }
  // Either baseline is something to compare against: a suite may produce only
  // snapshot-cheatcode measurements, and uniswap-v4-core is the scenario where
  // the two counts diverge most.
  if (
    (observed.baselineEntries ?? 0) === 0 &&
    (observed.baselineCheatcodeFiles ?? 0) === 0
  ) {
    return { state: "inconclusive", reason: "no-measurements" };
  }
  if (!observed.checkPrintedSummary) {
    return { state: "inconclusive", reason: "solx-build-failed" };
  }
  if (observed.checkFailing > 0) {
    return { state: "inconclusive", reason: "solx-tests-failed" };
  }
  // Both sections lacking a baseline means nothing was compared. One section
  // lacking one does not discard the other section's real result.
  if (
    observed.functionGas === null &&
    observed.snapshotCheatcodes === null &&
    (observed.functionGasNoBaseline || observed.snapshotCheatcodesNoBaseline)
  ) {
    return { state: "inconclusive", reason: "no-measurements" };
  }
  // Differences that are all added/removed and none changed: the two runs
  // measured different sets of functions. The check passes on that, and
  // calling it identical gas would be a claim about numbers that were never
  // compared to each other.
  if (reported > 0 && changed === 0) {
    return { state: "inconclusive", reason: "measurement-population-differs" };
  }
  if (observed.checkReportedFailed) {
    return { state: "diverged", reason: "gas-differences" };
  }
  if (observed.checkReportedPassed) {
    return { state: "matched", reason: "gas-identical" };
  }
  return { state: "inconclusive", reason: "check-did-not-report" };
}

/**
 * Write a gas snapshot from the control, then check solx against it.
 *
 * The 0.1.7 evaluation assumed uniswap's own `.forge-snapshots` assertions
 * could fail a run. They cannot: those are write-mode `vm.snapshotGasLastCall`
 * cheatcodes. Hardhat's own `--snapshot` / `--snapshot-check` flags do fail a
 * run (a failed check returns an error result), so the differential gas
 * assertion the evaluation wanted is available — this is it.
 *
 * The outcome is data, not a verdict. Two independent compilers producing
 * identical gas for every measurement would be the surprise; the value is a
 * measured divergence count over dozens of measurements.
 *
 * Every outcome the comparison did not reach is reported as inconclusive with
 * its reason (see gasProbeVerdict), because the check's exit code cannot
 * distinguish them.
 */
function runGasSnapshotProbe(
  runner: string,
  testFiles: string[],
  solxProfile: string,
  controlProfile: string,
  projectDir: string,
  env: Record<string, string | undefined>,
  logPrefix: string,
  label: string,
): GasSnapshotResult {
  const writeLog = `${logPrefix}.gas-snapshot-write.log`;
  const checkLog = `${logPrefix}.gas-snapshot-check.log`;

  const tracked = trackedSnapshotPaths(projectDir);
  const trackedRestored: string[] = [];
  // The restore runs in a finally: four of the scenarios ship committed
  // baselines, and an interruption between the clear and the restore would
  // leave the checkout not matching HEAD with nothing recording it.
  const restoreTracked = (): void => {
    // The guard comes first: a second call must not delete what the first one
    // just restored.
    if (trackedRestored.length > 0) {
      return;
    }
    clearGasSnapshotState(projectDir);
    if (tracked.length === 0) {
      return;
    }
    const restore = spawnSync("git", ["checkout", "--", ...tracked], {
      cwd: projectDir,
      encoding: "utf8",
    });
    if (restore.status === 0) {
      trackedRestored.push(...tracked);
    } else {
      console.error(
        `[test-under-solx] ${label}: FAILED to restore tracked snapshot state ` +
          `(${tracked.join(", ")}): ${restore.stderr ?? ""}`,
      );
    }
  };

  const removedBeforeWrite = clearGasSnapshotState(projectDir);
  try {
    const write = runChild(
      [
        "npx",
        "hardhat",
        "test",
        runner,
        ...testFiles,
        "--build-profile",
        controlProfile,
        "--snapshot",
      ],
      projectDir,
      env,
      writeLog,
      `${label} [gas snapshot write, control]`,
    );

    // Measured after the write, not assumed from its exit code: the plugin
    // only writes the function-gas baseline when the control's tests passed.
    const gasSnapshotEntries = countGasSnapshotEntries(projectDir);
    const snapshotCheatcodeFiles = countSnapshotCheatcodeFiles(projectDir);
    const baseline = {
      gasSnapshotEntries,
      snapshotCheatcodeFiles,
      recreated: gasSnapshotEntries !== null || snapshotCheatcodeFiles !== null,
    };

    const check = runChild(
      [
        "npx",
        "hardhat",
        "test",
        runner,
        ...testFiles,
        "--build-profile",
        solxProfile,
        "--snapshot-check",
      ],
      projectDir,
      env,
      checkLog,
      `${label} [gas snapshot check, solx]`,
    );

    const writeOutput = stripAnsi(write.output);
    const checkOutput = stripAnsi(check.output);
    const writeCounts = parseCounts(writeOutput);
    const checkCounts = parseCounts(checkOutput);
    const functionGas = parseGasSectionCounts(
      checkOutput,
      "Function gas snapshots",
    );
    const snapshotCheatcodes = parseGasSectionCounts(
      checkOutput,
      "Snapshot cheatcodes",
    );
    const printedSummary = (counts: ParsedCounts): boolean =>
      counts.passing !== null || counts.failing !== null;

    const verdict = gasProbeVerdict({
      writeExitCode: write.exitCode,
      writePrintedSummary: printedSummary(writeCounts),
      baselineEntries: baseline.gasSnapshotEntries,
      baselineCheatcodeFiles: baseline.snapshotCheatcodeFiles,
      checkPrintedSummary: printedSummary(checkCounts),
      checkFailing: checkCounts.failing ?? 0,
      functionGas,
      snapshotCheatcodes,
      functionGasNoBaseline: /^Function gas snapshots: no snapshot found/m.test(
        checkOutput,
      ),
      snapshotCheatcodesNoBaseline:
        /^Snapshot cheatcodes: no snapshots found/m.test(checkOutput),
      checkReportedPassed: /^Snapshot check passed$/m.test(checkOutput),
      checkReportedFailed: /^Snapshot check failed$/m.test(checkOutput),
    });

    const total = (counts: GasSectionCounts | null): number =>
      counts === null ? 0 : counts.changed + counts.added + counts.removed;
    const diffSample = checkOutput
      .split("\n")
      .filter((line) => GAS_DIFF_SAMPLE_RE.test(line))
      .map((line) => line.trim())
      .slice(0, MAX_GAS_DIFF_SAMPLE);

    return {
      writeExitCode: write.exitCode,
      checkExitCode: check.exitCode,
      state: verdict.state,
      reason: verdict.reason,
      baseline,
      functionGas,
      snapshotCheatcodes,
      // A fully matching check prints no section at all, so zero is the
      // measured answer there rather than an absence.
      divergingMeasurements:
        verdict.state === "matched"
          ? 0
          : functionGas === null && snapshotCheatcodes === null
            ? null
            : total(functionGas) + total(snapshotCheatcodes),
      diffSample,
      removedBeforeWrite,
      trackedRestored,
      writeLogFile: path.relative(process.cwd(), writeLog),
      checkLogFile: path.relative(process.cwd(), checkLog),
    };
  } finally {
    // The probe's own baselines are pollution for every later pair, so they go
    // away again; a scenario that tracks them in git gets the committed
    // content back.
    restoreTracked();
  }
}

/**
 * Why two compiles cannot be compared, or null when they can.
 *
 * Pure and exported because this is the whole of the probe's honesty: two
 * failed builds produce two empty artifact sets whose hashes are equal, and
 * without this the probe would publish a failed compile as evidence that the
 * compiler is deterministic.
 */
export function buildReproInconclusiveReason(
  cleanExitCodes: Array<number | null>,
  compileExitCodes: Array<number | null>,
  firstArtifactCount: number,
): string | null {
  const failed = [
    ...cleanExitCodes.map((code, i) =>
      code === 0 ? null : `clean ${i + 1} exited ${code}`,
    ),
    ...compileExitCodes.map((code, i) =>
      code === 0 ? null : `compile ${i + 1} exited ${code}`,
    ),
  ].filter((problem) => problem !== null);
  if (failed.length > 0) {
    return failed.join("; ");
  }
  if (firstArtifactCount === 0) {
    return "the first compile produced no artifacts, so both hashes are over an empty set";
  }
  return null;
}

/**
 * Compile the solx profile twice from clean and compare the produced sizes.
 *
 * A property of one compiler, not a repeated measurement of a pair: the
 * question is whether the compiler produces the same output twice. It matters
 * because the headline 0.1.7 defect was LLVM-internal, and a nondeterministic
 * backend would make every single-observation cell unreliable in a way no
 * amount of test-suite repetition would reveal. Cost is two builds, no suites.
 *
 * Both compiles' exit codes are part of the result. Without them two failed
 * builds produce two empty inventories that hash equal, which would publish a
 * failed compile as evidence that the compiler is deterministic — the same
 * defect class this harness exists to catch.
 */
function runBuildReproProbe(
  solxProfile: string,
  projectDir: string,
  env: Record<string, string | undefined>,
  logPrefix: string,
  label: string,
): BuildReproResult {
  const cleanExitCodes: Array<number | null> = [];
  const compileExitCodes: Array<number | null> = [];
  const compile = (attempt: number): Map<string, string> => {
    const clean = runChild(
      ["npx", "hardhat", "clean"],
      projectDir,
      env,
      `${logPrefix}.repro-${attempt}.clean.log`,
      `${label} [build-repro ${attempt} clean]`,
    );
    cleanExitCodes.push(clean.exitCode);
    const startedMs = Date.now();
    const built = runChild(
      ["npx", "hardhat", "compile", "--build-profile", solxProfile],
      projectDir,
      env,
      `${logPrefix}.repro-${attempt}.log`,
      `${label} [build-repro ${attempt}]`,
    );
    compileExitCodes.push(built.exitCode);
    const inventory = collectInventory(projectDir, startedMs);
    return new Map(
      inventory.entries.map((e) => [
        e.id,
        `${e.creationBytes}:${e.runtimeBytes}`,
      ]),
    );
  };

  // Sizes rather than full bytecode: a size change is the observable a
  // nondeterministic optimizer produces, and it keeps the probe's memory flat
  // on scenarios with megabytes of artifacts.
  const first = compile(1);
  const second = compile(2);
  const hash = (m: Map<string, string>): string =>
    createHash("sha256")
      .update(
        [...m.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([id, sizes]) => `${id}=${sizes}`)
          .join("\n"),
      )
      .digest("hex");
  // Both key sets: a contract present only in the second compile is a
  // difference, and iterating the first alone would never name it.
  const differing = [...new Set([...first.keys(), ...second.keys()])]
    .filter((id) => first.get(id) !== second.get(id))
    .sort();

  const inconclusiveReason = buildReproInconclusiveReason(
    cleanExitCodes,
    compileExitCodes,
    first.size,
  );
  const firstHash = hash(first);
  const secondHash = hash(second);

  return {
    firstHash,
    secondHash,
    identical: inconclusiveReason !== null ? null : firstHash === secondHash,
    inconclusiveReason,
    cleanExitCodes,
    compileExitCodes,
    artifactCount: first.size,
    secondArtifactCount: second.size,
    differingContracts: differing.slice(0, 25),
  };
}

/**
 * Compare the two sides' failure text for a failure that fails under both
 * compilers. Such failures are excluded from the solx verdict as upstream or
 * environmental noise, and that exclusion is only safe when it really is the
 * same failure — matching identifiers with different reasons is the shape a
 * miscompilation could hide behind.
 *
 * A side that did not report the failure yields identicalRaw null, not true:
 * two missing texts compare equal, and "identical on both sides" is a positive
 * claim that would then rest on two absences. The comparison is also only over
 * the recorded prefix of each trace, so a raw cut at RAW_CAP is flagged.
 */
export function diffSharedFailures(
  solxFailures: Failure[],
  controlFailures: Failure[],
  sharedIds: string[],
): SharedFailure[] {
  return sharedIds.map((id) => {
    const solx = solxFailures.find((f) => f.id === id);
    const control = controlFailures.find((f) => f.id === id);
    const found = { solx: solx !== undefined, control: control !== undefined };
    const prefixOnly =
      (solx?.truncated ?? false) || (control?.truncated ?? false);
    if (solx === undefined || control === undefined) {
      return { id, found, identicalRaw: null, prefixOnly };
    }
    if (solx.raw === control.raw) {
      return { id, found, identicalRaw: true, prefixOnly };
    }
    const solxLines = solx.raw.split("\n");
    const controlLines = control.raw.split("\n");
    let i = 0;
    while (
      i < solxLines.length &&
      i < controlLines.length &&
      solxLines[i] === controlLines[i]
    ) {
      i++;
    }
    return {
      id,
      found,
      identicalRaw: false,
      prefixOnly,
      rawDivergence: {
        solx: (solxLines[i] ?? "<end of text>").trim().slice(0, 300),
        control: (controlLines[i] ?? "<end of text>").trim().slice(0, 300),
      },
    };
  });
}

/**
 * Assert the packed hardhat-slang-solx in the checkout matches this monorepo's
 * build byte-for-byte, so no run measures a stale plugin.
 */
function assertFreshHardhatSolx(
  projectDir: string,
  env: Record<string, string | undefined>,
): void {
  const result = spawnSync(
    "diff",
    [
      "-rq",
      ".solx/expected-dist-src",
      "node_modules/@nomicfoundation/hardhat-slang-solx/dist/src",
    ],
    { cwd: projectDir, env, encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(
      `stale hardhat-slang-solx in ${projectDir}: ${result.stdout} ${result.stderr} — re-init the scenario`,
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
  const noPrime = hasFlag("--no-prime");
  const dryRun = hasFlag("--dry-run");
  const gasSnapshot = hasFlag("--gas-snapshot");
  const buildRepro = hasFlag("--build-repro");
  const maxReruns = Number(getArg("--max-reruns") ?? "25");
  if (!Number.isFinite(maxReruns) || maxReruns < 0) {
    console.error("--max-reruns must be a nonnegative number");
    process.exit(1);
  }
  const repetitions = Number(getArg("--repetitions") ?? "1");
  if (!Number.isInteger(repetitions) || repetitions < 1) {
    console.error("--repetitions must be a positive integer");
    process.exit(1);
  }
  const baseSeed = getArg("--fuzz-seed") ?? PINNED_FUZZ_SEED;
  if (!/^0x[0-9a-fA-F]{1,64}$/.test(baseSeed)) {
    console.error("--fuzz-seed must be 0x-prefixed hex, at most 32 bytes");
    process.exit(1);
  }

  /**
   * The seed for one repetition. Repetition 1 uses the pinned seed so a
   * single-run sweep is bit-identical to the pinned configuration; later
   * repetitions derive a distinct seed, held fixed across the pair's two runs
   * so each repetition stays a controlled comparison.
   */
  const seedFor = (repetition: number): string =>
    repetition === 1
      ? baseSeed
      : `0x${createHash("sha256")
          .update(`${baseSeed}:${repetition}`)
          .digest("hex")}`;

  if (!dryRun) {
    mkdirSync(path.join(outDir, "logs"), { recursive: true });
    mkdirSync(path.join(outDir, "results"), { recursive: true });
  }

  let hadInvalidOrError = false;

  for (const scenarioPath of scenarioPaths) {
    // Per-scenario isolation, opened before the definition is even loaded. A
    // scenario can fail anywhere outside a single run — a malformed
    // scenario.json, the init, a prime step, the freshness assert — and on a
    // ten-repo sweep an unhandled rejection there discards every scenario
    // after it. The cause is written next to the results and the sweep moves
    // on, which is the difference between one lost repo and one lost night.
    // The directory name, which is how loadScenario derives its id, so the
    // fallback and the real value agree. Every scenario path ends in the same
    // scenario.json filename, so a basename of the path itself would name
    // nothing and would collide across scenarios.
    let scenarioId = path.basename(path.dirname(scenarioPath));
    let primeSteps: PrimeStep[] = [];
    let skippedPrimeSteps: PrimeStep[] = [];
    try {
      const scenario = loadScenario(cloneDir, scenarioPath);
      scenarioId = scenario.id;
      const projectDir = path.join(
        scenario.workingDir,
        scenario.definition.workdir ?? ".",
      );
      const env = { ...process.env, ...scenario.definition.env };

      ({ kept: primeSteps, skipped: skippedPrimeSteps } = dropForgeSteps(
        collectPrimeSteps(scenario.definition),
      ));

      if (dryRun) {
        for (const step of skippedPrimeSteps) {
          console.log(
            `[dry-run] ${scenario.id} SKIPPED forge prime step "${step.name}": ${step.command}`,
          );
        }
        for (const step of primeSteps) {
          console.log(
            `[dry-run] ${scenario.id} prime step "${step.name}": ${step.command}`,
          );
        }
        for (let repetition = 1; repetition <= repetitions; repetition++) {
          for (const pair of pairs) {
            console.log(
              `[dry-run] ${scenario.id} / ${runner} / ${pair.solxProfile} vs ${pair.controlProfile} ` +
                `(rep ${repetition}/${repetitions}, seed ${seedFor(repetition)}, cwd ${projectDir})`,
            );
          }
        }
        continue;
      }

      // A previous run's error file must not outlive the failure it records.
      rmSync(path.join(outDir, "results", `${scenario.id}.error.json`), {
        force: true,
      });

      if (!noInit || !existsSync(scenario.workingDir)) {
        await init(
          cloneDir,
          scenarioPath,
          UseLocal.Yes,
          ForceCheckout.Yes,
          ForcePublish.No,
        );
      }
      for (const step of skippedPrimeSteps) {
        console.error(
          `[test-under-solx] ${scenario.id}: skipping forge prime step ` +
            `"${step.name}" — this harness never invokes forge`,
        );
      }
      if (!noPrime) {
        runPrimeSteps(
          primeSteps,
          scenario.workingDir,
          env,
          path.join(outDir, "logs", `${scenario.id}.prime.log`),
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
        baseSeed,
      );

      for (let repetition = 1; repetition <= repetitions; repetition++) {
        const seed = seedFor(repetition);
        // One seed per repetition, identical for both sides of every pair in
        // it: the comparison stays exact while the corpus can vary between
        // repetitions.
        const runEnv = { ...env, [FUZZ_SEED_ENV_VAR]: seed };

        for (const pair of pairs) {
          const slug =
            `${scenario.id}--${runner}--${pair.name}` +
            (repetitions > 1 ? `--rep${repetition}` : "");
          const logPrefix = path.join(outDir, "logs", slug);

          const { run: solx, inventory: solxInventory } = runSide(
            "solx",
            pair.solxProfile,
            runner,
            testFiles,
            projectDir,
            runEnv,
            pin,
            `${logPrefix}.solx.log`,
            `${slug} [solx]`,
          );

          // Control-run discipline: the control always runs, even when the
          // solx side already failed — "fails under both" and "fails under
          // solx only" are different verdicts.
          const { run: control, inventory: controlInventory } = runSide(
            "control",
            pair.controlProfile,
            runner,
            testFiles,
            projectDir,
            runEnv,
            pin,
            `${logPrefix}.control.log`,
            `${slug} [control]`,
          );

          const controlIds = new Set(control.failures.map((f) => f.id));
          const solxIds = new Set(solx.failures.map((f) => f.id));
          const solxOnly = solx.failures.filter((f) => !controlIds.has(f.id));
          const both = solx.failures.filter((f) => controlIds.has(f.id));
          const controlOnly = control.failures.filter(
            (f) => !solxIds.has(f.id),
          );
          const inventoryComparison = compareInventories(
            solxInventory,
            controlInventory,
          );
          const sharedFailureDiffs = diffSharedFailures(
            solx.failures,
            control.failures,
            both.map((f) => f.id),
          );

          let { verdict, detail } = classify(
            solx,
            control,
            inventoryComparison,
          );
          if (
            (verdict === "pass" || verdict === "pass-uncontrolled") &&
            solxOnly.length > 0
          ) {
            verdict = "test-failures";
            detail = `${solxOnly.length} test(s) fail under solx but pass under the solc control`;
          }
          // A pass row that contains a failure is a pass by definition (the
          // failure is not solx-specific) and reads as spotless in the matrix.
          // Say so in the row's own detail instead.
          if (verdict === "pass" && both.length > 0) {
            const divergent = sharedFailureDiffs.filter(
              (d) => d.identicalRaw === false,
            );
            const notCompared = sharedFailureDiffs.filter(
              (d) => d.identicalRaw === null,
            );
            detail = (
              `${detail} (contains ${both.length} test(s) failing under BOTH ` +
              `compilers, excluded from the solx verdict` +
              (divergent.length > 0
                ? `; ${divergent.length} of them fail with DIFFERENT text on the two sides`
                : "") +
              (notCompared.length > 0
                ? `; ${notCompared.length} could not be compared`
                : "") +
              `)`
            ).trim();
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
                  runEnv,
                  logPrefix,
                  maxReruns,
                )
              : [];

          // Probes run after the verdict is settled, so a probe failure can
          // never change one. Skipped when the solx build produced nothing:
          // there would be nothing to measure.
          const gasSnapshotResult =
            gasSnapshot && runner === "solidity" && !solxInventory.empty
              ? runGasSnapshotProbe(
                  runner,
                  testFiles,
                  pair.solxProfile,
                  pair.controlProfile,
                  projectDir,
                  runEnv,
                  logPrefix,
                  slug,
                )
              : null;
          const buildReproResult =
            buildRepro && !solxInventory.empty
              ? runBuildReproProbe(
                  pair.solxProfile,
                  projectDir,
                  runEnv,
                  logPrefix,
                  slug,
                )
              : null;

          const record: PairRecord = {
            scenarioId: scenario.id,
            runner,
            pair: pair.name,
            solxProfile: pair.solxProfile,
            controlProfile: pair.controlProfile,
            repetition,
            repetitions,
            fuzzSeed: seed,
            verdict,
            verdictDetail: detail,
            solx,
            control,
            solxOnlyFailures: solxOnly.map((f) => f.id),
            bothFailures: both.map((f) => f.id),
            sharedFailureDiffs,
            controlOnlyFailures: controlOnly.map((f) => f.id),
            eip170Failures: eip170,
            inventoryComparison,
            determinism,
            compileErrorMarker: {
              solx: solx.compileErrorMarker,
              control: control.compileErrorMarker,
            },
            resourceLimited: solx.resourceLimited || control.resourceLimited,
            gasSnapshot: gasSnapshotResult,
            buildRepro: buildReproResult,
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
    } catch (error) {
      hadInvalidOrError = true;
      const failure = error as Error;
      const errorFile = path.join(
        outDir,
        "results",
        `${scenarioId}.error.json`,
      );
      writeFileSync(
        errorFile,
        JSON.stringify(
          {
            scenarioId,
            scenarioPath,
            runner,
            stage: "scenario",
            message: failure.message,
            stack: failure.stack ?? null,
            pairs: pairs.map((p) => p.name),
            primeSteps: primeSteps.map((s) => s.name),
            skippedForgePrimeSteps: skippedPrimeSteps.map((s) => s.name),
            timestamp: new Date().toISOString(),
          },
          null,
          2,
        ),
      );
      // Regenerated here too: the report's own claim is that an absent row is
      // not a passing row, and a sweep whose last scenario failed would
      // otherwise publish a report that never says so.
      tryRegenerateReports(outDir, pin);
      console.error(
        `[test-under-solx] ${scenarioId}: SCENARIO FAILED — ${failure.message} ` +
          `(recorded in ${errorFile}); continuing with the next scenario`,
      );
    }
  }

  // A sweep that could not write its own report is not a clean sweep, even
  // when every pair passed.
  if (!dryRun && !tryRegenerateReports(outDir, pin)) {
    hadInvalidOrError = true;
  }
  process.exit(hadInvalidOrError ? 2 : 0);
}

// Guarded so the pure helpers above (provenance rules, inventory comparison,
// prime-step collection, failure diffing) can be imported by
// test-under-solx.test.ts without running a sweep.
if (process.argv[1] === import.meta.filename) {
  await main();
}
