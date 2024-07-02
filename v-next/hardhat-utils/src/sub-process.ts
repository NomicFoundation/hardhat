import { spawn } from "node:child_process";

/**
 * Spawns a detached subprocess to execute a given file with optional arguments.
 *
 * @param absolutePathToSubProcessFile - The absolute path to the subprocess file to be executed.
 * @param [args=[]] - Optional arguments to pass to the subprocess.
 *
 * The subprocess runs in a detached mode and its standard input/output is ignored.
 * This function does not wait for the subprocess to complete and the subprocess is unreferenced
 * to allow the parent process to exit independently.
 */
export function spawnSubProcess(
  absolutePathToSubProcessFile: string,
  args: string[] = [],
): void {
  const subprocess = spawn(
    process.execPath,
    ["--import", "tsx/esm", absolutePathToSubProcessFile, ...args],
    {
      detached: true,
      stdio: "ignore",
    },
  );

  subprocess.unref();
}
