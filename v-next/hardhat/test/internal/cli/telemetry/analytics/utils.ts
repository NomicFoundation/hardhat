import type { AnalyticsFile } from "../../../../../src/internal/cli/telemetry/analytics/types.js";

import assert from "node:assert/strict";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

import { getTelemetryDir } from "@ignored/hardhat-vnext-core/global-dir";
import { readJsonFile, remove } from "@ignored/hardhat-vnext-utils/fs";

import { getAnalyticsClientId } from "../../../../../src/internal/cli/telemetry/analytics/utils.js";

async function getClientIdFromFile() {
  const filePath = await getFilePath();
  const data: AnalyticsFile = await readJsonFile(filePath);
  return data.analytics.clientId;
}

async function deleteClientIdFile() {
  const filePath = await getFilePath();
  await remove(filePath);
}

async function getFilePath() {
  return path.join(await getTelemetryDir(), "analytics.json");
}

describe("telemetry/analytics/utils", () => {
  describe("analyticsClientId", () => {
    beforeEach(async () => {
      await deleteClientIdFile();
    });

    afterEach(async () => {
      await deleteClientIdFile();
    });

    it("should generate a new analytics clientId because the clientId is not yet defined", async () => {
      const analyticsClientId = await getAnalyticsClientId();

      // The analyticsClientId should be generate as uuid
      assert.notEqual(analyticsClientId, undefined);
      // The analyticsClientId should also be saved in the file
      assert.equal(analyticsClientId, await getClientIdFromFile());

      const sameAnalyticsClientId = await getAnalyticsClientId();

      // The clientId should be the same if read again because it should have been stored
      assert.equal(sameAnalyticsClientId, analyticsClientId);
    });
  });
});
