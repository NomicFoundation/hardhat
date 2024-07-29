import assert from "node:assert/strict";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

import { getConfigDir } from "@ignored/hardhat-vnext-core/global-dir";
import { remove, writeJsonFile } from "@ignored/hardhat-vnext-utils/fs";

import {
  getTelemetryConsent,
  isTelemetryAllowed,
} from "../../../../src/internal/cli/telemetry/telemetry-permissions.js";

async function setTelemetryConsentFile(consent: boolean) {
  const configDir = await getConfigDir();
  const filePath = path.join(configDir, "telemetry-consent.json");
  await writeJsonFile(filePath, { consent });
}

async function deleteTelemetryConsentFile() {
  const configDir = await getConfigDir();
  const filePath = path.join(configDir, "telemetry-consent.json");
  await remove(filePath);
}

describe("telemetry-permissions", () => {
  beforeEach(async () => {
    delete process.env.HARDHAT_ENABLE_TELEMETRY_IN_TEST;

    await deleteTelemetryConsentFile();
  });

  afterEach(async () => {
    delete process.env.HARDHAT_ENABLE_TELEMETRY_IN_TEST;

    await deleteTelemetryConsentFile();
  });

  describe("isTelemetryAllowed", () => {
    it("should return false because not an interactive environment", async () => {
      await setTelemetryConsentFile(true); // Needed to be sure that the file is not read and the process exits before

      const res = await isTelemetryAllowed();
      assert.equal(res, false);
    });

    it("should return false because the user did not give telemetry consent", async () => {
      process.env.HARDHAT_ENABLE_TELEMETRY_IN_TEST = "true";
      await setTelemetryConsentFile(false);

      const res = await isTelemetryAllowed();
      assert.equal(res, false);
    });

    it("should return false because the telemetry consent is not set", async () => {
      process.env.HARDHAT_ENABLE_TELEMETRY_IN_TEST = "true";

      const res = await isTelemetryAllowed();
      assert.equal(res, false);
    });

    it("should return true because the user gave telemetry consent", async () => {
      process.env.HARDHAT_ENABLE_TELEMETRY_IN_TEST = "true";
      await setTelemetryConsentFile(true);

      const res = await isTelemetryAllowed();
      assert.equal(res, true);
    });
  });

  it("should return undefined because the telemetry consent is not set", async () => {
    // All other possible results are tested in the previous tests, they are included in the the function 'isTelemetryAllowed'
    process.env.HARDHAT_ENABLE_TELEMETRY_IN_TEST = "true";

    const res = await getTelemetryConsent();

    assert.equal(res, undefined);
  });
});
