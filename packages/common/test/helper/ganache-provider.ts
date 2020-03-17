import { ChildProcess, spawn } from "child_process";
import * as os from "os";
// tslint:disable-next-line:no-implicit-dependencies
import * as shell from "shelljs";

export function cleanup(ganacheChild: ChildProcess) {
  if (!ganacheChild) {
    return;
  }
  ganacheChild.kill();
}

async function startGanache(args: string[] = []): Promise<ChildProcess> {
  const ganacheCliPath = "../../node_modules/ganache-cli/cli.js";

  const ganacheChild = spawn("node", [ganacheCliPath, ...args]);
  console.time("Ganache spawn");
  // wait for ganache child process to start
  await new Promise((resolve, reject) => {
    ganacheChild.stdout.setEncoding("utf8");
    ganacheChild.stderr.setEncoding("utf8");

    function checkIsRunning(data) {
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

function isWindows() {
  return os.type() === "Windows_NT";
}

function isGanacheRunning() {
  if (isWindows()) {
    // not checking for running ganache instance in Windows
    return false;
  }

  const nc = shell.exec("nc -z localhost 8545");

  return nc.code === 0;
}

export async function ganacheSetup(
  args: string[] = []
): Promise<ChildProcess | null> {
  if (isGanacheRunning()) {
    // if ganache is already running, we just reuse the instance
    return null;
  }

  return startGanache(args);
}
