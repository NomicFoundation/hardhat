import { ChildProcess, spawn } from "child_process";
import * as os from "os";
// tslint:disable-next-line:no-implicit-dependencies
import * as shell from "shelljs";

const sleep = (timeout: number) =>
  new Promise(resolve => setTimeout(resolve, timeout));

export function cleanup(ganacheChild: ChildProcess) {
  if (!ganacheChild) {
    return;
  }
  ganacheChild.kill();
}

async function startGanache(args: string[] = []): Promise<ChildProcess> {
  const ganacheCliPath = "../../node_modules/ganache-cli/cli.js";

  const ganacheChild = spawn("node", [ganacheCliPath, ...args], {
    stdio: "ignore"
  });

  // TODO would be better if here we wait for instance to effectively start...
  await sleep(4000);
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
