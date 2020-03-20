import { ChildProcess, spawn } from "child_process";
import detect from "detect-port";

const { GANACHE_PORT } = process.env;

const port = GANACHE_PORT !== undefined ? Number(GANACHE_PORT) : 8545;

export function cleanup(ganacheChild: ChildProcess) {
  if (ganacheChild === undefined || ganacheChild === null) {
    return;
  }
  ganacheChild.kill();
}

async function startGanache(args: string[] = []): Promise<ChildProcess> {
  const ganacheCliPath = require.resolve("ganache-cli/cli.js");

  const ganacheChild = spawn("node", [ganacheCliPath, ...args]);
  console.time("Ganache spawn");

  // wait for ganache child process to start
  await new Promise((resolve, reject) => {
    ganacheChild.stdout.setEncoding("utf8");
    ganacheChild.stderr.setEncoding("utf8");

    function checkIsRunning(data: string | Buffer) {
      const log = data.toString();

      const logLower = log.toLowerCase();
      const isRunning = logLower.includes("listening on");
      if (isRunning) {
        return resolve();
      }
      const isError = logLower.includes("error") && !log.includes("mnemonic");
      if (isError) {
        return reject(new Error(log));
      }
    }

    ganacheChild.stdout.on("data", checkIsRunning);
    ganacheChild.stderr.on("data", checkIsRunning);
  });
  console.timeEnd("Ganache spawn");
  return ganacheChild;
}

/**
 * Returns true if port is already in use.
 */
async function isGanacheRunning() {
  const suggestedFreePort = await detect(port);
  const isPortInUse = suggestedFreePort !== port;

  return isPortInUse;
}

export async function ganacheSetup(
  args: string[] = []
): Promise<ChildProcess | null> {
  if (await isGanacheRunning()) {
    // if ganache is already running, we just reuse the instance
    return null;
  }

  return startGanache(args);
}
