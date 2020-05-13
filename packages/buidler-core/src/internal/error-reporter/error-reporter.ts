import { ChildProcess } from "child_process";
import debug from "debug";
import { serializeError as serialize } from "serialize-error";

import { BuidlerError, BuidlerPluginError } from "../core/errors";
import { REVERSE_ERRORS_MAP } from "../core/errors-list";
import {
  getBuidlerVersion,
  getClientId,
  getProjectId,
  getUserAgent,
  getUserType,
  isLocalDev,
} from "../util/analytics";
import { runInBackground } from "../util/background-runner";
import { isRunningOnCiServer } from "../util/ci-detection";

import { ErrorReporterClient, SentryClient } from "./sentry";

export interface ErrorContextData {
  errorType: "BuidlerError" | "BuidlerPluginError" | "Error";
  // true if is originated from Buidler, false otherwise
  isBuidlerError: boolean;
  // the base Error object message
  message: string;

  // the buidler plugin name (only if is BuidlerPluginError)
  pluginName?: string;

  /* the following are only available if is BuidlerError */
  // error code number
  number?: number;
  // error category info
  category?: {
    // category key name
    name: string;
    // category readable description
    title: string;
    // min error number in category range (inclusive)
    min: number;
    // max error number in category range (inclusive)
    max: number;
  };

  // error key name
  name?: string;
  // error contextualized message (after processing the ErrorDescriptor message template)
  contextMessage?: string;
  // error title (may be Markdown)
  title?: string;
  // error description (may be Markdown)
  description?: string;
}

/**
 * The ErrorReporter interface that is exposed publicly.
 */
interface ErrorReporterInterface {
  sendMessage(message: string, context: any): Promise<void>;
  sendErrorReport(error: Error): Promise<void>;
}

interface ClientConfig {
  clientId: string;
  buidlerVersion: string;
  userAgent: string;
  userType: "CI" | "Developer";
  projectId: string;
  projectRootPath: string;
}

/**
 * Errors matching any of these filters criteria will be ignored by the ErrorReporter
 */
const errorFilters: Array<(
  errorContext: ErrorContextData,
  error: Error
) => boolean> = [
  // ignore "missing task argument" errors
  ({ name }) => name === "MISSING_TASK_ARGUMENT",
];

const log = debug(`buidler:core:error-reporter`);

// this class instance will be used in the background.
export class ErrorReporter implements ErrorReporterInterface {
  /**
   * Setup ErrorReporter instance.
   *
   * @param rootPath
   * @param enabled
   * @param inBackground - if true, setup a proxy to the instance that will actually run in a background child process.
   */
  public static async setup(
    rootPath: string,
    enabled: boolean,
    inBackground: boolean
  ) {
    if (enabled && isLocalDev()) {
      // don't enable errorReporter if running as local-dev context
      log("running as local dev - setting enabled to false");
      enabled = false;
    }

    if (enabled && isRunningOnCiServer()) {
      log("running on CI server - setting enabled to false");
      enabled = false;
    }

    log(`ErrorReporter instance setup... (enabled: ${enabled}})`);

    if (!enabled) {
      this._instance = new DisabledErrorReporter();
      return;
    }

    const [buidlerVersion, clientId] = await Promise.all([
      getBuidlerVersion(),
      getClientId(),
    ]);

    const projectId = getProjectId(rootPath);
    const userType = getUserType();
    const userAgent = getUserAgent();

    const clientConfig: ClientConfig = {
      projectId,
      clientId,
      userType,
      userAgent,
      buidlerVersion,
      projectRootPath: rootPath,
    };

    this._instance = inBackground
      ? new ProxiedErrorReporter(this._setupInBackground(clientConfig))
      : new ErrorReporter(clientConfig);
  }

  /**
   * Get singleton instance of ErrorReporter, which is only available
   * if ErrorReporter.setup() has been called before (currently, only from main CLI);
   * otherwise a DisabledErrorReporter instance will be returned.
   */
  public static getInstance() {
    if (this._instance === undefined) {
      // if instance was not explicitly initialized, (ie. didn't call ErrorReporter.setup() first), just return a disabled instance
      return new DisabledErrorReporter();
    }
    return this._instance;
  }

  public static isEnabled(
    errorReporter: ErrorReporterInterface
  ): errorReporter is ErrorReporter | ProxiedErrorReporter {
    return (
      errorReporter instanceof ErrorReporter ||
      errorReporter instanceof ProxiedErrorReporter
    );
  }

  private static _instance: ErrorReporterInterface;

  private static _setupInBackground(clientConfig: ClientConfig): ChildProcess {
    // the real instance class name
    const className = ErrorReporter.name;
    // props used to instantiate the class
    const props = [clientConfig];

    return runInBackground(__filename, className, props);
  }

  public readonly client: ErrorReporterClient;

  /**
   * errors matching any of these criteria are excluded from reports
   */
  public readonly errorFilters = errorFilters;

  private constructor(clientConfig: ClientConfig) {
    this.client = new SentryClient(
      clientConfig.projectId,
      clientConfig.clientId,
      clientConfig.userType,
      clientConfig.userAgent,
      clientConfig.buidlerVersion,
      clientConfig.projectRootPath
    );
  }

  public async sendMessage(message: string, context: any) {
    await this.client.sendMessage(message, context);
  }

  /**
   * Enqueue a new error report send, and wait for all pending
   * errors (including this one) to be sent.
   *
   * @param error
   */
  public async sendErrorReport(error: Error) {
    const errorContext = contextualizeError(error);

    if (this._isFiltered(errorContext, error)) {
      log(`ignoring error report for '${error.message}'`);
      return;
    }

    return this.client.sendErrorReport(error, errorContext);
  }

  private _isFiltered(errorContext: ErrorContextData, error: Error) {
    return this.errorFilters.some((filter) => filter(errorContext, error));
  }
}

/**
 * Disabled version of ErrorReporter.
 * Used to support ErrorReporter calls from anywhere even if it has not been properly set up (ie. outside CLI main process)
 * In these cases, calls will just be no-op.
 *
 * For example, this is useful when executed using Buidler as a library instead of a standalone CLI.
 */
export class DisabledErrorReporter implements ErrorReporterInterface {
  /**
   * @see ErrorReporter#sendErrorReport for enabled version
   */
  public async sendErrorReport(error: Error): Promise<void> {
    // no op
  }

  /**
   * @see ErrorReporter#sendMessage for enabled version
   */
  public async sendMessage(message: string, context: any): Promise<void> {
    // no op
  }
}

export class ProxiedErrorReporter implements ErrorReporterInterface {
  private _subject: ChildProcess;

  constructor(subject: ChildProcess) {
    this._subject = subject;
  }

  public sendErrorReport(error: Error): Promise<void> {
    const message = serialize({
      method: "sendErrorReport",
      args: [error],
    });

    return this._sendPromise(message);
  }

  public async sendMessage(messageStr: string, context: any): Promise<void> {
    const message = serialize({
      method: "sendMessage",
      args: [messageStr, context],
    });

    return this._sendPromise(message);
  }

  private _sendPromise(message: any): Promise<void> {
    return new Promise((resolve, reject) => {
      this._subject.send(message, (error?: Error) => {
        if (error !== undefined && error !== null) {
          return reject(error);
        }
        return resolve();
      });
    });
  }
}

export function contextualizeError(error: Error): ErrorContextData {
  const _isBuidlerError = BuidlerError.isBuidlerError(error);
  const _isBuidlerPluginError = BuidlerPluginError.isBuidlerPluginError(error);

  const isBuidlerError = _isBuidlerError || _isBuidlerPluginError;
  const errorType = _isBuidlerError
    ? "BuidlerError"
    : _isBuidlerPluginError
    ? "BuidlerPluginError"
    : "Error";

  const { message } = error;

  let errorInfo = {};
  if (_isBuidlerPluginError) {
    const { pluginName } = error as BuidlerPluginError;
    errorInfo = {
      pluginName,
    };
  } else if (_isBuidlerError) {
    const buidlerError = error as BuidlerError;

    // error specific/contextualized info
    const {
      number,
      errorDescriptor: { message: contextMessage, description, title },
    } = buidlerError;

    // general buidler error info
    const errorData = REVERSE_ERRORS_MAP[number];
    const { category, name } = errorData;
    errorInfo = {
      number,
      contextMessage,
      description,
      category,
      name,
      title,
    };
  }

  return {
    errorType,
    isBuidlerError,
    message,
    ...errorInfo,
  };
}
