import type { AnalyticsFile } from "../../../../../src/internal/cli/telemetry/analytics/types.js";

import assert from "node:assert/strict";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

import { getTelemetryDir } from "@ignored/hardhat-vnext-core/global-dir";
import {
  readJsonFile,
  remove,
  writeJsonFile,
} from "@ignored/hardhat-vnext-utils/fs";

import { getClientId } from "../../../../../src/internal/cli/telemetry/analytics/utils.js";

const CLIENT_ID = "test-client-id";

async function createClientIdFile() {
  const filePath = await getFilePath();
  await writeJsonFile(filePath, {
    analytics: {
      clientId: CLIENT_ID,
    },
  });
}

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
      const analyticsClientId = await getClientId();

      // The analyticsClientId should be generate as uuid
      assert.notEqual(analyticsClientId, undefined);
      assert.notEqual(analyticsClientId, CLIENT_ID);
      // The analyticsClientId should also be saved in the file
      assert.equal(analyticsClientId, await getClientIdFromFile());
    });

    it("should get the analyticsClientId from the file because it already exists", async () => {
      await createClientIdFile();
      const analyticsClientId = await getClientIdFromFile();

      assert.equal(analyticsClientId, CLIENT_ID);
    });
  });
});
