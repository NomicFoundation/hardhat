import * as Sentry from "@sentry/node";
import debug from "debug";
import os from "os";

import { BuidlerError, BuidlerPluginError } from "../core/errors";
import { REVERSE_ERRORS_MAP } from "../core/errors-list";
import {
  getBuidlerVersion,
  getClientId,
  getProjectId,
  getUserAgent,
  getUserType,
  isLocalDev,
  UserType,
} from "../util/analytics";

interface ErrorContextData {
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

interface ErrorReporterClient {
  sendMessage(message: string, context: any): Promise<void>;
  sendErrorReport(error: Error): Promise<void>;
}

class SentryClient implements ErrorReporterClient {
  public static SENTRY_FLUSH_TIMEOUT = 3000;
  private readonly _SENTRY_DSN =
    "https://38ba58bb85fa409e9bb7f50d2c419bc2@o385026.ingest.sentry.io/5224869";
  private readonly _log = debug("buidler:core:error-reporter:sentry");

  constructor(
    projectId: string,
    clientId: string,
    userType: UserType,
    userAgent: string,
    buidlerVersion: string
  ) {
    // init bugsnag client
    Sentry.init({ dsn: this._SENTRY_DSN });

    // setup metadata to be included in all reports by default
    Sentry.configureScope((scope) => {
      scope.setUser({ id: clientId, type: userType });
      scope.setTag("projectId", projectId);
      scope.setTag("version", buidlerVersion);
      scope.setTag("os", os.type());
      scope.setTag("node", process.version);
      scope.setTag("userAgent", userAgent);
      scope.setExtra("platform", os.platform());
      scope.setExtra("os release", os.release());
    });

    this._log("Sentry client init");
  }

  public async sendMessage(message: string, context: any) {
    this._log("Sending message...", { message, context });

    Sentry.withScope(function (scope) {
      scope.setExtras(context);

      Sentry.captureMessage(message);
    });

    try {
      await Sentry.flush(SentryClient.SENTRY_FLUSH_TIMEOUT);
      this._log("Message sent");
    } catch (error) {
      // absorb the sentry error and log it
      this._log(`Could not send message. Reason: `, error.message || error);
    }
  }

  public async sendErrorReport(error: Error): Promise<void> {
    this._log("Sending error report...");
    const errorContextData = contextualizeError(error);

    const {
      errorType,
      pluginName,
      title,
      description,
      name,
      number,
      message,
      category,
      contextMessage,
    } = errorContextData;

    Sentry.withScope(function (scope) {
      scope.setTag("errorType", errorType);
      scope.setExtra("message", message);
      if (pluginName !== undefined) {
        scope.setTag("pluginName", pluginName);
      }
      if (name !== undefined) {
        scope.setTag("name", name);
      }
      if (number !== undefined) {
        scope.setTag("number", String(number));
      }
      if (title !== undefined) {
        scope.setExtra("title", title);
      }
      if (contextMessage !== undefined) {
        scope.setExtra("contextMessage", contextMessage);
      }
      if (category !== undefined) {
        scope.setTag("category.name", category.name);
        scope.setExtra("category.title", category.title);
      }
      if (description !== undefined) {
        scope.setExtra("description", description);
      }

      Sentry.captureException(error);
    });

    try {
      await Sentry.flush(SentryClient.SENTRY_FLUSH_TIMEOUT);
      this._log(`Successfully sent report: '${message}'`);
    } catch (error) {
      // absorb the sentry error and log it
      this._log(
        `Could not sent report for error '${message}', Reason: `,
        error.message || error
      );
    }
  }
}

export class ErrorReporter implements ErrorReporterClient {
  public static async getInstance(rootPath: string, enabled: boolean) {
    const [buidlerVersion, clientId] = await Promise.all([
      getBuidlerVersion(),
      getClientId(),
    ]);

    const projectId = getProjectId(rootPath);
    const userType = getUserType();

    const userAgent = getUserAgent();

    return new ErrorReporter({
      projectId,
      clientId,
      enabled,
      userType,
      userAgent,
      buidlerVersion,
    });
  }

  private readonly _enabled: boolean;

  private readonly _client: ErrorReporterClient;

  private constructor({
    projectId,
    clientId,
    enabled,
    userType,
    userAgent,
    buidlerVersion,
  }: {
    projectId: string;
    clientId: string;
    enabled: boolean;
    userType: UserType;
    userAgent: string;
    buidlerVersion: string;
  }) {
    this._enabled = enabled && !isLocalDev();

    const sentryClient = new SentryClient(
      projectId,
      clientId,
      userType,
      userAgent,
      buidlerVersion
    );

    this._client = sentryClient;
  }

  public async sendMessage(message: string, context: any) {
    if (!this._enabled) {
      // don't send anything if not enabled
      return;
    }
    await this._client.sendMessage(message, context);
  }

  public async sendErrorReport(error: Error) {
    if (!this._enabled) {
      // don't send anything if not enabled
      return;
    }
    await this._client.sendErrorReport(error);
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
