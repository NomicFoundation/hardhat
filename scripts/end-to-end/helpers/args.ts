import { normalizeScenarioPath } from "./directory.ts";

export function resolveAndValidateArgs(args: string[]) {
  const scenarioPathRaw = getArgValue(args, "--scenario");
  const scenarioPath =
    scenarioPathRaw !== undefined
      ? normalizeScenarioPath(scenarioPathRaw)
      : undefined;

  const initFlag = args.includes("init");
  const execFlag = args.includes("exec");
  const cleanFlag = args.includes("clean");

  const command = getArgValue(args, "--command");
  const withVerdaccioFlag = args.includes("--with-verdaccio");
  const withInitFlag = args.includes("--with-init");

  const e2eCloneDirectory =
    getArgValue(args, "--e2e-clone-dir") ?? process.env.E2E_CLONE_DIR;

  const commandFlagCount = [initFlag, execFlag, cleanFlag].reduce(
    (acc, v) => acc + (v ? 1 : 0),
    0,
  );

  if (commandFlagCount > 1) {
    throw new Error("Only one command can be set either: init, exec or clean");
  }

  if (scenarioPath === undefined) {
    throw new Error(
      "Missing required --scenario argument e.g. --scenario ./end-to-end/openzeppelin-contracts",
    );
  }

  if (e2eCloneDirectory === undefined) {
    throw new Error(
      "Missing required --e2e-clone-dir argument or E2E_CLONE_DIR environment variable",
    );
  }

  return {
    initFlag,
    execFlag,
    cleanFlag,
    e2eCloneDirectory,
    scenarioPath,
    command,
    withVerdaccioFlag,
    withInitFlag,
  };
}

function getArgValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);

  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : undefined;
}
