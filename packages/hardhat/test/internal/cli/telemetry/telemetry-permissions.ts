import assert from "node:assert/strict";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

import { createTmpDir } from "@nomicfoundation/hardhat-test-utils";
import { writeJsonFile } from "@nomicfoundation/hardhat-utils/fs";

import { isTelemetryAllowed } from "../../../../src/internal/cli/telemetry/telemetry-permissions.js";

async function setTelemetryConfigFile(filePath: string, enabled: boolean) {
  await writeJsonFile(filePath, { enabled });
}

describe("telemetry-permissions", () => {
  const tmp = createTmpDir("telemetry-permissions", "test");
  const configFilePath = () => path.join(tmp.path, "telemetry-config.json");

  beforeEach(async () => {
    delete process.env.HARDHAT_TEST_INTERACTIVE_ENV;
  });

  afterEach(async () => {
    delete process.env.HARDHAT_TEST_INTERACTIVE_ENV;
  });

  describe("isTelemetryAllowed", () => {
    it("should return false because not an interactive environment", async () => {
      await setTelemetryConfigFile(configFilePath(), true);

      const res = await isTelemetryAllowed(configFilePath());
      assert.equal(res, false);
    });

    it("should return false because the user explicitly opted out of telemetry", async () => {
      process.env.HARDHAT_TEST_INTERACTIVE_ENV = "true";
      await setTelemetryConfigFile(configFilePath(), false);

      const res = await isTelemetryAllowed(configFilePath());
      assert.equal(res, false);
    });

    it("should return true because the user did not explicitly opt out of telemetry", async () => {
      process.env.HARDHAT_TEST_INTERACTIVE_ENV = "true";

      const res = await isTelemetryAllowed(configFilePath());
      assert.equal(res, true);
    });

    it("should return true because the user explicitly opted in to telemetry", async () => {
      process.env.HARDHAT_TEST_INTERACTIVE_ENV = "true";
      await setTelemetryConfigFile(configFilePath(), true);

      const res = await isTelemetryAllowed(configFilePath());
      assert.equal(res, true);
    });
  });
});
