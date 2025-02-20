import type { ErrorDescriptor } from "@nomicfoundation/hardhat-errors";

import assert from "node:assert/strict";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  HardhatError,
  HardhatPluginError,
} from "@nomicfoundation/hardhat-errors";
import { readJsonFile, remove } from "@nomicfoundation/hardhat-utils/fs";

import { ProviderError } from "../../../../../src/internal/builtin-plugins/network-manager/provider-errors.js";
import {
  _testResetReporter,
  sendErrorTelemetry,
} from "../../../../../src/internal/cli/telemetry/sentry/reporter.js";
import { getHardhatVersion } from "../../../../../src/internal/utils/package.js";
import {
  ERROR,
  HARDHAT_ERROR,
} from "../../../../fixture-projects/cli/telemetry/sentry/node_modules/@nomicfoundation/errors.js";
import {
  checkIfSubprocessWasExecuted,
  ROOT_PATH_TO_FIXTURE,
} from "../helpers.js";

interface SentryEvent {
  // eslint-disable-next-line @typescript-eslint/naming-convention -- this property comes from Sentry
  event_id: string;
  platform: string;
  timestamp: number;
  extra: {
    nodeVersion: string;
    hardhatVersion: string;
  };
  exception: {
    values: [
      {
        stacktrace: {
          frames: Array<{
            // eslint-disable-next-line @typescript-eslint/naming-convention -- this property comes from Sentry
            pre_context: string[];
            // eslint-disable-next-line @typescript-eslint/naming-convention -- this property comes from Sentry
            context_line: string;
            // eslint-disable-next-line @typescript-eslint/naming-convention -- this property comes from Sentry
            post_context: string[];
          }>;
        };
        type: string;
        value: string;
      },
    ];
  };
}

const MOCK_ERROR_DESCRIPTOR: ErrorDescriptor = {
  number: 111111111111,
  messageTemplate: "test-error",
  websiteTitle: "test-error",
  websiteDescription: "test-error",
};

const TEST_HARDHAT_ERROR = new HardhatError({
  ...MOCK_ERROR_DESCRIPTOR,
  shouldBeReported: true,
});

const PATH_TO_FIXTURE = path.join(ROOT_PATH_TO_FIXTURE, "sentry");

const RESULT_FILE_PATH = path.join(PATH_TO_FIXTURE, "reporter-result.txt");

describe("Reporter", () => {
  beforeEach(async () => {
    _testResetReporter();

    delete process.env.HARDHAT_TEST_SUBPROCESS_RESULT_PATH;
    await remove(RESULT_FILE_PATH);

    process.env.HARDHAT_TEST_INTERACTIVE_ENV = "true";
    process.env.HARDHAT_TEST_TELEMETRY_CONSENT_VALUE = "true";
  });

  afterEach(async () => {
    _testResetReporter();

    delete process.env.HARDHAT_TEST_SUBPROCESS_RESULT_PATH;
    await remove(RESULT_FILE_PATH);

    delete process.env.HARDHAT_TEST_INTERACTIVE_ENV;
    delete process.env.HARDHAT_TEST_TELEMETRY_CONSENT_VALUE;
  });

  describe("reportError", () => {
    it("should not report the error because the environment is not interactive", async () => {
      delete process.env.HARDHAT_TEST_INTERACTIVE_ENV;

      const wasSent = await sendErrorTelemetry(TEST_HARDHAT_ERROR);

      assert.equal(wasSent, false);
    });

    it("should not report the error because telemetry consent is not given", async () => {
      process.env.HARDHAT_TEST_TELEMETRY_CONSENT_VALUE = "false";

      const wasSent = await sendErrorTelemetry(TEST_HARDHAT_ERROR);

      assert.equal(wasSent, false);
    });

    it("should not report the error because the error is a HardhatError but it should not be reported (shouldBeReported !== true)", async () => {
      const wasSent = await sendErrorTelemetry(
        new HardhatError({
          ...MOCK_ERROR_DESCRIPTOR,
        }),
      );

      assert.equal(wasSent, false);
    });

    it("should not report the error because the error is a HardhatPluginError", async () => {
      const wasSent = await sendErrorTelemetry(
        new HardhatPluginError("test-id", "test-error"),
      );

      assert.equal(wasSent, false);
    });

    it("should not report the error because the error is a ProviderError", async () => {
      const wasSent = await sendErrorTelemetry(
        new ProviderError("test-provider-error", 404),
      );

      assert.equal(wasSent, false);
    });

    it("should send the correct error to Sentry (HardhatError)", async () => {
      process.env.HARDHAT_TEST_SUBPROCESS_RESULT_PATH = RESULT_FILE_PATH;

      const wasSent = await sendErrorTelemetry(HARDHAT_ERROR);

      await checkIfSubprocessWasExecuted(RESULT_FILE_PATH);

      const resFile: SentryEvent = await readJsonFile(RESULT_FILE_PATH);

      assert.equal(wasSent, true);

      assert.equal(resFile.event_id.length > 0, true);
      assert.equal(resFile.platform, "node");
      assert.equal(resFile.timestamp > 0, true);

      assert.equal(resFile.extra.nodeVersion, process.version);
      assert.equal(resFile.extra.hardhatVersion, await getHardhatVersion());

      assert.equal(resFile.exception.values[0].type, "HardhatError");
      assert.equal(
        resFile.exception.values[0].value,
        "HHE111111111111: test-error",
      );

      assert.equal(
        resFile.exception.values[0].stacktrace.frames[3].pre_context.length > 0,
        true,
      );
      assert.equal(
        resFile.exception.values[0].stacktrace.frames[3].context_line.replace(
          "\r",
          "",
        ), // Handle Windows line endings
        `export const HARDHAT_ERROR: HardhatError = new HardhatError({`,
      );
      assert.equal(
        resFile.exception.values[0].stacktrace.frames[3].post_context.length >
          0,
        true,
      );
    });

    it("should send the correct error to Sentry (general error)", async () => {
      process.env.HARDHAT_TEST_SUBPROCESS_RESULT_PATH = RESULT_FILE_PATH;

      const wasSent = await sendErrorTelemetry(ERROR);

      await checkIfSubprocessWasExecuted(RESULT_FILE_PATH);

      const resFile: SentryEvent = await readJsonFile(RESULT_FILE_PATH);

      assert.equal(wasSent, true);

      assert.equal(resFile.event_id.length > 0, true);
      assert.equal(resFile.platform, "node");
      assert.equal(resFile.timestamp > 0, true);

      assert.deepEqual(resFile.extra.nodeVersion, process.version);
      assert.deepEqual(resFile.extra.hardhatVersion, await getHardhatVersion());

      assert.deepEqual(resFile.exception.values[0].type, "Error");
      assert.deepEqual(resFile.exception.values[0].value, "test-error");

      assert.equal(
        resFile.exception.values[0].stacktrace.frames[3].pre_context.length > 0,
        true,
      );
      assert.equal(
        resFile.exception.values[0].stacktrace.frames[3].context_line.replace(
          "\r",
          "",
        ), // Handle Windows line endings
        `export const ERROR: Error = new Error(\"test-error\");`,
      );
      assert.equal(
        resFile.exception.values[0].stacktrace.frames[3].post_context.length >
          0,
        true,
      );
    });
  });
});
