import { fork } from "child_process";

export async function runScript(
  scriptPath: string,
  scriptArgs: string[] = [],
  extraNodeArgs: string[] = []
): Promise<number> {
  return new Promise((resolve, reject) => {
    const nodeArgs = [
      ...process.execArgv,
      ...getTsNodeArgsIfNeeded(),
      ...extraNodeArgs
    ];

    const childProcess = fork(scriptPath, scriptArgs, {
      stdio: "inherit" as any, // There's an error in the TS definition of ForkOptions
      execArgv: nodeArgs
    });

    childProcess.once("close", resolve);
    childProcess.once("error", reject);
  });
}

function getTsNodeArgsIfNeeded() {
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
