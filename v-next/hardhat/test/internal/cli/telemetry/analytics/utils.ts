import type { AnalyticsFile } from "../../../../../src/internal/cli/telemetry/analytics/types.js";

import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

import { getTelemetryDir } from "@ignored/hardhat-vnext-core/global-dir";
import { isCi } from "@ignored/hardhat-vnext-utils/ci";
import {
  readJsonFile,
  remove,
  writeJsonFile,
} from "@ignored/hardhat-vnext-utils/fs";

import {
  getClientId,
  getUserType,
} from "../../../../../src/internal/cli/telemetry/analytics/utils.js";

const ANALYTICS_FILE_NAME = "analytics.json";

type FileType = "current" | "firstLegacy" | "secondLegacy";

const CLIENT_ID_CURRENT = "from-current-file";
const CLIENT_ID_FIRST_LEGACY = "from-first-legacy-file";
const CLIENT_ID_SECOND_LEGACY = "from-second-legacy-file";

async function createClientIdFile(fileType: FileType) {
  const [filePath, clientId] = await getFileInfo(fileType);
  await writeJsonFile(filePath, {
    analytics: {
      clientId,
    },
  });
}

async function getClientIdFromFile(fileType: FileType) {
  const data: AnalyticsFile = await readJsonFile(
    (await getFileInfo(fileType))[0],
  );

  return data.analytics.clientId;
}

async function deleteClientIdFile(fileType: FileType) {
  const [filePath] = await getFileInfo(fileType);
  await remove(filePath);
}

async function getFileInfo(fileType: FileType) {
  let filePath: string;
  let clientId: string;

  if (fileType === "current") {
    filePath = path.join(await getTelemetryDir(), ANALYTICS_FILE_NAME);
    clientId = CLIENT_ID_CURRENT;
  } else if (fileType === "firstLegacy") {
    filePath = path.join(os.homedir(), ".buidler", "config.json");
    clientId = CLIENT_ID_FIRST_LEGACY;
  } else {
    filePath = path.join(await getTelemetryDir("buidler"), ANALYTICS_FILE_NAME);
    clientId = CLIENT_ID_SECOND_LEGACY;
  }

  return [filePath, clientId];
}

describe("telemetry/analytics/utils", () => {
  describe("clientId", () => {
    beforeEach(async () => {
      await deleteClientIdFile("current");
      await deleteClientIdFile("firstLegacy");
      await deleteClientIdFile("secondLegacy");
    });

    afterEach(async () => {
      await deleteClientIdFile("current");
      await deleteClientIdFile("firstLegacy");
      await deleteClientIdFile("secondLegacy");
    });

    it("should set a new clientId because the value is not yet defined", async () => {
      const clientId = await getClientId();

      // The clientId should be generate as uuid
      assert.notEqual(clientId, undefined);
      assert.notEqual(clientId, CLIENT_ID_CURRENT);
      assert.notEqual(clientId, CLIENT_ID_FIRST_LEGACY);
      assert.notEqual(clientId, CLIENT_ID_SECOND_LEGACY);

      // The clientId should also be saved in the file
      assert.equal(clientId, await getClientIdFromFile("current"));
    });

    it("should get the 'current' clientId because it already exists", async () => {
      await createClientIdFile("current");
      const clientId = await getClientId();
      assert.equal(clientId, CLIENT_ID_CURRENT);
    });

    it("should get the 'firstLegacy' clientId because it already exists and store it the new analytics file (current)", async () => {
      await createClientIdFile("firstLegacy");

      const clientId = await getClientId();
      assert.equal(clientId, CLIENT_ID_FIRST_LEGACY);
      assert.equal(clientId, await getClientIdFromFile("current"));
    });

    it("should get the 'secondLegacy' clientId because it already exists and store it the new analytics file (current)", async () => {
      await createClientIdFile("secondLegacy");

      const clientId = await getClientId();
      assert.equal(clientId, CLIENT_ID_SECOND_LEGACY);
      assert.equal(clientId, await getClientIdFromFile("current"));
    });
  });

  it("should return the correct user type", () => {
    const userType = isCi() ? "CI" : "Developer";
    assert.equal(getUserType(), userType);
  });
});
