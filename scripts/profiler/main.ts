import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { DEFAULT_CLONE_DIR, getArgValue } from "../end-to-end/helpers/args.ts";
import { normalizeScenarioPath } from "../end-to-end/helpers/directory.ts";
import { ensureScenarioInitialized } from "../end-to-end/helpers/scenario-setup.ts";
import {
  fmt,
  log,
  logStep,
  logError,
  logWarning,
} from "../end-to-end/helpers/log.ts";
import {
  ForceCheckout,
  ForcePublish,
  UseLocal,
} from "../end-to-end/subcommands/init.ts";
import type { Scenario } from "../end-to-end/types.ts";

import {
  DEFAULT_SAMPLE_RATE_HZ,
  getAllArgValues,
  Mode,
  parseEnvPairs,
  parseMode,
  parsePositionalArgs,
  parseSampleRate,
} from "./helpers/args.ts";
import { PERF_SCRIPT_OUTPUT_FILENAME } from "./helpers/flamegraph.ts";
import {
  cpuProfFlags,
  injectBunCpuProfFlags,
  mergeNodeOptions,
} from "./helpers/js-prof.ts";
import { ensurePerfRecordWorks } from "./helpers/perf-check.ts";
import {
  PERF_JS_NODE_OPTIONS,
  wrapWithPerfCpu,
} from "./helpers/perf-record.ts";
import {
  resolveCommand,
  type ResolvedCommand,
} from "./helpers/resolve-command.ts";
import { shellQuote } from "./helpers/shell.ts";

const USAGE = `
scripts/profiler/main.ts — Profile a command on e2e scenarios

DESCRIPTION
  Runs a single command once per scenario while recording where its time is
  spent. Two complementary measurements are available:

  system  Samples the whole process tree with Linux perf: one profile spanning
          JavaScript, the EDR native runtime (Rust), and subprocesses such as
          solc. Shows where overall CPU time goes, across languages, with
          coarse JavaScript function names.
  js      Samples JavaScript execution by passing \`--cpu-prof\` to the JS
          engine: precise per-function attribution of JavaScript/TypeScript
          code. Time spent inside EDR, solc or other subprocesses is not
          attributed — the JavaScript thread shows as idle while it waits on
          them.

  To attribute time inside EDR by function name, build it for profiling
  (\`pnpm build:perf-js\` in edr's crates/edr_napi) and load that binary via
  NAPI_RS_NATIVE_LIBRARY_PATH, or publish it to the running Verdaccio.

OPTIONS
  --scenario <path>     Scenario folder or scenario.json (required, repeatable:
                        the command is profiled once per scenario)
  --command <cmd|name>  Command to profile (required). Either a shell command
                        or the name of an entry in the scenario's
                        benchmark.commands (e.g. "test solidity",
                        "cold compile"). Prerequisite state is NOT set up
                        automatically — use --prepare
  --prepare <cmd|name>  Unmeasured command to run before each measurement
                        (same name shorthand, e.g. --prepare "cold compile")
  --mode <mode>         system, js, or both (default: both; measurements run
                        sequentially, never at the same time)
  --sample-rate <hz>    Samples per second for both measurements
                        (default: ${String(DEFAULT_SAMPLE_RATE_HZ)}). Internally: perf -F <hz>;
                        JS engine --cpu-prof-interval=round(1e6/hz) µs
  --out-dir <path>      Artifact directory (default: a fresh temp directory)
  --env KEY=VALUE       Extra environment for the prepare and profiled
                        commands (repeatable), e.g.
                        --env NAPI_RS_NATIVE_LIBRARY_PATH=/path/to/edr.node
  --init                Force (re-)initialization of the scenario
  --use-local           Publish locally changed packages to Verdaccio and pin
                        the scenario to them (only applies when init runs)
  --force-checkout      Force git checkouts despite uncommitted scenario changes
  --force-publish       Force publishing to a running Verdaccio instance
  --show-output         Stream the profiled command's output to the terminal
                        instead of capturing it to cmd.<mode>.log
  --keep-perf-data      Keep the raw perf.data after post-processing; by
                        default it is deleted once the symbolized samples are
                        written. Can be used for perf report/annotate sessions
  --e2e-clone-dir <p>   Scenario clone directory (default: the E2E_CLONE_DIR
                        environment variable, or ${DEFAULT_CLONE_DIR})

ARTIFACTS  (<out-dir>/<scenario>/; re-running with the same --out-dir and a
           different command overwrites that scenario's artifacts, though
           previously rendered flamegraph outputs (flamegraph.svg,
           folded.txt) are left in place)
  system: profile.linux-perf.txt.gz — every symbolized sample; the only
          portable system-mode artifact that preserves time-ordering. Open it
          in https://profiler.firefox.com (reads the .gz directly), gunzip it
          for https://speedscope.app, or render an aggregate flamegraph from
          it on any machine with pnpm profiler:flamegraph (requires inferno;
          the exact command is printed per run)
          perf.data — raw samples; only usable by perf on this machine and
          deleted after post-processing unless --keep-perf-data is passed
          or symbolization failed
          dso.txt / report.txt — plain-text per-binary / per-symbol CPU splits
  js:     cpuprof/*.cpuprofile — preserves time-ordering. Open it in
          https://profiler.firefox.com, https://speedscope.app or Chrome
          DevTools. Written per process on GRACEFUL exit only: processes that
          are killed (e.g. mocha parallel-mode workers) lose their profile.
  cmd.<mode>.log per run dir records the profiled command's output and exit
  code (with --show-output, the output goes to the terminal instead)
  status.json at the out-dir root records this invocation's runs (rewritten
  after each run, replaced by the next invocation)

EXAMPLES
  pnpm profiler --scenario ./end-to-end/uniswap-v4-core \\
    --prepare "cold compile" --command "test solidity"

  NAPI_RS_NATIVE_LIBRARY_PATH=~/edr/crates/edr_napi/edr.linux-x64-gnu.node \\
    pnpm profiler --scenario ./end-to-end/openzeppelin-contracts \\
    --command "test mocha" --mode system

  pnpm profiler --scenario ./end-to-end/uniswap-x \\
    --scenario ./end-to-end/aave-v4 \\
    --command "npx hardhat compile" --mode js --sample-rate 10000
`;

interface ProfileArgs {
  scenarioPaths: string[];
  commandOrName: string;
  prepareOrName: string | undefined;
  mode: Mode;
  sampleRateHz: number;
  outDir: string | undefined;
  env: Record<string, string>;
  init: boolean;
  useLocal: UseLocal;
  forceCheckout: ForceCheckout;
  forcePublish: ForcePublish;
  showOutput: boolean;
  keepPerfData: boolean;
  e2eCloneDirectory: string;
}

interface RunRecord {
  scenario: string;
  command: string;
  resolvedFrom: string | undefined;
  mode: Mode;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  spawnError: string | null;
  wallSeconds: number;
  artifactDir: string;
  /** Whether perf script succeeded; only set for system-mode runs. */
  symbolized?: boolean;
}

const VALUE_FLAGS = [
  "--scenario",
  "--command",
  "--prepare",
  "--mode",
  "--sample-rate",
  "--out-dir",
  "--env",
  "--e2e-clone-dir",
];

const BOOLEAN_FLAGS = [
  "--init",
  "--use-local",
  "--force-checkout",
  "--force-publish",
  "--show-output",
  "--keep-perf-data",
];

export function resolveAndValidateArgs(
  args: string[],
): ProfileArgs | undefined {
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    return undefined;
  }

  const stray = parsePositionalArgs(args, VALUE_FLAGS, BOOLEAN_FLAGS);

  if (stray.length > 0) {
    throw new Error(`unexpected argument: ${stray[0]}`);
  }

  const scenarioPaths = getAllArgValues(args, "--scenario").map(
    normalizeScenarioPath,
  );

  if (scenarioPaths.length === 0) {
    throw new Error(
      "--scenario is required (run pnpm profiler with no arguments for usage)",
    );
  }

  const commandOrName = getArgValue(args, "--command");

  if (commandOrName === undefined) {
    throw new Error(
      "--command is required (run pnpm profiler with no arguments for usage)",
    );
  }

  return {
    scenarioPaths,
    commandOrName,
    prepareOrName: getArgValue(args, "--prepare"),
    mode: parseMode(getArgValue(args, "--mode")),
    sampleRateHz: parseSampleRate(getArgValue(args, "--sample-rate")),
    outDir: getArgValue(args, "--out-dir"),
    env: parseEnvPairs(getAllArgValues(args, "--env")),
    init: args.includes("--init"),
    useLocal: args.includes("--use-local") ? UseLocal.Yes : UseLocal.No,
    forceCheckout: args.includes("--force-checkout")
      ? ForceCheckout.Yes
      : ForceCheckout.No,
    forcePublish: args.includes("--force-publish")
      ? ForcePublish.Yes
      : ForcePublish.No,
    showOutput: args.includes("--show-output"),
    keepPerfData: args.includes("--keep-perf-data"),
    e2eCloneDirectory:
      getArgValue(args, "--e2e-clone-dir") ??
      process.env.E2E_CLONE_DIR ??
      DEFAULT_CLONE_DIR,
  };
}

export async function runProfile(args: ProfileArgs): Promise<void> {
  const modes: ("system" | "js")[] =
    args.mode === Mode.Both ? [Mode.System, Mode.Js] : [args.mode];

  if (modes.includes(Mode.System)) {
    ensurePerfRecordWorks();
  }

  const outDir =
    args.outDir ?? mkdtempSync(path.join(tmpdir(), "hardhat-profile-"));
  const runs: RunRecord[] = [];

  for (const scenarioPath of args.scenarioPaths) {
    const scenario = await ensureScenarioInitialized(
      args.e2eCloneDirectory,
      scenarioPath,
      args.useLocal,
      args.forceCheckout,
      args.forcePublish,
      args.init,
    );

    if (scenario.definition.disabled === true) {
      logWarning(`Scenario "${scenario.id}" is disabled — skipping`);
      continue;
    }

    const resolved = resolveCommand(scenario.definition, args.commandOrName);

    if (resolved.resolvedFrom !== undefined) {
      log(
        `[${scenario.id}] "${resolved.resolvedFrom}" resolved from ` +
          `benchmark.commands to: ${resolved.command}`,
      );
    }

    const runDir = path.join(outDir, scenario.id);
    mkdirSync(runDir, { recursive: true });

    const baseEnv: NodeJS.ProcessEnv = {
      ...process.env,
      ...scenario.definition.env,
      ...args.env,
    };

    for (const mode of modes) {
      // Run before every measurement, so that with --mode both the second
      // measurement does not silently profile state the first one mutated.
      if (args.prepareOrName !== undefined) {
        const prepare = resolveCommand(scenario.definition, args.prepareOrName);
        logStep(`[${scenario.id}] Preparing (unmeasured): ${prepare.command}`);
        runInScenario(prepare.command, scenario, baseEnv, undefined, true);
      }

      runs.push(
        mode === Mode.System
          ? profileSystem(scenario, resolved, runDir, baseEnv, args)
          : profileJs(scenario, resolved, runDir, baseEnv, args),
      );
      writeStatusFile(outDir, runs);
    }
  }

  logStep("Profiling complete");

  for (const run of runs) {
    const outcome = runOutcome(run);
    log(
      `${run.scenario} · ${run.resolvedFrom ?? run.command} · ${run.mode}: ` +
        `${outcome}, ${run.wallSeconds.toFixed(1)}s → ${run.artifactDir}`,
    );

    if (run.mode === Mode.System) {
      if (run.symbolized === false) {
        log("  flamegraph: unavailable — symbolization failed (see warning)");
      } else {
        log(
          `  flamegraph: pnpm profiler:flamegraph render ${shellQuote(run.artifactDir)} ` +
            `--title ${shellQuote(flamegraphTitle(run))}`,
        );
      }
    }
  }

  // Let shell chains and CI detect a profile of a failed or killed command,
  // or one whose samples never got symbolized.
  if (runs.some((run) => run.exitCode !== 0 || run.symbolized === false)) {
    process.exitCode = 1;
  }
}

/** The summary-line outcome of a run, e.g. "ok" or "killed by SIGKILL". */
function runOutcome(run: RunRecord): string {
  if (run.exitCode === 0) {
    return fmt.success("ok");
  }

  if (run.signal !== null) {
    return `killed by ${run.signal}`;
  }

  if (run.exitCode === null) {
    return run.spawnError !== null
      ? `failed to spawn (${run.spawnError})`
      : "failed to spawn";
  }

  return `exit ${String(run.exitCode)}`;
}

/** The flamegraph title for a run, e.g. "uniswap-v4-core — test solidity". */
function flamegraphTitle(run: RunRecord): string {
  return `${run.scenario} — ${run.resolvedFrom ?? run.command}`;
}

/**
 * Records every run so far to `<out-dir>/status.json`.
 *
 * Rewritten after each run so that a crashed or interrupted session still
 * leaves an accurate record of what completed.
 */
function writeStatusFile(outDir: string, runs: RunRecord[]): void {
  writeFileSync(
    path.join(outDir, "status.json"),
    JSON.stringify({ runs }, null, 2),
  );
}

/** The per-mode log file capturing the profiled command's output. */
function commandLogPath(runDir: string, mode: Mode): string {
  return path.join(runDir, `cmd.${mode}.log`);
}

function profileSystem(
  scenario: Scenario,
  resolved: ResolvedCommand,
  runDir: string,
  baseEnv: NodeJS.ProcessEnv,
  args: ProfileArgs,
): RunRecord {
  const perfData = path.join(runDir, "perf.data");
  const wrapped = wrapWithPerfCpu(
    resolved.command,
    perfData,
    args.sampleRateHz,
  );

  const env: NodeJS.ProcessEnv = {
    ...baseEnv,
    NODE_OPTIONS: mergeNodeOptions(baseEnv.NODE_OPTIONS, PERF_JS_NODE_OPTIONS),
  };

  logStep(`[${scenario.id}] system profile: ${resolved.command}`);
  const record = runInScenario(
    wrapped,
    scenario,
    env,
    commandLogPath(runDir, Mode.System),
    args.showOutput,
  );

  // Resolving JS frame names depends on the /tmp/perf-<pid>.map files the
  // profiled processes just wrote. Symbolize to ensure output is
  // self-contained.
  const samples = path.join(runDir, PERF_SCRIPT_OUTPUT_FILENAME);

  // Remove artifacts from a previous run in the same --out-dir, so that a
  // crash between symbolizing and compressing does not leave stale samples
  // behind.
  rmSync(`${samples}.gz`, { force: true });

  const symbolized = runPostProcess(
    `perf script -i ${shellQuote(perfData)} > ${shellQuote(samples)}`,
  );

  runPostProcess(
    `perf report -i ${shellQuote(perfData)} --stdio --no-children --no-call-graph --sort dso > ${shellQuote(path.join(runDir, "dso.txt"))}`,
  );
  runPostProcess(
    `perf report -i ${shellQuote(perfData)} --stdio --no-children --no-call-graph --sort dso,sym --percent-limit 0.05 > ${shellQuote(path.join(runDir, "report.txt"))}`,
  );

  if (symbolized) {
    runPostProcess(`gzip -f ${shellQuote(samples)}`);
  } else {
    // A truncated samples file would masquerade as a complete profile.
    rmSync(samples, { force: true });
  }

  // perf.data is machine-bound and large, so only keep it if the user
  // explicitly requested it or if symbolization failed
  if (!args.keepPerfData && symbolized) {
    rmSync(perfData, { force: true });
  }

  return {
    ...toRunRecord(scenario, resolved, Mode.System, runDir, record),
    symbolized,
  };
}

/** Runs a post-processing shell pipeline; returns whether it succeeded. */
function runPostProcess(pipeline: string): boolean {
  // The pipelines write their data to files themselves, so only stderr —
  // which carries the diagnosis on failure — is captured. perf can emit
  // megabytes of non-fatal stderr noise even on success, so the buffer is
  // sized well above the default to not kill a healthy pipeline.
  const result = spawnSync("bash", ["-c", pipeline], {
    stdio: ["ignore", "ignore", "pipe"],
    encoding: "utf-8",
    maxBuffer: 16 * 1024 * 1024,
  });

  if (result.status !== 0) {
    logWarning(
      `post-processing failed (exit ${String(result.status)}): ${pipeline}\n` +
        `    ${stderrTail(result.stderr)}`,
    );
    return false;
  }

  return true;
}

/**
 * The last few stderr lines of a failed command, as an indented block for a
 * warning message.
 *
 * The tail is taken — not the head — because perf prints the fatal error
 * last, after any warning noise. Five lines fit the diagnosis without
 * drowning the run output. An empty stderr is made explicit, so that the
 * reader knows capturing worked.
 */
function stderrTail(stderr: string | null): string {
  const tail = (stderr ?? "").trim().split("\n").slice(-5).join("\n    ");

  return tail === "" ? "(no stderr)" : tail;
}

function profileJs(
  scenario: Scenario,
  resolved: ResolvedCommand,
  runDir: string,
  baseEnv: NodeJS.ProcessEnv,
  args: ProfileArgs,
): RunRecord {
  const profileDir = path.join(runDir, "cpuprof");

  // The engine names each .cpuprofile uniquely, so profiles from a previous
  // run in the same --out-dir would otherwise accumulate and mix with this
  // run's.
  rmSync(profileDir, { recursive: true, force: true });
  mkdirSync(profileDir, { recursive: true });

  const bunCommand = injectBunCpuProfFlags(
    resolved.command,
    profileDir,
    args.sampleRateHz,
  );

  const env: NodeJS.ProcessEnv = { ...baseEnv };

  if (bunCommand === undefined) {
    env.NODE_OPTIONS = mergeNodeOptions(
      baseEnv.NODE_OPTIONS,
      cpuProfFlags(profileDir, args.sampleRateHz).join(" "),
    );
  }

  logStep(`[${scenario.id}] js profile: ${resolved.command}`);
  const record = runInScenario(
    bunCommand ?? resolved.command,
    scenario,
    env,
    commandLogPath(runDir, Mode.Js),
    args.showOutput,
  );

  const profiles = readdirSync(profileDir).filter((f) =>
    f.endsWith(".cpuprofile"),
  );

  if (profiles.length === 0) {
    logWarning(
      `no .cpuprofile written for "${resolved.command}" — the process may ` +
        "not be node/bun, or it exited non-gracefully",
    );
  }

  return toRunRecord(scenario, resolved, Mode.Js, runDir, record);
}

interface CommandOutcome {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  spawnError: string | null;
  wallSeconds: number;
}

function runInScenario(
  command: string,
  scenario: Scenario,
  env: NodeJS.ProcessEnv,
  logFile: string | undefined,
  showOutput: boolean,
): CommandOutcome {
  const started = Date.now();
  const result = spawnSync("bash", ["-c", command], {
    cwd: scenario.workingDir,
    env,
    stdio: showOutput ? "inherit" : "pipe",
    encoding: "utf-8",
    maxBuffer: 512 * 1024 * 1024,
  });
  const wallSeconds = (Date.now() - started) / 1000;

  if (logFile !== undefined) {
    const output = showOutput
      ? "(output streamed to the terminal via --show-output)"
      : `${result.stdout ?? ""}\n--- stderr ---\n${result.stderr ?? ""}`;

    const signalNote = result.signal !== null ? ` signal=${result.signal}` : "";

    writeFileSync(
      logFile,
      `$ ${command}\nexit=${String(result.status)}${signalNote}\n\n${output}`,
    );
  }

  if (result.error !== undefined) {
    logWarning(`command failed to spawn (${result.error.message}): ${command}`);
  } else if (result.signal !== null) {
    logWarning(`command was killed by ${result.signal}: ${command}`);
  } else if (result.status !== 0) {
    logWarning(`command exited with ${String(result.status)}: ${command}`);
  }

  return {
    exitCode: result.status,
    signal: result.signal,
    spawnError: result.error?.message ?? null,
    wallSeconds,
  };
}

function toRunRecord(
  scenario: Scenario,
  resolved: ResolvedCommand,
  mode: Mode,
  runDir: string,
  outcome: CommandOutcome,
): RunRecord {
  return {
    scenario: scenario.id,
    command: resolved.command,
    resolvedFrom: resolved.resolvedFrom,
    mode,
    exitCode: outcome.exitCode,
    signal: outcome.signal,
    spawnError: outcome.spawnError,
    wallSeconds: outcome.wallSeconds,
    artifactDir: runDir,
  };
}

async function cliMain(): Promise<void> {
  let profileArgs: ProfileArgs | undefined;

  try {
    profileArgs = resolveAndValidateArgs(process.argv.slice(2));
  } catch (error) {
    logError(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  if (profileArgs === undefined) {
    console.log(USAGE);
    return;
  }

  try {
    await runProfile(profileArgs);
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }

    logError(error.message);
    process.exit(1);
  }
}

if (import.meta.main) {
  await cliMain();
}
