import { ChildProcess } from "child_process";
import debug from "debug";
import fetch from "node-fetch";
import qs from "qs";

import {
  getBuidlerVersion,
  getClientId,
  getProjectId,
  getUserAgent,
  getUserType,
  isABuiltinTaskName,
  isLocalDev,
} from "../util/analytics";
import { runInBackground } from "../util/background-runner";

const log = debug("buidler:core:analytics");

// VERY IMPORTANT:
// The documentation doesn't say so, but the user-agent parameter is required (ua).
// If you don't send it, you won't get an error or anything, Google will *silently* drop your hit.
//
// https://stackoverflow.com/questions/27357954/google-analytics-measurement-protocol-not-working
interface RawAnalytics {
  v: "1";
  tid: string;
  cid: string;
  dp: string;
  dh: string;
  t: string;
  ua: string;
  cs: string;
  cm: string;
  cd1: string;
  cd2: string;
  cd3: string;
}

const googleAnalyticsUrl = "https://www.google-analytics.com/collect";

interface AnalyticsInterface {
  sendTaskHit(taskName: string): Promise<void>;
}

interface AnalyticsConfig {
  projectId: string;
  clientId: string;
  enabled: boolean;
  userType: string;
  buidlerVersion: string;
}

export class Analytics implements AnalyticsInterface {
  public static async getInstance(
    rootPath: string,
    enabled: boolean,
    inBackground: boolean
  ): Promise<AnalyticsInterface> {
    const [buidlerVersion, clientId] = await Promise.all([
      getBuidlerVersion(),
      getClientId(),
    ]);

    const projectId = getProjectId(rootPath);
    const userType = getUserType();
    if (enabled && isLocalDev()) {
      log("running as local dev - setting enabled to false");
      enabled = false;
    }

    const config: AnalyticsConfig = {
      projectId,
      clientId,
      enabled,
      userType,
      buidlerVersion,
    };
    const analytics = inBackground
      ? new ProxiedAnalytics(config)
      : new Analytics(config);

    return analytics;
  }

  private readonly _projectId: string;
  private readonly _clientId: string;
  private readonly _enabled: boolean;
  private readonly _userType: string;
  private readonly _buidlerVersion: string;

  // Buidler's tracking id. I guess there's no other choice than keeping it here.
  private readonly _trackingId: string = "UA-117668706-3";

  private constructor({
    projectId,
    clientId,
    enabled,
    userType,
    buidlerVersion,
  }: AnalyticsConfig) {
    this._projectId = projectId;
    this._clientId = clientId;
    this._enabled = enabled;
    this._userType = userType;
    this._buidlerVersion = buidlerVersion;
  }

  /**
   * Attempt to send a hit to Google Analytics using the Measurement Protocol.
   * This function returns immediately after starting the request, returning a function for aborting it.
   * The idea is that we don't want Buidler tasks to be slowed down by a slow network request, so
   * Buidler can abort the request if it takes too much time.
   *
   * Trying to abort a successfully completed request is a no-op, so it's always safe to call it.
   *
   * @param taskName The name of the task to be logged
   *
   * @returns The abort function
   */
  public sendTaskHit(taskName: string): Promise<void> {
    const taskKind = isABuiltinTaskName(taskName) ? "builtin" : "custom";

    if (!this._enabled) {
      return Promise.resolve();
    }

    return this._sendHit(this._taskHit(taskKind));
  }

  private _taskHit(taskName: string): RawAnalytics {
    return {
      // Measurement protocol version.
      v: "1",

      // Hit type, we're only using pageviews for now.
      t: "pageview",

      // Buidler's tracking Id.
      tid: this._trackingId,

      // Client Id.
      cid: this._clientId,

      // Document path, must start with a '/'.
      dp: `/task/${taskName}`,

      // Host name.
      dh: "cli.buidler.dev",

      // User agent, must be present.
      // We use it to inform Node version used and OS.
      // Example:
      //   Node/v8.12.0 (Darwin 17.7.0)
      ua: getUserAgent(),

      // We're using the following values (Campaign source, Campaign medium) to track
      // whether the user is a Developer or CI, as Custom Dimensions are not working for us atm.
      cs: this._userType,
      cm: "User Type",

      // We're using custom dimensions for tracking different user projects, and user types (Developer/CI).
      //
      // See the following link for docs on these paremeters:
      // https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters#pr_cd_
      //
      // See the following link for setting up our custom dimensions in the Google Analytics dashboard
      // https://support.google.com/tagmanager/answer/6164990
      //
      // Custom dimension 1: Project Id
      // This is computed as the keccak256 hash of the project's absolute path.
      cd1: this._projectId,
      // Custom dimension 2: User type
      //   Possible values: "CI", "Developer".
      cd2: this._userType,
      // Custom dimension 3: Buidler Version
      //   Example: "Buidler 1.0.0".
      cd3: this._buidlerVersion,
    };
  }

  private async _sendHit(hit: RawAnalytics) {
    log(`Sending hit for ${hit.dp}`);

    const hitPayload = qs.stringify(hit);

    log(`Hit payload: ${JSON.stringify(hit)}`);

    try {
      await fetch(googleAnalyticsUrl, {
        body: hitPayload,
        method: "POST",
      });
      log(`Hit for ${JSON.stringify(hit.dp)} sent successfully`);
    } catch (error) {
      // We're not really interested in handling failed analytics requests
      error.message = `Hit request failed. Reason: ${error.message}`;
      log(error.message);
    }
  }
}

class ProxiedAnalytics implements AnalyticsInterface {
  private _subject: ChildProcess;
  constructor(...props: any[]) {
    this._subject = runInBackground(__filename, Analytics.name, props);
  }

  public async sendTaskHit(taskName: string) {
    const message = {
      method: "sendTaskHit",
      args: [taskName],
    };
    return this._sendPromise(message);
  }

  private _sendPromise(message: any): Promise<void> {
    return new Promise((resolve, reject) => {
      this._subject.send(message, (error) =>
        error ? reject(error) : resolve()
      );
    });
  }
}
