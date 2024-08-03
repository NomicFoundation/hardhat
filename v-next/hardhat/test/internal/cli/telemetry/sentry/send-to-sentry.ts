import assert from "node:assert/strict";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

import { readUtf8File, remove } from "@ignored/hardhat-vnext-utils/fs";

import { main } from "../../../../../src/internal/cli/telemetry/sentry/send-to-sentry.js";
import {
  checkIfSubprocessWasExecuted,
  ROOT_PATH_TO_FIXTURE,
} from "../helpers.js";

const PATH_TO_FIXTURE = path.join(ROOT_PATH_TO_FIXTURE, "sentry");
const RESULT_FILE_PATH = path.join(PATH_TO_FIXTURE, "sub-process-result.txt");

describe("sentry-subprocess", function () {
  beforeEach(async () => {
    process.env.HARDHAT_TEST_SUBPROCESS_RESULT_PATH = RESULT_FILE_PATH;
    await remove(RESULT_FILE_PATH);
  });

  afterEach(async () => {
    delete process.env.HARDHAT_TEST_SUBPROCESS_RESULT_PATH;
    await remove(RESULT_FILE_PATH);
  });

  it("should send an event to Sentry", async () => {
    process.argv[2] = "{}"; // Send an empty object, the real payload will be tested in the tests for the "Reporter"

    await main();
    await checkIfSubprocessWasExecuted(RESULT_FILE_PATH);
    const fileRes = await readUtf8File(RESULT_FILE_PATH);

    assert.equal(fileRes, "{}");
  });

  it("should send a failure message to Sentry because no argument is passed in argv[2] (serializedEvent)", async () => {
    delete process.argv[2];

    await main();
    await checkIfSubprocessWasExecuted(RESULT_FILE_PATH);
    const fileRes = await readUtf8File(RESULT_FILE_PATH);

    assert.equal(
      fileRes,
      "There was an error parsing an event: 'process.argv[2]' argument is not set",
    );
  });

  it("should send a failure message to Sentry because the argument in argv[2] is not a valid JSON", async () => {
    process.argv[2] = "not a valid JSON";

    await main();
    await checkIfSubprocessWasExecuted(RESULT_FILE_PATH);
    const fileRes = await readUtf8File(RESULT_FILE_PATH);

    assert.equal(
      fileRes,
      "There was an error parsing an event: 'process.argv[2]' doesn't have a valid JSON",
    );
  });

  it("should send a failure message to Sentry because there is an anonymization error", async () => {
    process.argv[2] = "null";

    await main();
    await checkIfSubprocessWasExecuted(RESULT_FILE_PATH);
    const fileRes = await readUtf8File(RESULT_FILE_PATH);

    assert.equal(
      fileRes,
      "There was an error anonymizing an event: event is null or undefined",
    );
  });
});
