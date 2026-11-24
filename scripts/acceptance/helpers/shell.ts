import { execSync, spawnSync } from "node:child_process";
import { resolve } from "node:path";

export const ROOT_DIR = resolve(import.meta.dirname, "../../..");

const whichCache = new Map<string, string>();

export function which(command: string): string {
  let cached = whichCache.get(command);

  if (cached === undefined) {
    cached = execSync(`which ${command}`, { encoding: "utf-8" }).trim();
    whichCache.set(command, cached);
  }

  return cached;
}

// Built from a string rather than written as a literal, to keep an escape
// character out of the source.
const ANSI_PATTERN = new RegExp("\\u001B\\[[0-9;]*[A-Za-z]", "g");

/**
 * Colour is disabled through the environment, so this is the backstop for
 * anything that colours its output regardless.
 */
export function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, "");
}

/**
 * The shell options a scenario runs under, as the first line of its script.
 *
 * `-e` stops at the first failing command. `pipefail` makes a pipeline fail
 * when any command in it fails, not only the last: until output is asserted
 * the exit status is the whole test, and `npx hardhat test | tee log` would
 * otherwise pass on a failing test. The cost is that a pipeline whose reader
 * stops early (`| head`, `| grep -q`, `yes |`) can fail on SIGPIPE, so
 * scenarios avoid those.
 */
export const SHELL_OPTIONS = "set -eo pipefail";

/**
 * The file a scenario's code block is run as: the shell options, stderr merged
 * into stdout, then the block exactly as written.
 */
export function scenarioScript(block: string): string {
  return `${SHELL_OPTIONS}\nexec 2>&1\n\n${block}\n`;
}

export interface ScriptResult {
  exitCode: number;
  output: string;
}

/**
 * Run a scenario script and capture what it printed.
 *
 * Output is captured rather than streamed: a failure has to be able to show
 * the output that caused it, and from phase 3 the output is the assertion.
 * The script merges its own stderr into stdout, so a single captured stream
 * keeps the interleaving a reader would have seen.
 */
export function runScript(
  scriptPath: string,
  cwd: string,
  env: Record<string, string>,
): ScriptResult {
  const result = spawnSync(which("bash"), [scriptPath], {
    cwd,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, ...env },
  });

  if (result.error !== undefined) {
    throw result.error;
  }

  return {
    exitCode: result.status ?? 1,
    output: stripAnsi(`${result.stdout ?? ""}${result.stderr ?? ""}`),
  };
}
