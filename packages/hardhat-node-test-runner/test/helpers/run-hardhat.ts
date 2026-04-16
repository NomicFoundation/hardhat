import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

/**
 * Spawns the Hardhat CLI as a child process to run the `test nodejs` task in a
 * given fixture project.
 *
 * Why a subprocess?
 *
 * The `hardhat-node-test-runner` plugin calls `node:test`'s `run()` with
 * `isolation: "none"`, which executes every test file inline in the current
 * process instead of spawning a subprocess per file. That is intentional for
 * performance and behavioral consistency between files.
 *
 * The side effect is that we cannot invoke the `test nodejs` task *in-process*
 * from tests that are themselves running under `node --test`: we would end up
 * nesting a `node:test` run inside another `node:test` run in the same
 * process, which either hangs (Node 24) or crashes with IPC/event-loop errors
 * (Node 22).
 *
 * By spawning a fresh Hardhat CLI process here, the inner `run()` gets its own
 * realm: no nesting, `isolation: "none"` is still exercised for real inside
 * that child process, and the outer `node --test` just observes the exit
 * code.
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
 * Runs `hardhat test nodejs --no-compile` in the given fixture directory.
 *
 * @param cwd Absolute path to the fixture project (where its `hardhat.config`
 *   lives).
 * @param envOverrides Extra env vars merged onto the parent process env.
 *   Useful to seed values the fixture's assertions expect — e.g. setting
 *   `NODE_ENV=HELLO` so the inner test can assert it was preserved.
 */
export async function runHardhatTest(
  cwd: string,
  envOverrides: NodeJS.ProcessEnv = {},
): Promise<RunHardhatTestResult> {
  // Build the child env by layering overrides on top of the parent env. Any
  // override key explicitly set to `undefined` is treated as "unset this var
  // in the child" — important when the outer `node --test` run has NODE_ENV
  // preset and we need the child to start without it (so `??=` kicks in).
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
    [HARDHAT_CLI_PATH, "test", "nodejs", "--no-compile"],
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
