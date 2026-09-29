import { log } from "node:console";
import { normalizeScenarioPath, resolveInvocationPath } from "./directory.ts";
import { ForceCheckout, ForcePublish, UseLocal } from "../subcommands/init.ts";

export const DEFAULT_CLONE_DIR = "/tmp/end-to-end";

export const CLONE_DIR_FLAG = "--e2e-clone-dir";

/** The clone directory the user asked for, by flag or E2E_CLONE_DIR. */
export function givenCloneDirectory(args: string[]): string | undefined {
  return getArgValue(args, CLONE_DIR_FLAG) ?? process.env.E2E_CLONE_DIR;
}

/** The clone directory to use, DEFAULT_CLONE_DIR when none was given. */
export function resolveCloneDirectory(given: string | undefined): string {
  return resolveInvocationPath(given ?? DEFAULT_CLONE_DIR);
}

export function logCloneDirectoryDefault(): void {
  log(
    `No ${CLONE_DIR_FLAG} argument or E2E_CLONE_DIR environment variable provided, defaulting to:`,
  );
  log(`  ${resolveCloneDirectory(undefined)}`);
}

export function resolveAndValidateArgs(args: string[]) {
  const scenarioPathRaw =
    getArgValue(args, "--scenario") ?? process.env.E2E_SCENARIO;

  const scenarioPath =
    scenarioPathRaw !== undefined
      ? normalizeScenarioPath(scenarioPathRaw)
      : undefined;

  const initFlag = args.includes("init");
  const execFlag = args.includes("exec");
  const cleanFlag = args.includes("clean");

  const command = getArgValue(args, "--command");

  const useLocal = args.includes("--use-local") ? UseLocal.Yes : UseLocal.No;

  const forceCheckout = args.includes("--force-checkout")
    ? ForceCheckout.Yes
    : ForceCheckout.No;

  const forcePublish = args.includes("--force-publish")
    ? ForcePublish.Yes
    : ForcePublish.No;

  const givenCloneDir = givenCloneDirectory(args);

  const commandFlagCount = [initFlag, execFlag, cleanFlag].filter(
    (f) => f,
  ).length;

  if (commandFlagCount > 1) {
    throw new Error("Only one command can be set either: init, exec or clean");
  }

  if (commandFlagCount === 1 && scenarioPath === undefined) {
    throw new Error(
      "Missing required --scenario argument e.g. --scenario ./end-to-end/openzeppelin-contracts",
    );
  }

  if (givenCloneDir === undefined) {
    logCloneDirectoryDefault();
  }

  return {
    initFlag,
    execFlag,
    cleanFlag,
    e2eCloneDirectory: resolveCloneDirectory(givenCloneDir),
    scenarioPath,
    command,
    useLocal,
    forceCheckout,
    forcePublish,
  };
}

export function getArgValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);

  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : undefined;
}

/** Whether the arguments ask for the usage text instead of a run. */
export function isHelpRequested(args: string[]): boolean {
  return args.includes("--help") || args.includes("-h");
}

/**
 * Validates the flags and returns the positional arguments.
 *
 * Throws on an option it does not know, an option being any token that
 * starts with `-`. A bare `--` is skipped, since
 * `pnpm run <script> -- <args>` forwards it. A value flag must be followed
 * by a value, which must not itself start with `--`. The positional
 * arguments are the remaining tokens, neither a flag nor a value consumed by
 * one. Knowing each flag's arity lets a stray token after a boolean flag
 * surface as a positional, instead of being mistaken for the flag's value.
 */
export function parsePositionalArgs(
  args: string[],
  valueFlags: string[],
  booleanFlags: string[] = [],
): string[] {
  const positionals: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--") {
      continue;
    }

    if (!arg.startsWith("-")) {
      positionals.push(arg);
      continue;
    }

    if (booleanFlags.includes(arg)) {
      continue;
    }

    if (!valueFlags.includes(arg)) {
      throw new Error(`unknown option: ${arg}`);
    }

    const value = args[i + 1];

    if (value === undefined || value.startsWith("--")) {
      throw new Error(`${arg} requires a value`);
    }

    i++;
  }

  return positionals;
}

/**
 * Validates the flags like `parsePositionalArgs`, and rejects the first
 * positional argument for commands that take none.
 */
export function assertOnlyFlags(
  args: string[],
  valueFlags: string[],
  booleanFlags: string[],
): void {
  const [stray] = parsePositionalArgs(args, valueFlags, booleanFlags);

  if (stray !== undefined) {
    throw new Error(`unexpected argument: ${stray}`);
  }
}
