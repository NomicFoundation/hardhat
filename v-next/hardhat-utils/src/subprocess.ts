import { spawn } from "node:child_process";

/**
 * Spawns a detached subprocess to execute a given file with optional arguments.
 *
 * @param absolutePathToSubProcessFile - The absolute path to the subprocess file to be executed.
 * @param args - Optional list of string arguments to pass to the subprocess.
 * @param env - Optional environment key-value pairs to pass to the subprocess.
 *
 * The subprocess runs in a detached mode and its standard input/output is ignored.
 * This function does not wait for the subprocess to complete and the subprocess is unreferenced
 * to allow the parent process to exit independently.
 */
export function spawnDetachedSubProcess(
  absolutePathToSubProcessFile: string,
  args: string[] = [],
  env: Record<string, string> = {},
): void {
  const subprocessArgs = [absolutePathToSubProcessFile, ...args];

  if (absolutePathToSubProcessFile.endsWith(".ts")) {
    subprocessArgs.unshift("--import", "tsx/esm");
  }

  const subprocess = spawn(process.execPath, subprocessArgs, {
    detached: true,
    env,
    stdio: "ignore",
  });

  subprocess.unref();
}
