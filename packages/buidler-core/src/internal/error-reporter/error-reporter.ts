import debug from "debug";

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
  enqueueErrorReport(error: Error): void;
  sendPendingReports(): Promise<void>;
}

const log = debug(`buidler:core:error-reporter`);

export class ErrorReporter implements ErrorReporterInterface {
  /**
   * Setup ErrorReporter instance.
   *
   * @param rootPath
   * @param enabled
   */
  public static async setup(rootPath: string, enabled: boolean) {
    // don't enable errorReporter if running as local-dev context
    enabled = enabled && !isLocalDev();

    log(`ErrorReporter instance init (enabled: ${enabled})`);

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

    const client = new SentryClient(
      projectId,
      clientId,
      userType,
      userAgent,
      buidlerVersion
    );

    this._instance = new ErrorReporter(client);
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

  private static _instance: ErrorReporter | DisabledErrorReporter;

  public readonly client: ErrorReporterClient;
  public pendingReports: Array<Promise<void>> = [];

  private constructor(client: ErrorReporterClient) {
    this.client = client;
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
    this.enqueueErrorReport(error);

    await this.sendPendingReports();
  }

  /**
   * Enqueue error send promise, but don't await for it yet.
   * @see sendPendingReports() - with await or .then() to make sure all pending reports are sent.
   *
   * @param error
   */
  public enqueueErrorReport(error: Error) {
    const errorContext = contextualizeError(error);
    const errorSendPromise = this.client.sendErrorReport(error, errorContext);
    this.pendingReports.push(errorSendPromise);
  }

  public async sendPendingReports() {
    await Promise.all(this.pendingReports);
    this.pendingReports = [];
  }
}

/**
 * Disabled version of ErrorReporter.
 * Used to support ErrorReporter calls from anywhere even if it has not been properly set up (ie. outside CLI main process)
 * In these cases, calls will just be no-op.
 *
 * For example, this is useful when executed using Buidler as a library instead of a standalone CLI.
 */
class DisabledErrorReporter implements ErrorReporterInterface {
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

  /**
   * @see ErrorReporter#enqueueErrorReport for enabled version
   */
  public enqueueErrorReport(error: Error): void {
    // no op
  }

  /**
   * @see ErrorReporter#sendPendingReports for enabled version
   */
  public async sendPendingReports(): Promise<void> {
    // no op
  }
}

function contextualizeError(error: Error): ErrorContextData {
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
