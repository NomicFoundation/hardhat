import type { Payload } from "../../../../../src/internal/cli/telemetry/analytics/types.js";

import assert from "node:assert/strict";
import path from "node:path";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";

import { getConfigDir } from "@ignored/hardhat-vnext-core/global-dir";
import {
  copy,
  exists,
  readJsonFile,
  remove,
  writeJsonFile,
} from "@ignored/hardhat-vnext-utils/fs";

import {
  sendTaskAnalytics,
  sendTelemetryConsentAnalytics,
} from "../../../../../src/internal/cli/telemetry/analytics/analytics.js";
import { getHardhatVersion } from "../../../../../src/internal/utils/package.js";

// The analytics logic uses a detached subprocess to send the payload via HTTP call.
// We cannot test the HTTP call directly, but we can use a test subprocess to verify if the payload is correctly created.
// This is possible because the analytics code attempts to execute a subprocess file of type 'JS'. JS files are only available after compilation.
// During the tests, no JS file is available, so the expected subprocess does not exist. Therefore, we can copy a test subprocess file
// to the expected location instead of the original one and check if it receives the correct payload.

const PATH_TO_FIXTURE = path.join(
  process.cwd(),
  "test",
  "fixture-projects",
  "cli",
  "telemetry",
  "analytics",
);

const SOURCE_PATH_TEST_SUBPROCESS_FILE = path.join(
  PATH_TO_FIXTURE,
  "analytics-subprocess.js",
);

const DEST_PATH_TEST_SUBPROCESS_FILE = path.join(
  process.cwd(),
  "src",
  "internal",
  "cli",
  "telemetry",
  "analytics",
  "analytics-subprocess.js",
);

const RESULT_FILE_PATH = path.join(PATH_TO_FIXTURE, "result.json");

async function copyTestSubprocessFile() {
  await copy(SOURCE_PATH_TEST_SUBPROCESS_FILE, DEST_PATH_TEST_SUBPROCESS_FILE);
}

async function removeTestSubprocessFile() {
  remove(DEST_PATH_TEST_SUBPROCESS_FILE);
}

async function setTelemetryConsentFile(consent: boolean) {
  const configDir = await getConfigDir();
  const filePath = path.join(configDir, "telemetry-consent.json");
  await writeJsonFile(filePath, { consent });
}

async function checkIfSubprocessWasExecuted() {
  // Checks if the subprocess was executed by waiting for a file to be created.
  // Uses an interval to periodically check for the file. If the file isn't found
  // within a specified number of attempts, an error is thrown, indicating a failure in subprocess execution.
  const MAX_COUNTER = 20;

  return new Promise((resolve, reject) => {
    let counter = 0;

    const intervalId = setInterval(async () => {
      counter++;

      if (await exists(RESULT_FILE_PATH)) {
        clearInterval(intervalId);
        resolve(true);
      } else if (counter > MAX_COUNTER) {
        clearInterval(intervalId);
        reject("Subprocess was not executed in the expected time");
      }
    }, 100);
  });
}

describe("analytics", () => {
  before(async () => {
    copyTestSubprocessFile();
  });

  after(async () => {
    await removeTestSubprocessFile();
  });

  beforeEach(async () => {
    await remove(RESULT_FILE_PATH);
  });

  afterEach(async () => {
    await remove(RESULT_FILE_PATH);
  });

  describe("analytics payload", async () => {
    const ORIGINAL_PROCESS_ENV = { ...process };

    describe("not running in CI", () => {
      before(() => {
        // Force Ci to not be detected as Ci so the test can run (Ci is blocked for analytics)
        process.env.HARDHAT_ENABLE_TELEMETRY_IN_TEST = "true";
      });

      after(() => {
        delete process.env.HARDHAT_ENABLE_TELEMETRY_IN_TEST;
        process = ORIGINAL_PROCESS_ENV;
      });

      it("should create the correct payload for the telemetry consent (positive consent)", async () => {
        await sendTelemetryConsentAnalytics(true);

        await checkIfSubprocessWasExecuted();

        const result = await readJsonFile(RESULT_FILE_PATH);

        assert.deepEqual(result, {
          client_id: "hardhat_telemetry_consent",
          user_id: "hardhat_telemetry_consent",
          user_properties: {},
          events: [
            {
              name: "TelemetryConsentResponse",
              params: {
                userConsent: "yes",
              },
            },
          ],
        });
      });

      it("should create the correct payload for the telemetry consent (negative consent)", async () => {
        await sendTelemetryConsentAnalytics(false);

        await checkIfSubprocessWasExecuted();

        const result = await readJsonFile(RESULT_FILE_PATH);

        assert.deepEqual(result, {
          client_id: "hardhat_telemetry_consent",
          user_id: "hardhat_telemetry_consent",
          user_properties: {},
          events: [
            {
              name: "TelemetryConsentResponse",
              params: {
                userConsent: "no",
              },
            },
          ],
        });
      });

      it("should create the correct payload for the task analytics", async () => {
        await setTelemetryConsentFile(true);

        const wasSent = await sendTaskAnalytics(["task", "subtask"]);

        await checkIfSubprocessWasExecuted();

        const result: Payload = await readJsonFile(RESULT_FILE_PATH);

        assert.equal(wasSent, true);

        // Check payload properties
        assert.notEqual(result.client_id, undefined);
        assert.notEqual(result.user_id, undefined);
        assert.equal(result.user_properties.projectId.value, "hardhat-project");
        assert.equal(
          result.user_properties.hardhatVersion.value,
          await getHardhatVersion(),
        );
        assert.notEqual(
          result.user_properties.operatingSystem.value,
          undefined,
        );
        assert.notEqual(result.user_properties.nodeVersion.value, undefined);
        assert.equal(result.events[0].name, "task");
        assert.equal(result.events[0].params.engagement_time_msec, "10000");
        assert.notEqual(result.events[0].params.session_id, undefined);
        assert.equal(result.events[0].params.task, "task, subtask");
      });

      it("should not send analytics because the consent is not given", async () => {
        await setTelemetryConsentFile(false);
        const wasSent = await sendTaskAnalytics(["task", "subtask"]);
        assert.equal(wasSent, false);
      });
    });

    describe("running in non interactive environment", () => {
      it("should not send consent because the environment is non interactive", async () => {
        const wasSent = await sendTelemetryConsentAnalytics(true);
        assert.equal(wasSent, false);
      });

      it("should not send analytics because the environment is not interactive", async () => {
        await setTelemetryConsentFile(true);
        const wasSent = await sendTaskAnalytics(["task", "subtask"]);
        assert.equal(wasSent, false);
      });
    });
  });
});
