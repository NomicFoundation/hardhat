import { CustomError } from "../error.js";

export class BaseMultiProcessMutexError extends CustomError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
  }
}

export class InvalidMultiProcessMutexPathError extends BaseMultiProcessMutexError {
  constructor(mutexPath: string) {
    super(`The path ${mutexPath} is not a valid absolute path.`);
  }
}

export class MultiProcessMutexError extends BaseMultiProcessMutexError {
  constructor(lockPath: string, cause: Error) {
    super(`Unexpected error with lock at ${lockPath}: ${cause.message}`, cause);
  }
}

export class MultiProcessMutexTimeoutError extends BaseMultiProcessMutexError {
  constructor(lockPath: string, timeoutMs: number) {
    super(
      `Timed out waiting to acquire lock at ${lockPath} after ${timeoutMs}ms`,
    );
  }
}

export class StaleMultiProcessMutexError extends BaseMultiProcessMutexError {
  constructor(lockPath: string, ownerUid: number | undefined, cause: Error) {
    const uidInfo = ownerUid !== undefined ? ` (uid: ${ownerUid})` : "";
    super(
      `Lock at ${lockPath} appears stale but cannot be removed due to insufficient permissions${uidInfo}. Please remove it manually: ${lockPath}`,
      cause,
    );
  }
}

export class IncompatibleMultiProcessMutexError extends BaseMultiProcessMutexError {
  constructor(message: string) {
    super(message);
  }
}

export class IncompatibleHostnameMultiProcessMutexError extends IncompatibleMultiProcessMutexError {
  constructor(
    lockPath: string,
    foreignHostname: string,
    currentHostname: string,
  ) {
    super(
      `Lock at ${lockPath} was created by a different host (${foreignHostname}, current: ${currentHostname}). It cannot be verified or removed automatically. Please remove it manually: ${lockPath}`,
    );
  }
}

export class IncompatiblePlatformMultiProcessMutexError extends IncompatibleMultiProcessMutexError {
  constructor(
    lockPath: string,
    foreignPlatform: string,
    currentPlatform: string,
  ) {
    super(
      `Lock at ${lockPath} was created on a different platform (${foreignPlatform}, current: ${currentPlatform}). It cannot be verified or removed automatically. Please remove it manually: ${lockPath}`,
    );
  }
}

export class IncompatibleUidMultiProcessMutexError extends IncompatibleMultiProcessMutexError {
  constructor(lockPath: string, foreignUid: number, currentUid: number) {
    super(
      `Lock at ${lockPath} is owned by a different user (uid: ${foreignUid}, current: ${currentUid}). It cannot be removed automatically. Please remove it manually: ${lockPath}`,
    );
  }
}
