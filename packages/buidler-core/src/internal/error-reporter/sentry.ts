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

  private readonly _projectRootPath: string;

  private readonly _log = debug("buidler:core:error-reporter:sentry");

  constructor(
    projectId: string,
    clientId: string,
    userType: UserType,
    userAgent: string,
    buidlerVersion: string,
    projectRootPath: string
  ) {
    this._projectRootPath = projectRootPath;
    const scrubRootPathBeforeSend = this._scrubRootPathBeforeSend.bind(this);
    const log = this._log;

    // init Sentry client
    Sentry.init({
      dsn: this._SENTRY_DSN,
      beforeBreadcrumb(breadcrumb, hint) {
        if (breadcrumb.category === "console") {
          // ignore user console logs breadcrumb from reports
          return null;
        }
        return breadcrumb;
      },
      beforeSend(event, hint) {
        try {
          scrubRootPathBeforeSend(event, hint);
        } catch (error) {
          log("scrub root path from event failed, sending as is", error);
        }
        return event;
      },
    });

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

    // client is enabled if 'dsn' was not set as "" (empty string)
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

  private _scrubRootPathBeforeSend(
    event: Sentry.Event,
    hint?: Sentry.EventHint
  ) {
    // scrub path from event.stacktrace frames
    if (
      event.stacktrace !== undefined &&
      event.stacktrace.frames !== undefined
    ) {
      this._scrubRootPathFromFrames(event.stacktrace.frames);
    }

    // scrub path from event.exception(s) frames
    if (event.exception !== undefined && event.exception.values !== undefined) {
      // gather all exceptions frames
      const frames = [];
      for (const exception of event.exception.values) {
        if (
          exception.stacktrace !== undefined &&
          exception.stacktrace.frames !== undefined
        ) {
          for (const frame of exception.stacktrace.frames) {
            frames.push(frame);
          }
        }
      }
      this._scrubRootPathFromFrames(frames);
    }

    // scrub root path from hint originalException, & syntheticException, if any
    if (hint === undefined) {
      return;
    }
    const { originalException, syntheticException } = hint;

    // scrupb root path from originalException object
    if (originalException !== undefined && originalException !== null) {
      if (typeof originalException === "string") {
        hint.originalException = this._scrubRootPath(originalException);
      } else if (originalException.stack !== undefined) {
        originalException.stack = this._scrubRootPath(
          originalException.stack as string
        );
        this._log(
          `scrubbed ${this._projectRootPath} originalException.stack`,
          originalException.stack
        );
      }
    }

    // scrub root path from syntheticException Error object
    if (
      syntheticException !== undefined &&
      syntheticException !== null &&
      syntheticException.stack !== undefined
    ) {
      syntheticException.stack = this._scrubRootPath(syntheticException.stack);
      this._log(
        `scrubbed ${this._projectRootPath} syntheticException.stack`,
        syntheticException.stack
      );
    }
  }

  /**
   * Remove all ocurrences of this._projectRootPath from a path, that would be included in
   * any error report, before sending it to Sentry.
   *
   * @param path
   * @private
   */
  private _scrubRootPath(path: string) {
    // build a regex to match all occurrences of the specified string
    // needs to be escaped first, to work with 'g' RegExp modifier
    // https://stackoverflow.com/a/1144788/6279385
    const escapeRegExp = (regexStr: string) => {
      return regexStr.replace(/[.*+\-?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
    };
    const escapedGlobalMatcherRegex = (textToMatch: string) =>
      new RegExp(escapeRegExp(textToMatch), "g");

    return path.replace(
      escapedGlobalMatcherRegex(this._projectRootPath),
      "..."
    );
  }

  private _scrubRootPathFromFrames(frames: Sentry.StackFrame[]) {
    frames.forEach((frame: Sentry.StackFrame) => {
      if (frame.abs_path !== undefined) {
        frame.abs_path = this._scrubRootPath(frame.abs_path);
      }
      if (frame.module !== undefined) {
        frame.module = this._scrubRootPath(frame.module);
      }
      if (frame.filename !== undefined) {
        frame.filename = this._scrubRootPath(frame.filename);
      }
    });
  }
}
