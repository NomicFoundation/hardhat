import type AbortControllerT from "abort-controller";
import type { request as RequestT } from "undici";

import debug from "debug";
import os from "os";

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

/* eslint-disable @typescript-eslint/naming-convention */
interface AnalyticsPayload {
  client_id: string;
  user_id: string;
  user_properties: {
    projectId: {
      value?: string;
    };
    userType: {
      value?: string;
    };
    hardhatVersion: {
      value?: string;
    };
    operatingSystem: {
      value?: string;
    };
    nodeVersion: {
      value?: string;
    };
  };
  events: Array<{
    name: string;
    params: {
      engagement_time_msec: string;
      session_id: string;
    };
  }>;
}
/* eslint-enable @typescript-eslint/naming-convention */

type AbortAnalytics = () => void;

export class Analytics {
  public static async getInstance(telemetryConsent: boolean | undefined) {
    const analytics: Analytics = new Analytics(
      await getClientId(),
      telemetryConsent,
      getUserType()
    );

    return analytics;
  }

  private readonly _clientId: string;
  private readonly _enabled: boolean;
  private readonly _userType: string;
  private readonly _analyticsUrl: string =
    "https://www.google-analytics.com/mp/collect";
  private readonly _apiSecret: string = "fQ5joCsDRTOp55wX8a2cVw";
  private readonly _measurementId: string = "G-8LQ007N2QJ";
  private _sessionId: string;

  private constructor(
    clientId: string,
    telemetryConsent: boolean | undefined,
    userType: string
  ) {
    this._clientId = clientId;
    this._enabled =
      !isLocalDev() && !isRunningOnCiServer() && telemetryConsent === true;
    this._userType = userType;
    this._sessionId = Math.random().toString();
  }

  /**
   * Attempt to send a hit to Google Analytics using the Measurement Protocol.
   * This function returns immediately after starting the request, returning a function for aborting it.
   * The idea is that we don't want Hardhat tasks to be slowed down by a slow network request, so
   * Hardhat can abort the request if it takes too much time.
   *
   * Trying to abort a successfully completed request is a no-op, so it's always safe to call it.
   *
   * @returns The abort function
   */
  public async sendTaskHit(): Promise<[AbortAnalytics, Promise<void>]> {
    if (!this._enabled) {
      return [() => {}, Promise.resolve()];
    }

    return this._sendHit(await this._buildTaskHitPayload());
  }

  private async _buildTaskHitPayload(): Promise<AnalyticsPayload> {
    return {
      client_id: this._clientId,
      user_id: this._clientId,
      user_properties: {
        projectId: { value: "hardhat-project" },
        userType: { value: this._userType },
        hardhatVersion: { value: await getHardhatVersion() },
        operatingSystem: { value: os.platform() },
        nodeVersion: { value: process.version },
      },
      events: [
        {
          name: "task",
          params: {
            // From the GA docs: amount of time someone spends with your web
            // page in focus or app screen in the foreground
            // The parameter has no use for our app, but it's required in order
            // for user activity to display in standard reports like Realtime
            engagement_time_msec: "10000",
            session_id: this._sessionId,
          },
        },
      ],
    };
  }

  private _sendHit(payload: AnalyticsPayload): [AbortAnalytics, Promise<void>] {
    const { request } = require("undici") as { request: typeof RequestT };
    const AbortController =
      require("abort-controller") as typeof AbortControllerT;

    const eventName = payload.events[0].name;
    log(`Sending hit for ${eventName}`);

    const controller = new AbortController();

    const abortAnalytics = () => {
      log(`Aborting hit for ${eventName}`);

      controller.abort();
    };

    log(`Hit payload: ${JSON.stringify(payload)}`);

    const hitPromise = request(this._analyticsUrl, {
      query: {
        api_secret: this._apiSecret,
        measurement_id: this._measurementId,
      },
      body: JSON.stringify(payload),
      method: "POST",
      signal: controller.signal,
    })
      .then(() => {
        log(`Hit for ${eventName} sent successfully`);
      })
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
      const { v4: uuid } = await import("uuid");
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

async function getHardhatVersion(): Promise<string> {
  const { version } = await getPackageJson();

  return `Hardhat ${version}`;
}
