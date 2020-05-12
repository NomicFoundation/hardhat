import * as Sentry from "@sentry/node";
import debug from "debug";
import os from "os";

import { UserType } from "../util/analytics";

import { ErrorContextData } from "./error-reporter";

/**
 * The client that actually sends the error report
 */
export interface ErrorReporterClient {
  sendMessage(message: string, context: any): Promise<void>;
  sendErrorReport(error: Error, context: ErrorContextData): Promise<void>;
}

export class SentryClient implements ErrorReporterClient {
  public static SENTRY_FLUSH_TIMEOUT = 3000;
  private readonly _SENTRY_DSN =
    process.env.SENTRY_DSN !== undefined
      ? process.env.SENTRY_DSN
      : "https://38ba58bb85fa409e9bb7f50d2c419bc2@o385026.ingest.sentry.io/5224869";
  private readonly _log = debug("buidler:core:error-reporter:sentry");

  constructor(
    projectId: string,
    clientId: string,
    userType: UserType,
    userAgent: string,
    buidlerVersion: string
  ) {
    // init Sentry client
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
    // is enabled if Sentry DSN is not set as empty string
    const enabled = this._SENTRY_DSN.length > 0;
    this._log(`Sentry client init (enabled: ${enabled})`);
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

  public async sendErrorReport(
    error: Error,
    errorContextData: ErrorContextData
  ): Promise<void> {
    this._log("Sending error report...");

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
