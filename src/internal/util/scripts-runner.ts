import { fork } from "child_process";

export async function runScript(
  scriptPath: string,
  scriptArgs: string[] = [],
  extraNodeArgs: string[] = []
) {
  const fsExtra = await import("fs-extra");
  if (!fsExtra.pathExists(scriptPath)) {
    throw new Error("Path doesn't exist: " + scriptPath);
  }

  return new Promise((resolve, reject) => {
    const nodeArgs = [...process.execArgv, ...extraNodeArgs];

    const childProcess = fork(scriptPath, scriptArgs, {
      stdio: "inherit" as any, // There's an error in the TS definition of ForkOptions
      execArgv: nodeArgs
    });

    childProcess.once("close", resolve);
    childProcess.once("error", reject);
  });
}
