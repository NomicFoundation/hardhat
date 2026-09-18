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
