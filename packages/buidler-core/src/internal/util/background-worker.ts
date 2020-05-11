/**
 * Background worker to run a proxied singleton instance
 * independently of the parent process.
 */
import debug from "debug";
import { deserializeError, serializeError } from "serialize-error";

import { toMiddleSnakeCase } from "./background-runner";

import Signals = NodeJS.Signals;

/**
 * The callable subject that will handle the background task
 */
type CallableSubject = any;

const EXIT_TIMEOUT = 25000; // maximum timeout for exitHandler on exit signal or disconnect event

// @ts-ignore
debug.formatArgs = formatArgs;

// log to file, excluding colors chars
const log = debug(`buidler:core:background-worker`);

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
    const argvValueStr = argvContainer[0].split(argvPrefix)[1];
    if (argvValueStr.length === 0) {
      return undefined;
    }
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

/**
 * Shared messages counters to keep track of remaining messages on process disconnection.
 * Also useful as a quick-glance of the state of the process at a given time.
 */
const messageCounters = {
  total: 0,
  handled: 0,
  success: 0,
  error: 0,
};

/**
 * Util method to check if there is still pending work left to wait for.
 */
function isFinished() {
  return messageCounters.handled === messageCounters.total;
}

const context = {
  subjectClassName: "",
};

async function main() {
  log(`started child [pid ${process.pid}]`);
  // start buffering first inbound messages
  process.on("message", preSetupMessagesListener);

  // read subject instantiation params from node argv vars
  const constructorProps = getArgvParam("props");
  log("argv 'props' param value: ", constructorProps);
  const pathToClass = getArgvParam("pathToClass");
  log("argv 'pathToClass' param value: ", pathToClass);
  const className = getArgvParam("className");
  log("argv 'className' param value: ", className);
  context.subjectClassName = className;

  // add className as snake-case to log namespace
  const classNameNamespace = toMiddleSnakeCase(className);
  log.namespace += `:${classNameNamespace}`;

  // dynamic import specified module file, and get the subject constructor by className
  const importedModule = await import(pathToClass);
  const constructorClass = importedModule[className];

  // instantiate the class with provided constructor props
  const instance = new constructorClass(...(constructorProps || []));

  log(`setup of ${className} instance in background successful`);

  await runMessagesListener(instance);
}

function setupExitHandlers(
  resolve: () => void,
  reject: (error: Error) => void
) {
  const exitHandlerPartial = gracefulExitHandler.bind(null, resolve, reject);

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

async function runMessagesListener(subject: CallableSubject) {
  return new Promise(async (resolve, reject) => {
    setupExitHandlers(resolve, reject);

    // all ready -> all events setted up -> clear buffered messages and listen for new ones.
    await runMessagesHandler(subject);
  });
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
        // send empty message just to check if still connected
        await processSend("");
      } catch (error) {
        log(
          `detected parent disconnect, due to error on process.send(): ${error}`
        );
        clearInterval(interval);
        resolve();
      }
    }, intervalMs);
  });
}
const bufferMessages: any[] = [];

function preSetupMessagesListener(payload: any) {
  const index = bufferMessages.length;
  log(`got message #${index} before setup: `, payload);

  bufferMessages.push(payload);
}

async function clearBufferedMessages(
  messageHandler: (payload: { method: string; args: any[] }) => Promise<void>
) {
  for (const message of bufferMessages) {
    await messageHandler(message);
  }
}

async function runMessagesHandler(subject: CallableSubject) {
  const messageHandler = handleMethodCallMessage.bind(null, subject);

  // clear buffered messages
  // start listening and handling new messages
  // remove buffered "message" listener
  await clearBufferedMessages(messageHandler);
  process.on("message", messageHandler);
  process.removeListener("message", preSetupMessagesListener);
}

/////////////////////////////////
/// *** event handlers ***
/////////////////////////////////
async function gracefulExitHandler(
  _onSuccess: () => void,
  _onError: (error: Error) => void,
  _exitReason: string
) {
  log(`exit handler '${_exitReason}'. finalizing process...`);
  // cleanup
  try {
    await closeHandler();
    _onSuccess();
  } catch (error) {
    error.message = `error on closeHandler. Reason: ${error.message || error}`;
    log(error);
    _onError(error);
  }
}

function deserializeErrors(serializedArgs: any[]) {
  const _isError = (value: any) =>
    (value.stack !== undefined && value.message !== undefined) ||
    (value.name !== undefined && value.name.toLowerCase().includes("error"));

  return serializedArgs.map((arg) => {
    if (!_isError(arg)) {
      // not an error, return original arg value
      return arg;
    }
    const deserialized = deserializeError(arg);
    if (deserialized.name === "NonError") {
      // not an error, return original arg value
      return arg;
    }
    // it was an error arg value, return it deserialized.
    return deserialized;
  });
}

async function handleMethodCallMessage(
  subject: CallableSubject,
  payload: { method: string; args?: any[] }
) {
  if (Array.isArray(payload.args)) {
    payload.args = deserializeErrors(payload.args);
  }

  const { method: methodName, args } = payload;
  if (methodName === undefined) {
    log("No 'method' name specified in payload, ignoring message", payload);
    return;
  }

  const index = messageCounters.total++;
  Object.assign(payload, { _id: index });
  log(`handling message #${index}, payload: `, payload);

  let result: any;
  let error: any;
  try {
    result = await runMethod(subject, methodName, args);
    messageCounters.success++;
  } catch (_error) {
    error = _error;
    messageCounters.error++;
    log(`Error handling message #${index}:`, error);
  }
  messageCounters.handled++;

  // send message with result info to parent process
  const message = { _id: index, timestamp: new Date().toJSON() };
  Object.assign(
    message,
    error !== undefined
      ? { status: "error", error: serializeError(error) }
      : { status: "success", result }
  );

  try {
    await processSend(message);
  } catch (_error) {
    // parent disconnected, ignore error
  }
}

/**
 * Poll interval to wait until all inbound messages have been handled (either successfully or with error).
 *
 * @param intervalMs - optional (default 1000ms)
 */
function pollWaitForPendingMessages(intervalMs: number = 1000): Promise<void> {
  return new Promise((resolve) => {
    let previousHandled = messageCounters.handled;
    const pollInterval = setInterval(() => {
      if (!isFinished()) {
        // not finished yet, continue interval
        const hasChanged = previousHandled !== messageCounters.handled;
        if (hasChanged) {
          // log stats update if they have changed
          log("stats update: ", messageCounters);
          previousHandled = messageCounters.handled;
        }
        return;
      }
      // all completed
      log("no pending messages left. Stats: ", messageCounters);
      clearInterval(pollInterval);
      resolve();
    }, intervalMs);
  });
}

/**
 * Cleanup: wait for pending messages to complete before exiting (limited by EXIT_TIMEOUT ms)
 */
async function closeHandler() {
  if (isFinished()) {
    log("No pending work left. Stats:", messageCounters);
    return;
  }
  log(
    `Waiting up to ${EXIT_TIMEOUT}ms for pending messages... Stats before closing: `,
    messageCounters
  );

  const cleanupPromise = pollWaitForPendingMessages().then(() =>
    log(`cleanup fully completed`)
  );

  const timeoutPromise = new Promise((r) =>
    setTimeout(r, EXIT_TIMEOUT)
  ).then(() => log(`cleanup timeout after ${EXIT_TIMEOUT}`));

  return Promise.race([cleanupPromise, timeoutPromise]).then(() =>
    log(`stats after closing: `, messageCounters)
  );
}

async function runMethod(
  subject: CallableSubject,
  methodName: string,
  args: any[] = []
) {
  const subjectMethodName = `${context.subjectClassName}#${methodName}`;
  if (!hasMethod(subject, methodName)) {
    const errMsg = `No such method ${subjectMethodName}`;
    throw new Error(errMsg);
  }

  log(`Calling ${subjectMethodName} with args: '${JSON.stringify(args)}'`);
  try {
    await subject[methodName](...args);
  } catch (error) {
    error.message = `Error on runMethod call '${subjectMethodName}': ${error.message}`;
    throw error;
  }
}

/**
 * Get all method names in an instance object
 * @param obj
 */
function _getAllMethodNames(obj: any) {
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
  return _getAllMethodNames(instance).has(methodName);
}

main()
  .then(() => {
    log("~ all done.");
    process.exit(0);
  })
  .catch((error) => {
    log("Unexpected error: ", error);
    process.exit(process.exitCode || 1);
  });
