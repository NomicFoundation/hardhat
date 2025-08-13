import type {
  AnalyticsEvent,
  Payload,
  TelemetryConfigPayload,
} from "./types.js";

import os from "node:os";

import { spawnDetachedSubProcess } from "@nomicfoundation/hardhat-utils/subprocess";
import debug from "debug";

import { getHardhatVersion } from "../../../utils/package.js";
import {
  isTelemetryAllowedInEnvironment,
  isTelemetryAllowed,
} from "../telemetry-permissions.js";

import { getAnalyticsClientId } from "./utils.js";

const log = debug("hardhat:cli:telemetry:analytics");

const SESSION_ID = Math.random().toString();
const ENGAGEMENT_TIME_MSEC = "10000";

// Return a boolean for testing purposes to verify that analytics are not sent in CI environments
export async function sendTelemetryConfigAnalytics(
  enabled: boolean,
): Promise<boolean> {
  // This is a special scenario where only the telemetry config is sent,
  // all the other analytics info (like node version, hardhat version, etc.) are stripped.

  if (!isTelemetryAllowedInEnvironment()) {
    return false;
  }

  const payload: TelemetryConfigPayload = {
    client_id: "hardhat_telemetry_config",
    user_id: "hardhat_telemetry_config",
    user_properties: {},
    events: [
      {
        name: "TelemetryConfig",
        params: {
          enabled,
        },
      },
    ],
  };

  await createSubprocessToSendAnalytics(payload);

  return true;
}

export async function sendTaskAnalytics(taskId: string[]): Promise<boolean> {
  const taskAnalyticsEvent: AnalyticsEvent = {
    name: "task",
    params: {
      task: taskId.join(", "),
    },
  };

  return sendAnalytics(taskAnalyticsEvent);
}

export async function sendProjectTypeAnalytics(
  hardhatVersion: "hardhat-2" | "hardhat-3",
  template: string,
): Promise<boolean> {
  const initAnalyticsEvent: AnalyticsEvent = {
    name: "init",
    params: {
      hardhatVersion,
      template,
    },
  };

  return sendAnalytics(initAnalyticsEvent);
}

// Return a boolean for testing purposes to confirm whether analytics were sent based on the consent value and not in CI environments
async function sendAnalytics(analyticsEvent: AnalyticsEvent): Promise<boolean> {
  if (!(await isTelemetryAllowed())) {
    return false;
  }

  const payload = await buildPayload(analyticsEvent);

  await createSubprocessToSendAnalytics(payload);

  return true;
}

async function createSubprocessToSendAnalytics(
  payload: TelemetryConfigPayload | Payload,
): Promise<void> {
  log(
    `Sending analytics for '${payload.events[0].name}'. Payload: ${JSON.stringify(payload)}`,
  );

  // The HARDHAT_TEST_SUBPROCESS_RESULT_PATH env variable is used in the tests to instruct the subprocess to write the payload to a file
  // instead of sending it.
  // During testing, the subprocess file is a ts file, whereas in production, it is a js file (compiled code).
  // The following lines adjust the file extension based on whether the environment is for testing or production.
  const fileExt =
    process.env.HARDHAT_TEST_SUBPROCESS_RESULT_PATH !== undefined ? "ts" : "js";
  const subprocessFile = `${import.meta.dirname}/subprocess.${fileExt}`;

  const env: Record<string, string> = {};
  if (process.env.HARDHAT_TEST_SUBPROCESS_RESULT_PATH !== undefined) {
    // ATTENTION: only for testing
    env.HARDHAT_TEST_SUBPROCESS_RESULT_PATH =
      process.env.HARDHAT_TEST_SUBPROCESS_RESULT_PATH;
  }

  await spawnDetachedSubProcess(subprocessFile, [JSON.stringify(payload)], env);

  log("Payload sent to detached subprocess");
}

async function buildPayload(analyticsEvent: AnalyticsEvent): Promise<Payload> {
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
        name: analyticsEvent.name,
        params: {
          engagement_time_msec: ENGAGEMENT_TIME_MSEC,
          session_id: SESSION_ID,
          ...analyticsEvent.params,
        },
      },
    ],
  };
}
