import assert from "node:assert/strict";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

import { readJsonFile, remove } from "@nomicfoundation/hardhat-utils/fs";
import { spawnDetachedSubProcess } from "@nomicfoundation/hardhat-utils/subprocess";

import {
  checkIfSubprocessWasExecuted,
  ROOT_PATH_TO_FIXTURE,
} from "../helpers.js";

const RESULT_FILE_PATH = path.join(
  ROOT_PATH_TO_FIXTURE,
  "sentry",
  "sub-process-result.txt",
);
const SUBPROCESS_FILE_PATH = path.join(
  process.cwd(),
  "src",
  "internal",
  "cli",
  "telemetry",
  "sentry",
  "subprocess.ts",
);

describe("sentry-subprocess", function () {
  beforeEach(async () => {
    await remove(RESULT_FILE_PATH);
  });

  afterEach(async () => {
    await remove(RESULT_FILE_PATH);
  });

  it("should send an event to Sentry", async () => {
    await spawnDetachedSubProcess(SUBPROCESS_FILE_PATH, ["{}"], {
      HARDHAT_TEST_SUBPROCESS_RESULT_PATH: RESULT_FILE_PATH,
    });

    await checkIfSubprocessWasExecuted(RESULT_FILE_PATH);
    const fileRes = await readJsonFile(RESULT_FILE_PATH);

    assert.deepEqual(fileRes, {});
  });

  it("should send a failure message to Sentry because no argument is passed in argv[2] (serializedEvent)", async () => {
    await spawnDetachedSubProcess(SUBPROCESS_FILE_PATH, [], {
      HARDHAT_TEST_SUBPROCESS_RESULT_PATH: RESULT_FILE_PATH,
    });

    await checkIfSubprocessWasExecuted(RESULT_FILE_PATH);
    const fileRes = await readJsonFile(RESULT_FILE_PATH);

    assert.deepEqual(fileRes, {
      msg: "There was an error parsing an event: 'process.argv[2]' argument is not set",
    });
  });

  it("should send a failure message to Sentry because the argument in argv[2] is not a valid JSON", async () => {
    await spawnDetachedSubProcess(SUBPROCESS_FILE_PATH, ["not a valid JSON"], {
      HARDHAT_TEST_SUBPROCESS_RESULT_PATH: RESULT_FILE_PATH,
    });

    await checkIfSubprocessWasExecuted(RESULT_FILE_PATH);
    const fileRes = await readJsonFile(RESULT_FILE_PATH);

    assert.deepEqual(fileRes, {
      msg: "There was an error parsing an event: 'process.argv[2]' doesn't have a valid JSON",
    });
  });

  it("should send a failure message to Sentry because there is an anonymization error", async () => {
    await spawnDetachedSubProcess(SUBPROCESS_FILE_PATH, ["null"], {
      HARDHAT_TEST_SUBPROCESS_RESULT_PATH: RESULT_FILE_PATH,
    });

    await checkIfSubprocessWasExecuted(RESULT_FILE_PATH);
    const fileRes = await readJsonFile(RESULT_FILE_PATH);

    assert.deepEqual(fileRes, {
      msg: "There was an error anonymizing an event: event is null or undefined",
    });
  });
});
