import type {
  EventNames,
  Payload,
  TaskParams,
  TelemetryConsentPayload,
} from "./types.js";

import os from "node:os";

import { spawnDetachedSubProcess } from "@ignored/hardhat-vnext-utils/subprocess";

import { getHardhatVersion } from "../../../utils/package.js";
import { getTelemetryConsent } from "../telemetry-consent.js";

import { getClientId, getUserType } from "./utils.js";

// TODO:log const log = debug("hardhat:core:global-dir");

const SESSION_ID = Math.random().toString();
const ENGAGEMENT_TIME_MSEC = "10000";

export async function sendTelemetryConsentAnalytics(
  userConsent: boolean,
): Promise<void> {
  // This is a special scenario where only the consent is sent, all the other analytics info
  // (like node version, hardhat version, etc.) are stripped.
  const payload: TelemetryConsentPayload = {
    client_id: "hardhat_telemetry_consent",
    user_id: "hardhat_telemetry_consent",
    user_properties: {},
    events: [
      {
        name: "TelemetryConsentResponse",
        params: {
          userConsent: userConsent ? "yes" : "no",
        },
      },
    ],
  };

  await createSubprocessToSendAnalytics(payload);
}

export async function sendTaskAnalytics(
  taskName: string,
  scopeName: string | undefined,
): Promise<boolean> {
  const eventParams: TaskParams = {
    task: taskName,
    scope: scopeName,
  };

  return sendAnalytics("task", eventParams);
}

// Return a boolean for test purposes, so we can check if the analytics was sent based on the consent value
async function sendAnalytics(
  eventName: EventNames,
  eventParams: TaskParams,
): Promise<boolean> {
  if (!(await getTelemetryConsent())) {
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
  const clientId = await getClientId();

  return {
    client_id: clientId,
    user_id: clientId,
    user_properties: {
      projectId: { value: "hardhat-project" },
      userType: { value: getUserType() },
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
