import { ChildProcess, fork } from "child_process";
import debug from "debug";
import fs from "fs-extra";

const _log = debug("buidler:core:background-runner");
const log = (formatter: any, ...args: any[]) =>
  _log(`[${new Date().toJSON()}]`, ...[formatter, ...args]);

export function runInBackground(
  childPath: string,
  extraNodeArgs: string[] = [],
  logFile?: string
): ChildProcess {
  const nodeExecArgv = process.execArgv;
  const args = [...process.argv.slice(2), ...extraNodeArgs];
  log({ args, nodeExecArgv });

  // if logging is enabled, redirect child output to logFile - otherwise, ignore it.
  let stdio = "ignore" as any; // don't share stdio with child process to allow it to run independently
  if (logFile) {
    const out = fs.openSync(logFile, "a");
    const err = fs.openSync(logFile, "a");
    stdio = ["ignore", out, err, "ipc"]; // redirect output to logFile
    log("child logs enabled, at file: ", logFile);
  } else {
    log("no child log enabled");
  }

  // create childProcess instance, which will run independently from the this parent process
  const child = fork(childPath, args, {
    stdio,
    execArgv: nodeExecArgv,
    detached: true, // TODO is this needed in fork?
  });
  child.unref(); // don't force parent process to wait for childProcess to exit

  // const childPidMsg = `child [pid ${child.pid}] ${childPath}`;
  log(`running child [pid ${child.pid}] ${childPath}`);

  return child;
}
