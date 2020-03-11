import debug from "debug";
import path from "path";

import { BuidlerArguments } from "../../types";
import { ExecutionMode, getExecutionMode } from "../core/execution-mode";
import { getEnvVariablesMap } from "../core/params/env-variables";

const log = debug("buidler:core:scripts-runner");

export async function runScript(
  scriptPath: string,
  scriptArgs: string[] = [],
  extraNodeArgs: string[] = [],
  extraEnvVars: { [name: string]: string } = {}
): Promise<number> {
  const { fork } = await import("child_process");

  return new Promise((resolve, reject) => {
    const processExecArgv = process.execArgv.map(arg => {
      if (arg.toLowerCase().includes("--inspect-brk=")) {
        // directly use '--inspect' flag, for debuggability
        return "--inspect";
      }
      return arg;
    });

    const nodeArgs = [
      ...processExecArgv,
      ...getTsNodeArgsIfNeeded(scriptPath),
      ...extraNodeArgs
    ];

    const childProcess = fork(scriptPath, scriptArgs, {
      stdio: "inherit" as any, // There's an error in the TS definition of ForkOptions
      execArgv: nodeArgs,
      env: { ...process.env, ...extraEnvVars }
    });

    childProcess.once("close", status => {
      log(`Script ${scriptPath} exited with status code ${status}`);

      resolve(status);
    });
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
  log(`Creating Buidler subprocess to run ${scriptPath}`);

  const buidlerRegisterPath = resolveBuidlerRegisterPath();

  return runScript(
    scriptPath,
    scriptArgs,
    [...extraNodeArgs, "--require", buidlerRegisterPath],
    {
      ...getEnvVariablesMap(buidlerArguments),
      ...extraEnvVars
    }
  );
}

/**
 * Ensure buidler/register source file path is resolved to compiled JS file
 * instead of TS source file, so we don't need to run ts-node unnecessarily.
 */
export function resolveBuidlerRegisterPath() {
  const executionMode = getExecutionMode();
  const isCompiledInstallation = [
    ExecutionMode.EXECUTION_MODE_LOCAL_INSTALLATION,
    ExecutionMode.EXECUTION_MODE_GLOBAL_INSTALLATION,
    ExecutionMode.EXECUTION_MODE_LINKED
  ].includes(executionMode);

  const buidlerCoreBaseDir = path.join(__dirname, "..", "..");

  const buidlerCoreCompiledDir = isCompiledInstallation
    ? buidlerCoreBaseDir
    : path.join(buidlerCoreBaseDir, "..");

  const buidlerCoreRegisterCompiledPath = path.join(
    buidlerCoreCompiledDir,
    "register"
  );

  return buidlerCoreRegisterCompiledPath;
}

function getTsNodeArgsIfNeeded(scriptPath: string) {
  if (getExecutionMode() !== ExecutionMode.EXECUTION_MODE_TS_NODE_TESTS) {
    return [];
  }

  if (!/\.tsx?$/i.test(scriptPath)) {
    return [];
  }

  const extraNodeArgs = [];

  if (!process.execArgv.includes("ts-node/register")) {
    extraNodeArgs.push("--require");
    extraNodeArgs.push("ts-node/register");
  }

  return extraNodeArgs;
}
