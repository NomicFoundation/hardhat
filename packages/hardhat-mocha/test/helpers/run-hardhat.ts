import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

/**
 * Spawns the Hardhat CLI as a child process to run the `test mocha` task in a
 * given fixture project.
 *
 * Why a subprocess?
 *
 * Because of how the ESM module cache works, the `hardhat-mocha` task can only
 * complete one real test run per process: `mocha.loadFilesAsync()` does not
 * work correctly if used twice within the same process, so the task guards
 * against that and throws `TEST_TASK_ESM_TESTS_RUN_TWICE` on the second run.
 *
 * `test/index.ts` already performs one in-process run (the "should work"
 * scenario), so any additional scenario that needs a *real* run — such as
 * exercising the `--grep` name filter — cannot call the task in-process
 * without tripping that guard.
 *
 * By spawning a fresh Hardhat CLI process here, the grep run gets its own
 * realm where the guard starts clean, the filtering is exercised for real, and
 * the outer `node --test` run just observes the child's exit code.
 */

/**
 * Path to the built Hardhat CLI entry point.
 *
 * We can't resolve `"hardhat/dist/src/cli.js"` directly because that subpath
 * isn't declared in `hardhat`'s `exports`. Instead we resolve the package's
 * main entry (which *is* exported) and derive the sibling `cli.js` URL from
 * it. This keeps the lookup working regardless of where in the workspace
 * Hardhat is installed.
 */
const HARDHAT_CLI_PATH = fileURLToPath(
  new URL("./cli.js", import.meta.resolve("hardhat")),
);

export interface RunHardhatTestResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

/**
 * Runs `hardhat test mocha --no-compile` in the given fixture directory.
 *
 * @param cwd Absolute path to the fixture project (where its `hardhat.config`
 *   lives).
 * @param envOverrides Extra env vars merged onto the parent process env.
 *   Useful to seed values the fixture's config or assertions read — e.g.
 *   setting `HH_MOCHA_PARALLEL=true` so the fixture runs Mocha in parallel
 *   mode.
 * @param extraArgs Extra CLI arguments appended after `test mocha
 *   --no-compile` — e.g. `["--grep", "keep"]` to exercise the name filter.
 */
export async function runHardhatTest(
  cwd: string,
  envOverrides: NodeJS.ProcessEnv = {},
  extraArgs: string[] = [],
): Promise<RunHardhatTestResult> {
  // Build the child env by layering overrides on top of the parent env. Any
  // override key explicitly set to `undefined` is treated as "unset this var
  // in the child", so a caller can start the child without a var the parent
  // happens to have set.
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const [key, value] of Object.entries(envOverrides)) {
    if (value === undefined) {
      delete env[key];
    } else {
      env[key] = value;
    }
  }

  const child = spawn(
    process.execPath,
    [HARDHAT_CLI_PATH, "test", "mocha", "--no-compile", ...extraArgs],
    {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk: string) => {
    stderr += chunk;
  });

  const exitCode = await new Promise<number | null>((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code) => {
      resolve(code);
    });
  });

  return { exitCode, stdout, stderr };
}
