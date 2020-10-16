import AbortController from "abort-controller";
import debug from "debug";
import fetch from "node-fetch";
import os from "os";
import qs from "qs";
import uuid from "uuid/v4";

import * as builtinTaskNames from "../../builtin-tasks/task-names";
import { isLocalDev } from "../core/execution-mode";
import { isRunningOnCiServer } from "../util/ci-detection";
import {
  readAnalyticsId,
  readFirstLegacyAnalyticsId,
  readSecondLegacyAnalyticsId,
  writeAnalyticsId,
} from "../util/global-dir";
import { getPackageJson } from "../util/packageInfo";

const log = debug("hardhat:core:analytics");

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

type AbortAnalytics = () => void;

const googleAnalyticsUrl = "https://www.google-analytics.com/collect";

export class Analytics {
  public static async getInstance(telemetryConsent: boolean | undefined) {
    const analytics: Analytics = new Analytics({
      clientId: await getClientId(),
      telemetryConsent,
      userType: getUserType(),
    });

    return analytics;
  }

  private readonly _clientId: string;
  private readonly _enabled: boolean;
  private readonly _userType: string;
  // Hardhat's tracking id. I guess there's no other choice than keeping it here.
  private readonly _trackingId: string = "UA-117668706-3";

  private constructor({
    clientId,
    telemetryConsent,
    userType,
  }: {
    clientId: string;
    telemetryConsent: boolean | undefined;
    userType: string;
  }) {
    this._clientId = clientId;
    this._enabled =
      !isLocalDev() && !isRunningOnCiServer() && telemetryConsent === true;
    this._userType = userType;
  }

  /**
   * Attempt to send a hit to Google Analytics using the Measurement Protocol.
   * This function returns immediately after starting the request, returning a function for aborting it.
   * The idea is that we don't want Hardhat tasks to be slowed down by a slow network request, so
   * Hardhat can abort the request if it takes too much time.
   *
   * Trying to abort a successfully completed request is a no-op, so it's always safe to call it.
   *
   * @param taskName The name of the task to be logged
   *
   * @returns The abort function
   */
  public async sendTaskHit(
    taskName: string
  ): Promise<[AbortAnalytics, Promise<void>]> {
    if (this._isABuiltinTaskName(taskName)) {
      taskName = "builtin";
    } else {
      taskName = "custom";
    }

    if (!this._enabled) {
      return [() => {}, Promise.resolve()];
    }

    return this._sendHit(await this._taskHit(taskName));
  }

  private _isABuiltinTaskName(taskName: string) {
    return Object.values<string>(builtinTaskNames).includes(taskName);
  }

  private async _taskHit(taskName: string): Promise<RawAnalytics> {
    return {
      // Measurement protocol version.
      v: "1",

      // Hit type, we're only using pageviews for now.
      t: "pageview",

      // Hardhat's tracking Id.
      tid: this._trackingId,

      // Client Id.
      cid: this._clientId,

      // Document path, must start with a '/'.
      dp: `/task/${taskName}`,

      // Host name.
      dh: "cli.hardhat.org",

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
      cd1: "hardhat-project",
      // Custom dimension 2: User type
      //   Possible values: "CI", "Developer".
      cd2: this._userType,
      // Custom dimension 3: Hardhat Version
      //   Example: "Hardhat 1.0.0".
      cd3: await getHardhatVersion(),
    };
  }

  private _sendHit(hit: RawAnalytics): [AbortAnalytics, Promise<void>] {
    log(`Sending hit for ${hit.dp}`);

    const controller = new AbortController();

    const abortAnalytics = () => {
      log(`Aborting hit for ${JSON.stringify(hit.dp)}`);

      controller.abort();
    };

    const hitPayload = qs.stringify(hit);

    log(`Hit payload: ${JSON.stringify(hit)}`);

    const hitPromise = fetch(googleAnalyticsUrl, {
      body: hitPayload,
      method: "POST",
      signal: controller.signal,
    })
      .then(() => {
        log(`Hit for ${JSON.stringify(hit.dp)} sent successfully`);
      })
      // We're not really interested in handling failed analytics requests
      .catch(() => {
        log("Hit request failed");
      });

    return [abortAnalytics, hitPromise];
  }
}

async function getClientId() {
  let clientId = await readAnalyticsId();

  if (clientId === undefined) {
    clientId =
      (await readSecondLegacyAnalyticsId()) ??
      (await readFirstLegacyAnalyticsId());

    if (clientId === undefined) {
      log("Client Id not found, generating a new one");
      clientId = uuid();
    }

    await writeAnalyticsId(clientId);
  }

  return clientId;
}

function getUserType(): string {
  return isRunningOnCiServer() ? "CI" : "Developer";
}

/**
 * At the moment, we couldn't find a reliably way to report the OS () in Node,
 * as the versions reported by the various `os` APIs (`os.platform()`, `os.type()`, etc)
 * return values different to those expected by Google Analytics
 * We decided to take the compromise of just reporting the OS Platform (OSX/Linux/Windows) for now (version information is bogus for now).
 */
function getOperatingSystem(): string {
  switch (os.type()) {
    case "Windows_NT":
      return "(Windows NT 6.1; Win64; x64)";
    case "Darwin":
      return "(Macintosh; Intel Mac OS X 10_13_6)";
    case "Linux":
      return "(X11; Linux x86_64)";
    default:
      return "(Unknown)";
  }
}

function getUserAgent(): string {
  return `Node/${process.version} ${getOperatingSystem()}`;
}

async function getHardhatVersion(): Promise<string> {
  const { version } = await getPackageJson();

  return `Hardhat ${version}`;
}
