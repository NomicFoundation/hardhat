import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

import { getArgValue, parsePositionalArgs } from "./args.ts";
import { shellQuote } from "./shell.ts";
import { toolAvailable } from "./perf-check.ts";

/**
 * The symbolized samples (`perf script` output) of a profiled run, written
 * by `pnpm profiler` next to perf.data and gzipped once post-processing
 * finishes. Unlike perf.data, it is self-contained — no DSOs or
 * /tmp/perf-<pid>.map files needed — so it can be rendered on any machine.
 * The .linux-perf.txt suffix is how profile viewers detect the format.
 */
export const PERF_SCRIPT_OUTPUT_FILENAME = "profile.linux-perf.txt";

const USAGE = `
scripts/profiler/helpers/flamegraph.ts — Flamegraph tooling for profiled runs

DESCRIPTION
  Processes the symbolized samples (${PERF_SCRIPT_OUTPUT_FILENAME}, gzipped
  or not) of a \`pnpm profiler\` run. The render subcommand produces a
  flamegraph SVG. The fold subcommand produces the collapsed stacks that
  flamegraphs are built from.

  The samples are system-agnostic, so both subcommands work on any machine,
  at any time. They only require inferno (\`cargo install inferno\`) on the
  PATH. When inferno is missing, the pipeline to run — once installed, or on
  another machine — is printed instead.

  Flamegraphs and folded stacks aggregate identical stacks, which discards
  time-ordering. For a timeline view, open the samples file instead.

USAGE
  pnpm profiler:flamegraph render <run-dir> [--output <path>] [--title <text>]
  pnpm profiler:flamegraph fold <run-dir> [--output <path>]

SUBCOMMANDS
  render  Render a flamegraph SVG from the run's symbolized samples
  fold    Write the collapsed (folded) stacks, e.g. to compare two runs as
          a differential flamegraph: inferno-diff-folded before/folded.txt
          after/folded.txt | inferno-flamegraph > diff.svg

OPTIONS
  <run-dir>          A directory containing ${PERF_SCRIPT_OUTPUT_FILENAME}
                     or the .gz thereof (an <out-dir>/<scenario> directory
                     of pnpm profiler)
  --output <path>    Output path, used verbatim (default:
                     <run-dir>/flamegraph.svg or <run-dir>/folded.txt)
  --title <text>     render only: flamegraph title (default:
                     cpu profile — <run-dir name>)

EXAMPLES
  pnpm profiler:flamegraph render /tmp/hardhat-profile-abc123/uniswap-v4-core
`;

export const Subcommand = {
  Fold: "fold",
  Render: "render",
} as const;

export type Subcommand = (typeof Subcommand)[keyof typeof Subcommand];

interface FlamegraphArgs {
  subcommand: Subcommand;
  runDir: string;
  output: string | undefined;
  title: string | undefined;
}

export function resolveArgs(args: string[]): FlamegraphArgs | undefined {
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    return undefined;
  }

  const positional = parsePositionalArgs(args, ["--output", "--title"]);

  if (positional.length === 0) {
    throw new Error("missing subcommand (expected: render or fold)");
  }

  const [subcommand, runDir] = positional;

  if (subcommand !== Subcommand.Render && subcommand !== Subcommand.Fold) {
    throw new Error(
      `unknown subcommand "${subcommand}" (expected: render or fold)`,
    );
  }

  if (positional.length !== 2 || runDir === undefined) {
    throw new Error(`${subcommand} expects exactly one <run-dir>`);
  }

  return {
    subcommand,
    runDir,
    output: getArgValue(args, "--output"),
    title: getArgValue(args, "--title"),
  };
}

function defaultFlamegraphTitle(runDir: string): string {
  return `cpu profile — ${path.basename(path.resolve(runDir))}`;
}

interface FlamegraphPipeline {
  pipeline: string;
  outputPath: string;
}

/**
 * Builds the shell pipeline rendering a run's symbolized samples, for running
 * or printing, along with the path of the artifact it writes.
 */
export function buildFlamegraphPipeline(
  args: FlamegraphArgs,
): FlamegraphPipeline {
  const samples = path.join(args.runDir, PERF_SCRIPT_OUTPUT_FILENAME);
  const gzippedSamples = `${samples}.gz`;

  const collapsed = existsSync(gzippedSamples)
    ? `gunzip -c ${shellQuote(gzippedSamples)} | inferno-collapse-perf`
    : `inferno-collapse-perf < ${shellQuote(samples)}`;

  if (args.subcommand === Subcommand.Fold) {
    const folded = args.output ?? path.join(args.runDir, "folded.txt");

    return {
      pipeline: `${collapsed} > ${shellQuote(folded)}`,
      outputPath: folded,
    };
  }

  const title = args.title ?? defaultFlamegraphTitle(args.runDir);
  const output = args.output ?? path.join(args.runDir, "flamegraph.svg");

  return {
    pipeline: `${collapsed} | inferno-flamegraph --title ${shellQuote(title)} > ${shellQuote(output)}`,
    outputPath: output,
  };
}

async function cliMain(): Promise<void> {
  let args: FlamegraphArgs | undefined;

  try {
    args = resolveArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  if (args === undefined) {
    console.log(USAGE);
    return;
  }

  if (args.subcommand === Subcommand.Fold && args.title !== undefined) {
    console.error("--title is only supported by the render subcommand");
    process.exit(1);
  }

  const samples = path.join(args.runDir, PERF_SCRIPT_OUTPUT_FILENAME);

  if (!existsSync(samples) && !existsSync(`${samples}.gz`)) {
    console.error(
      `No ${PERF_SCRIPT_OUTPUT_FILENAME}(.gz) in ${args.runDir} — was the ` +
        "run profiled with --mode system?",
    );
    process.exit(1);
  }

  const { pipeline, outputPath } = buildFlamegraphPipeline(args);

  const requiredTools = ["inferno-collapse-perf"];

  if (args.subcommand === Subcommand.Render) {
    requiredTools.push("inferno-flamegraph");
  }

  const missing = requiredTools.filter((tool) => !toolAvailable(tool));

  if (missing.length > 0) {
    console.error(
      `Missing tools on PATH: ${missing.join(", ")}. Install inferno ` +
        "(cargo install inferno), or run this pipeline where it is available:",
    );
    console.error(`  ${pipeline}`);
    process.exit(1);
  }

  const result = spawnSync("bash", ["-c", pipeline], { stdio: "inherit" });

  if (result.status !== 0) {
    console.error(`Pipeline failed (exit ${String(result.status)}):`);
    console.error(`  ${pipeline}`);
    process.exit(1);
  }

  console.log(outputPath);
}

if (import.meta.main) {
  await cliMain();
}
