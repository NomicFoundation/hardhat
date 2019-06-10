import { BuidlerArguments } from "../../types";
import { getEnvVariablesMap } from "../core/params/env-variables";

export async function runScript(
  scriptPath: string,
  scriptArgs: string[] = [],
  extraNodeArgs: string[] = [],
  extraEnvVars: { [name: string]: string } = {}
): Promise<number> {
  const { fork } = await import("child_process");

  return new Promise((resolve, reject) => {
    const nodeArgs = [
      ...process.execArgv,
      ...getTsNodeArgsIfNeeded(),
      ...extraNodeArgs
    ];

    const childProcess = fork(scriptPath, scriptArgs, {
      stdio: "inherit" as any, // There's an error in the TS definition of ForkOptions
      execArgv: nodeArgs,
      env: { ...process.env, ...extraEnvVars }
    });

    childProcess.once("close", resolve);
    childProcess.once("error", reject);
  });
}

export async function runScriptWithBuidler(
  buidlerArguments: BuidlerArguments,
  scriptPath: string,
  scriptArgs: string[] = [],
  extraNodeArgs: string[] = [],
  extraEnvVars: { [name: string]: string } = {}
): Promise<number> {
  return runScript(
    scriptPath,
    scriptArgs,
    [...extraNodeArgs, "--require", __dirname + "/../../register"],
    {
      ...getEnvVariablesMap(buidlerArguments),
      ...extraEnvVars
    }
  );
}

function getTsNodeArgsIfNeeded() {
  // This means we are running the tests
  if (!__filename.endsWith(".ts")) {
    return [];
  }

  const extraNodeArgs = [];

  if (!process.execArgv.includes("ts-node/register")) {
    extraNodeArgs.push("--require");
    extraNodeArgs.push("ts-node/register");
  }

  return extraNodeArgs;
}
