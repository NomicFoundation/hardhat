import { log } from "node:console";
import { normalizeScenarioPath, resolveInvocationPath } from "./directory.ts";
import { ForceCheckout, ForcePublish, UseLocal } from "../subcommands/init.ts";
import { cliError, parseCliArgs } from "../../lib/cli-args.ts";

export const DEFAULT_CLONE_DIR = "/tmp/end-to-end";

export const CLONE_DIR_FLAG = "--e2e-clone-dir";

/** The clone directory the user asked for, by flag or E2E_CLONE_DIR. */
export function givenCloneDirectory(
  fromFlag: string | undefined,
): string | undefined {
  return fromFlag ?? process.env.E2E_CLONE_DIR;
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

export const Command = {
  Init: "init",
  Exec: "exec",
  Clean: "clean",
} as const;

export type Command = (typeof Command)[keyof typeof Command];

const COMMAND_LIST = Object.values(Command).join(", ");

export interface EndToEndArgs {
  command: Command;
  e2eCloneDirectory: string;
  scenarioPath: string;
  /** The `--command` value for `exec`. Undefined runs the scenario's default. */
  execCommand: string | undefined;
  useLocal: UseLocal;
  forceCheckout: ForceCheckout;
  forcePublish: ForcePublish;
}

/**
 * The parsed arguments, or undefined when the usage text should be printed
 * instead. Logs the default clone-directory notice once a command is
 * selected, so a caller must print the usage text before anything else.
 */
export function resolveAndValidateArgs(
  args: string[],
): EndToEndArgs | undefined {
  const cli = {
    command: "pnpm e2e",
    options: {
      scenario: { type: "string" },
      command: { type: "string" },
      "e2e-clone-dir": { type: "string" },
      "use-local": { type: "boolean" },
      "force-checkout": { type: "boolean" },
      "force-publish": { type: "boolean" },
    },
    allowPositionals: true,
  } as const;
  const parsed = parseCliArgs(args, cli);

  if (parsed === undefined) {
    return undefined;
  }

  const commands = parsed.positionals.map((token) => parseCommand(cli, token));

  if (commands.length === 0) {
    return undefined;
  }

  if (commands.length > 1) {
    throw cliError(
      cli,
      `Only one command can be given (one of ${COMMAND_LIST})`,
    );
  }

  const { values } = parsed;
  const scenarioPathRaw = values.scenario ?? process.env.E2E_SCENARIO;

  if (scenarioPathRaw === undefined) {
    throw cliError(cli, "--scenario is required unless E2E_SCENARIO is set");
  }

  const givenCloneDir = givenCloneDirectory(values["e2e-clone-dir"]);

  if (givenCloneDir === undefined) {
    logCloneDirectoryDefault();
  }

  return {
    command: commands[0],
    e2eCloneDirectory: resolveCloneDirectory(givenCloneDir),
    scenarioPath: normalizeScenarioPath(scenarioPathRaw),
    execCommand: values.command,
    useLocal: values["use-local"] === true ? UseLocal.Yes : UseLocal.No,
    forceCheckout:
      values["force-checkout"] === true ? ForceCheckout.Yes : ForceCheckout.No,
    forcePublish:
      values["force-publish"] === true ? ForcePublish.Yes : ForcePublish.No,
  };
}

function parseCommand(cli: { command: string }, token: string): Command {
  for (const command of Object.values(Command)) {
    if (token === command) {
      return command;
    }
  }

  throw cliError(
    cli,
    `unknown command: ${token} (expected one of ${COMMAND_LIST})`,
  );
}
