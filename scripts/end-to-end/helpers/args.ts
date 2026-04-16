import { log } from "node:console";
import { normalizeScenarioPath } from "./directory.ts";

export const DEFAULT_CLONE_DIR = "/tmp/end-to-end";

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
  const useLocal = args.includes("--use-local");
  const forcePublish = args.includes("--force-publish");

  let e2eCloneDirectory =
    getArgValue(args, "--e2e-clone-dir") ?? process.env.E2E_CLONE_DIR;

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

  if (e2eCloneDirectory === undefined) {
    e2eCloneDirectory = DEFAULT_CLONE_DIR;

    log(
      `No --e2e-clone-dir argument or E2E_CLONE_DIR environment variable provided, defaulting to:`,
    );
    log(`  ${DEFAULT_CLONE_DIR}`);
  }

  return {
    initFlag,
    execFlag,
    cleanFlag,
    e2eCloneDirectory,
    scenarioPath,
    command,
    useLocal,
    forcePublish,
  };
}

function getArgValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);

  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : undefined;
}
