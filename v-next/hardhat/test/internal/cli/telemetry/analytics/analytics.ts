import type { Payload } from "../../../../../src/internal/cli/telemetry/analytics/types.js";

import assert from "node:assert/strict";
import path from "node:path";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";

import { readJsonFile, remove } from "@nomicfoundation/hardhat-utils/fs";

import {
  sendTaskAnalytics,
  sendTelemetryConfigAnalytics,
} from "../../../../../src/internal/cli/telemetry/analytics/analytics.js";
import { getHardhatVersion } from "../../../../../src/internal/utils/package.js";
import {
  checkIfSubprocessWasExecuted,
  ROOT_PATH_TO_FIXTURE,
} from "../helpers.js";

//
// TEST EXPLANATION: When setting the environment variable HARDHAT_TEST_SUBPROCESS_RESULT_PATH,
// the subprocess writes the payload to the specified file instead of sending it to a remote server.
// This allows us to verify that the payload is formatted correctly.
//

const RESULT_FILE_PATH = path.join(
  ROOT_PATH_TO_FIXTURE,
  "analytics",
  "analytics-result.json",
);

describe("analytics", () => {
  beforeEach(async () => {
    delete process.env.HARDHAT_TEST_TELEMETRY_ENABLED;
  });

  afterEach(async () => {
    delete process.env.HARDHAT_TEST_TELEMETRY_ENABLED;
  });

  describe("running in non interactive environment", () => {
    it("should not send telemetry config because the environment is non interactive", async () => {
      const wasSent = await sendTelemetryConfigAnalytics(true);
      assert.equal(wasSent, false);
    });

    it("should not send analytics because the environment is not interactive", async () => {
      const wasSent = await sendTaskAnalytics(["task", "subtask"]);
      assert.equal(wasSent, false);
    });
  });

  describe("running in an interactive environment (simulated with ENV variables)", () => {
    before(() => {
      process.env.HARDHAT_TEST_INTERACTIVE_ENV = "true";
      process.env.HARDHAT_TEST_SUBPROCESS_RESULT_PATH = RESULT_FILE_PATH;
    });

    after(() => {
      delete process.env.HARDHAT_TEST_INTERACTIVE_ENV;
    });

    beforeEach(async () => {
      await remove(RESULT_FILE_PATH);
    });

    afterEach(async () => {
      await remove(RESULT_FILE_PATH);
    });

    it("should create the correct payload for the telemetry config (telemetry enabled)", async () => {
      await sendTelemetryConfigAnalytics(true);

      await checkIfSubprocessWasExecuted(RESULT_FILE_PATH);

      const result = await readJsonFile(RESULT_FILE_PATH);

      assert.deepEqual(result, {
        client_id: "hardhat_telemetry_config",
        user_id: "hardhat_telemetry_config",
        user_properties: {},
        events: [
          {
            name: "TelemetryConfig",
            params: {
              enabled: true,
            },
          },
        ],
      });
    });

    it("should create the correct payload for the telemetry config (telemetry disabled)", async () => {
      await sendTelemetryConfigAnalytics(false);

      await checkIfSubprocessWasExecuted(RESULT_FILE_PATH);

      const result = await readJsonFile(RESULT_FILE_PATH);

      assert.deepEqual(result, {
        client_id: "hardhat_telemetry_config",
        user_id: "hardhat_telemetry_config",
        user_properties: {},
        events: [
          {
            name: "TelemetryConfig",
            params: {
              enabled: false,
            },
          },
        ],
      });
    });

    it("should create the correct payload for the task analytics", async () => {
      const wasSent = await sendTaskAnalytics(["task", "subtask"]);

      await checkIfSubprocessWasExecuted(RESULT_FILE_PATH);

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
      assert.notEqual(result.user_properties.operatingSystem.value, undefined);
      assert.notEqual(result.user_properties.nodeVersion.value, undefined);
      assert.equal(result.events[0].name, "task");
      assert.equal(result.events[0].params.engagement_time_msec, "10000");
      assert.notEqual(result.events[0].params.session_id, undefined);
      assert.equal(result.events[0].params.task, "task, subtask");
    });

    it("should not send analytics because the user explicitly opted out of telemetry", async () => {
      process.env.HARDHAT_TEST_TELEMETRY_ENABLED = "false";

      const wasSent = await sendTaskAnalytics(["task", "subtask"]);
      assert.equal(wasSent, false);
    });
  });
});
