import debug from "debug";
import os from "os";

import { BuidlerError, BuidlerPluginError } from "../core/errors";
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

  private readonly _clients: ErrorReporterClient[];

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

    this._clients = [];
  }

  public async sendMessage(message: string, context: any) {
    if (!this._enabled) {
      // don't send anything if not enabled
      return;
    }
    await Promise.all(
      this._clients.map((client) => client.sendMessage(message, context))
    );
  }

  public async sendErrorReport(error: Error) {
    if (!this._enabled) {
      // don't send anything if not enabled
      return;
    }
    await Promise.all(
      this._clients.map((client) => client.sendErrorReport(error))
    );
  }
}
