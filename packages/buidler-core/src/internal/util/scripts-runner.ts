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
    const processExecArgv = withFixedInspectArg(process.execArgv);

    const nodeArgs = [
      ...processExecArgv,
      ...getTsNodeArgsIfNeeded(scriptPath),
      ...extraNodeArgs,
    ];

    const childProcess = fork(scriptPath, scriptArgs, {
      stdio: "inherit" as any, // There's an error in the TS definition of ForkOptions
      execArgv: nodeArgs,
      env: { ...process.env, ...extraEnvVars },
    });

    childProcess.once("close", (status) => {
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
      ...extraEnvVars,
    }
  );
}

/**
 * Fix debugger "inspect" arg from process.argv, if present.
 *
 * When running this process with a debugger, a debugger port
 * is specified via the "--inspect-brk=" arg param in some IDEs/setups.
 *
 * This normally works, but if we do a fork afterwards, we'll get an error stating
 * that the port is already in use (since the fork would also use the same args,
 * therefore the same port number). To prevent this issue, we could replace the port number with
 * a different free one, or simply use the port-agnostic --inspect" flag, and leave the debugger
 * port selection to the Node process itself, which will pick an empty AND valid one.
 *
 * This way, we can properly use the debugger for this process AND for the executed
 * script itself - even if it's compiled using ts-node.
 */
function withFixedInspectArg(argv: string[]) {
  const fixIfInspectArg = (arg: string) => {
    if (arg.toLowerCase().includes("--inspect-brk=")) {
      return "--inspect";
    }
    return arg;
  };
  return argv.map(fixIfInspectArg);
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
    ExecutionMode.EXECUTION_MODE_LINKED,
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
