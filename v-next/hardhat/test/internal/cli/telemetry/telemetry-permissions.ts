import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import { useTmpDir } from "@nomicfoundation/hardhat-test-utils";
import { writeJsonFile } from "@nomicfoundation/hardhat-utils/fs";

import { isTelemetryAllowed } from "../../../../src/internal/cli/telemetry/telemetry-permissions.js";

async function setTelemetryConsentFile(filePath: string, consent: boolean) {
  await writeJsonFile(filePath, { consent });
}

describe("telemetry-permissions", () => {
  // We use a tmp dir and store the telemetry consent file there, using a
  // relative path
  useTmpDir("telemetry-permissions");
  const CONSENT_FILE_PATH = "./telemetry-consent.json";

  beforeEach(async () => {
    delete process.env.HARDHAT_TEST_INTERACTIVE_ENV;
  });

  afterEach(async () => {
    delete process.env.HARDHAT_TEST_INTERACTIVE_ENV;
  });

  describe("isTelemetryAllowed", () => {
    it("should return false because not an interactive environment", async () => {
      await setTelemetryConsentFile(CONSENT_FILE_PATH, true);

      const res = await isTelemetryAllowed(CONSENT_FILE_PATH);
      assert.equal(res, false);
    });

    it("should return false because the user did not give telemetry consent", async () => {
      process.env.HARDHAT_TEST_INTERACTIVE_ENV = "true";
      await setTelemetryConsentFile(CONSENT_FILE_PATH, false);

      const res = await isTelemetryAllowed(CONSENT_FILE_PATH);
      assert.equal(res, false);
    });

    it("should return false because the telemetry consent is not set", async () => {
      process.env.HARDHAT_TEST_INTERACTIVE_ENV = "true";

      const res = await isTelemetryAllowed(CONSENT_FILE_PATH);
      assert.equal(res, false);
    });

    it("should return true because the user gave telemetry consent", async () => {
      process.env.HARDHAT_TEST_INTERACTIVE_ENV = "true";
      await setTelemetryConsentFile(CONSENT_FILE_PATH, true);

      const res = await isTelemetryAllowed(CONSENT_FILE_PATH);
      assert.equal(res, true);
    });
  });
});
