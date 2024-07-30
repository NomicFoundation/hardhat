import type {
  EventNames,
  Payload,
  TaskParams,
  TelemetryConsentPayload,
} from "./types.js";

import os from "node:os";

import { spawnDetachedSubProcess } from "@ignored/hardhat-vnext-utils/subprocess";

import { getHardhatVersion } from "../../../utils/package.js";
import {
  isTelemetryAllowedInEnvironment,
  isTelemetryAllowed,
} from "../telemetry-permissions.js";

import { getAnalyticsClientId } from "./utils.js";

// TODO:log const log = debug("hardhat:core:global-dir");

const SESSION_ID = Math.random().toString();
const ENGAGEMENT_TIME_MSEC = "10000";

// Return a boolean for testing purposes to verify that analytics are not sent in CI environments
export async function sendTelemetryConsentAnalytics(
  consent: boolean,
): Promise<boolean> {
  // This is a special scenario where only the consent is sent, all the other analytics info
  // (like node version, hardhat version, etc.) are stripped.

  if (!isTelemetryAllowedInEnvironment()) {
    return false;
  }

  const payload: TelemetryConsentPayload = {
    client_id: "hardhat_telemetry_consent",
    user_id: "hardhat_telemetry_consent",
    user_properties: {},
    events: [
      {
        name: "TelemetryConsentResponse",
        params: {
          userConsent: consent ? "yes" : "no",
        },
      },
    ],
  };

  await createSubprocessToSendAnalytics(payload);

  return true;
}

export async function sendTaskAnalytics(taskId: string[]): Promise<boolean> {
  const eventParams: TaskParams = {
    task: taskId.join(", "),
  };

  return sendAnalytics("task", eventParams);
}

// Return a boolean for testing purposes to confirm whether analytics were sent based on the consent value and not in CI environments
async function sendAnalytics(
  eventName: EventNames,
  eventParams: TaskParams,
): Promise<boolean> {
  if (!(await isTelemetryAllowed())) {
    return false;
  }

  const payload = await buildPayload(eventName, eventParams);

  await createSubprocessToSendAnalytics(payload);

  return true;
}

async function createSubprocessToSendAnalytics(
  payload: TelemetryConsentPayload | Payload,
): Promise<void> {
  // The file extension is 'js' because the 'ts' file will be compiled
  const analyticsSubprocessFilePath = `${import.meta.dirname}/analytics-subprocess.js`;

  await spawnDetachedSubProcess(analyticsSubprocessFilePath, [
    JSON.stringify(payload),
  ]);
}

async function buildPayload(
  eventName: EventNames,
  eventParams: TaskParams,
): Promise<Payload> {
  const clientId = await getAnalyticsClientId();

  return {
    client_id: clientId,
    user_id: clientId,
    user_properties: {
      projectId: { value: "hardhat-project" },
      hardhatVersion: { value: await getHardhatVersion() },
      operatingSystem: { value: os.platform() },
      nodeVersion: { value: process.version },
    },
    events: [
      {
        name: eventName,
        params: {
          engagement_time_msec: ENGAGEMENT_TIME_MSEC,
          session_id: SESSION_ID,
          ...eventParams,
        },
      },
    ],
  };
}
