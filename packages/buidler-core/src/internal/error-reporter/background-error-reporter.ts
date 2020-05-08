/**
 * Background worker to run a proxied singleton instance
 * independently of the parent process.
 * TODO right now is only for ErrorReporter but it could be generic...
 */
import debug from "debug";

import { ErrorReporter } from "./error-reporter";
import Signals = NodeJS.Signals;

const EXIT_TIMEOUT = 5000; // maximum timeout for exitHandler on exit signal or disconnect event

// @ts-ignore
debug.formatArgs = formatArgs;

// log to file, excluding colors chars
const log = debug(`buidler:core:background:fork:file`);

/**
 * Properly format logs for file (if colors are disabled)
 * @param args
 */
function formatArgs(args: any[]) {
  // @ts-ignore
  const self = this as any;
  const name = self.namespace;
  const useColors = self.useColors && !isChildProcess(); // never use colors on childProcess instance
  const space = "                       ";
  const dateTime = `[${new Date().toJSON()}]`;
  let prefix = "";
  const pid = `[${process.pid}]`;
  let line: string;
  if (useColors) {
    const c = self.color;
    const colorCode = `[3${c < 8 ? c : `8;5;${c}`}`;
    prefix = ` ${colorCode};1m${name} [0m`;
    args[0] =
      dateTime + pid + prefix + args[0].split("\n").join(`\n${space}${prefix}`);
    // @ts-ignore
    line = `${colorCode}m+${debug.humanize(self.diff)}[0m`;
  } else {
    prefix = ` ${name} `;
    args[0] =
      dateTime + pid + prefix + args[0].split("\n").join(`\n${space}${prefix}`);
    // @ts-ignore
    line = `+${debug.humanize(self.diff)}`;
  }
  args.push(line);
}

/**
 * get argName param value from argv in format argName=argValue
 * @param argName
 * @return argValue
 * @throws if not match in argName or bad value thing
 */
function getArgvParam(argName: string): any | any[] {
  const nodeArgv = process.argv;
  const argvPrefix = `${argName}=`;
  try {
    const argvContainer = nodeArgv.filter((arg) => arg.includes(argvPrefix));
    if (argvContainer.length === 0) {
      throw new Error(`not found arg with prefix: '${argvPrefix}'`);
    }
    const argValueContainer = argvContainer[0].split(argvPrefix);
    if (argValueContainer.length < 2) {
      throw new Error("argv value is empty");
    }
    const argvValueStr = argValueContainer[1];
    // const argValueStr = argvContainer.map((val) => val.split("=")[1])[0];
    return JSON.parse(argvValueStr);
  } catch (error) {
    throw new Error(
      `Failed at retrieving arg '${argName}' ` +
        `from process.argv: ${JSON.stringify(nodeArgv)}. Reason: ${
          error.message || error
        }`
    );
  }
}

/**
 * Util method to ensure current process is childProcess
 */
function isChildProcess() {
  return process.send !== undefined;
}

/**
 * util wrapper of process.send(),
 * will work only if currently running as childProcess instance,
 * or will throw an idiomatic error otherwise
 *
 * @param message - to be sent to the parent process
 */
async function processSend(message: any): Promise<void> {
  if (!isChildProcess()) {
    throw new Error(
      "attempt to call process.send() but not running as child process"
    );
  }
  await new Promise((resolve, reject) => {
    process.send!(message, (error: Error) =>
      error ? reject(error) : resolve()
    );
  });
}

const bufferMessages: any[] = [];

function setupExitHandlers(
  errorReporter: ErrorReporter,
  resolve: () => void,
  reject: (error: Error) => void
) {
  const exitHandlerPartial = gracefulExitHandler.bind(
    null,
    errorReporter,
    resolve,
    reject
  );

  // register exit gracefully when parent process is disconnected
  process.on("disconnect", () => exitHandlerPartial("disconnect"));

  // register exit gracefully on kill signals
  const exitSignals: Signals[] = [`SIGINT`, `SIGUSR1`, `SIGUSR2`, `SIGTERM`];
  exitSignals.forEach((eventType) => {
    process.on(eventType, () => exitHandlerPartial(eventType));
  });

  // poll parent process, disconnect if none available
  pollUntilParentDisconnect().then(() => {
    process.emit("disconnect");
  });
}

async function runMessagesListener(errorReporter: ErrorReporter) {
  return new Promise(async (resolve, reject) => {
    setupExitHandlers(errorReporter, resolve, reject);

    // all ready -> all events setted up -> clear buffered messages and listen for new ones.
    await runMessagesHandler(errorReporter);
  });
}

async function main() {
  log(`started child [pid ${process.pid}]`);
  // start buffering first inbound messages
  process.on("message", preSetupMessagesListener);

  // get subject setup props params
  const setupProps = getArgvParam("props");
  log("argv 'props' params: ", setupProps);

  /// ** SECTION subject setup start **
  const [rootPath, enabled, background = false] = setupProps;
  await ErrorReporter.setup(rootPath, enabled, background);
  const errorReporter = ErrorReporter.getInstance();

  if (!ErrorReporter.isEnabled(errorReporter)) {
    throw new Error("Setup failed, error reporter instance is disabled");
  }
  log("setup error reporter in background succesfully");
  /// ** SECTION subject setup done **

  await runMessagesListener(errorReporter);
}

/**
 * Explicitly poll for parent process disconnection, in case the "disconnect"
 * event wasn't triggered properly.
 * @param intervalMs - poll interval in ms. Default 1000
 */
function pollUntilParentDisconnect(intervalMs: number = 1000): Promise<void> {
  if (!isChildProcess()) {
    log("not running as child process, emit disconnect");
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const interval = setInterval(async function isAliveCheck() {
      try {
        await processSend("isAlive?");
      } catch (error) {
        log(`parent process disconnected? error on process.send(): ${error}`);
        clearInterval(interval);
        resolve();
      }
    }, intervalMs);
  });
}

function preSetupMessagesListener(message: any) {
  log("got message before setup: ", message);
  bufferMessages.push(message);
}

async function clearBufferedMessages(
  messageHandler: (payload: { method: string; args: any[] }) => Promise<void>
) {
  for (const message of bufferMessages) {
    Object.assign(message, { _comments: "buffered" });
    await messageHandler(message);
  }
}

async function runMessagesHandler(errorReporter: ErrorReporter) {
  const messageHandler = handleMethodCallMessage.bind(null, errorReporter);

  // clear buffered messages
  // start listening and handling new messages
  // remove buffered "message" listener
  await clearBufferedMessages(messageHandler);
  const messageListeners = process.listeners("message");
  process.on("message", messageHandler);
  process.removeListener("message", preSetupMessagesListener);
}

/////////////////////////////////
/// *** event handlers ***
/////////////////////////////////
async function gracefulExitHandler(
  _errorReporter: ErrorReporter,
  _onSuccess: () => void,
  _onError: (error: Error) => void,
  _reason: string
) {
  log(`exit handler '${_reason}'. finalizing process...`);
  // cleanup
  try {
    await closeHandler(_errorReporter);
    _onSuccess();
  } catch (error) {
    error.message = `error on closeHandler errorReporter. Resaon: ${
      error.message || error
    }`;
    log(error);
    _onError(error);
  }
}

async function handleMethodCallMessage(
  subject: ErrorReporter,
  payload: { method: string; args: any[] }
) {
  log("handling message! payload: ", payload);

  const { method: methodName, args } = payload;
  if (methodName === "isAlive") {
    // log(`debug: got isAlive #${args[0]}`);
    return;
  }
  try {
    await runMethod(subject, methodName, args);
  } catch (error) {
    log(`Error on runMethod '${methodName}': ${error.message || error}`);
  }
}

/**
 * Cleanup action delegated to the subject
 * TODO actually delegate it instead of explicitly calling it...
 * TODO cont/ for example, by doing await subject.cleanup() ? Or even await SubjectProvider.cleanup() ?
 *
 * @param errorReporter - the subject
 */
async function closeHandler(errorReporter: ErrorReporter) {
  const { pendingReports } = errorReporter;
  const isDone = pendingReports.length === 0;
  if (isDone) {
    log(`no pending reports to send`);
    return;
  }
  log(`sending ${pendingReports.length} pending reports...`);
  const cleanupPromise = errorReporter
    .sendPendingReports()
    .then(() => log(`all pending reports sent`));
  const timeoutPromise = new Promise((r) =>
    setTimeout(r, EXIT_TIMEOUT)
  ).then(() => log(`exit timeout after ${EXIT_TIMEOUT}`));

  return Promise.race([cleanupPromise, timeoutPromise]);
}

async function runMethod(subject: any, methodName: string, args: any[]) {
  if (!hasMethod(subject, methodName)) {
    const errMsg = `No such method in subject: #${methodName}`;
    throw new Error(errMsg);
  }

  log(`Calling subject[${methodName}] with args: \n${JSON.stringify(args)}`);
  await subject[methodName](...args);
}

/**
 * Get all method names in an instance object
 * @param obj
 */
function getAllMethodNames(obj: any) {
  const methods = new Set();
  // tslint:disable-next-line:no-conditional-assignment
  while ((obj = Reflect.getPrototypeOf(obj))) {
    const keys = Reflect.ownKeys(obj);
    keys.forEach((k) => methods.add(k));
  }
  return methods;
}

/**
 * check if methodName exists in instance object, then type guard the instance
 * @param instance
 * @param methodName
 */
function hasMethod(
  instance: any,
  methodName: string
): instance is { [methodName: string]: (...args: any[] | any) => any } {
  return getAllMethodNames(instance).has(methodName);
}

main()
  .then(() => {
    log("~ finished.");
    process.exit(0);
  })
  .catch((error) => {
    log("Unexpected error: ", error);
    process.exit(process.exitCode || 1);
  });
