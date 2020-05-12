import { ChildProcess, fork } from "child_process";
import debug from "debug";
import fs from "fs-extra";
import path from "path";
import { withFixedInspectArg } from "./scripts-runner";

const _log = debug("buidler:core:background-runner");

// higher order fn to append date to logs
const preDateLogger = (logFn: debug.Debugger) => (
  formatter: any,
  ...args: any[]
) => {
  logFn(`[${new Date().toJSON()}]`, ...[formatter, ...args]);
};

const log = preDateLogger(_log);

// the worker script path, that will run as a child process fork
const CHILD_WORKER_PATH = "./background-worker";
const childWorkerAbsolutePath = path.join(__dirname, CHILD_WORKER_PATH);

/**
 * Run in background an instance of a class, which will listen to messages
 * that represent calls of it's methods.
 *
 * @param classFile - the source file path where the class is defined
 * @param className - the name of the class
 * @param props - the props to be used for the class instance constructor
 * @return childProcess instance - send method messages to it
 */
export function runInBackground(
  classFile: string,
  className: string,
  props: any[] = []
): ChildProcess {
  const childSetupConfig = {
    pathToClass: _pathRelativeFromChildWorker(classFile),
    className,
    props,
  };

  const childNodeArgs = Object.entries(childSetupConfig).map(
    ([key, value]) => `${key}=${JSON.stringify(value)}`
  );

  const nodeExecArgv = withFixedInspectArg(process.execArgv);
  if (!nodeExecArgv.includes("ts-node/register")) {
    nodeExecArgv.push("--require");
    nodeExecArgv.push("ts-node/register");
  }

  log("[debug] forking child with args: ", { childNodeArgs, nodeExecArgv });

  const logFilePath = path.join(process.cwd(), "./debug.log");
  const logFile = debug.enabled("buidler*") ? logFilePath : undefined;

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
  const child = fork(childWorkerAbsolutePath, childNodeArgs, {
    stdio,
    execArgv: nodeExecArgv,
    detached: true,
  });
  child.unref(); // don't force parent process to wait for childProcess to exit

  const childName = `${className} [pid ${child.pid}]`;
  log(`running ${childName} as child process instance`);

  const childLog = extendLog(toMiddleSnakeCase(className));

  // listen to child process events, and just log them
  child.on("message", function (message) {
    if (Object.keys(message).length === 0) {
      // empty message, ignore
      return;
    }
    childLog(`${childName} message:`, message);
  });
  child.once("error", function (error) {
    childLog(`${childName} error:`, error);
  });
  child.once("exit", function (code, signal) {
    childLog(`${childName} exit:`, { code, signal });
  });
  child.once("disconnect", function () {
    childLog(`${childName} disconnected.`);
  });
  return child;
}

function _pathRelativeFromChildWorker(filename: string) {
  const childWorkerAbsoluteDir = path.dirname(childWorkerAbsolutePath); // path.join(__dirname, childWorkerAbsoluteDir);
  const childWorkerPathToFile = path.relative(childWorkerAbsoluteDir, filename);

  const toPosixPath = (win32Path: string) => {
    return win32Path.replace(/\\/g, "/");
  };
  return `./${toPosixPath(childWorkerPathToFile)}`;
}

function extendLog(extNamespace: string) {
  const extLog = _log.extend(extNamespace);

  return preDateLogger(extLog);
}

// utility function to convert a string to middle-snake-case
export function toMiddleSnakeCase(aString: string) {
  return aString
    .trim()
    .split(/(?=[A-Z])/)
    .join("-")
    .toLowerCase();
}
