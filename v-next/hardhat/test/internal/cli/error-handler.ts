import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  HardhatError,
  HardhatPluginError,
} from "@nomicfoundation/hardhat-errors";
import chalk from "chalk";

import { printErrorMessages } from "../../../src/internal/cli/error-handler.js";
import {
  HARDHAT_NAME,
  HARDHAT_WEBSITE_URL,
} from "../../../src/internal/constants.js";

const mockCoreErrorDescriptor = {
  number: 123,
  messageTemplate: "error message",
  websiteTitle: "Mock error",
  websiteDescription: "This is a mock error",
} as const;

const mockPluginErrorDescriptor = {
  number: 50000,
  messageTemplate: "plugin error message",
  websiteTitle: "Mock error",
  websiteDescription: "This is a mock error in the range of a plugin",
} as const;

const mockDeprecatedCoreErrorDescriptor = {
  number: 124,
  messageTemplate: "deprecated error message",
  websiteTitle: "Deprecated mock error",
  websiteDescription: "This is a deprecated mock error",
  isDeprecated: true,
} as const;

const mockDeprecatedPluginErrorDescriptor = {
  number: 50001,
  messageTemplate: "deprecated plugin error message",
  websiteTitle: "Deprecated mock plugin error",
  websiteDescription: "This is a deprecated mock plugin error",
  isDeprecated: true,
} as const;

describe("error-handler", () => {
  describe("printErrorMessages", () => {
    describe("with a Hardhat error", () => {
      it("should print the error message", () => {
        const lines: Array<string | Error> = [];
        const error = new HardhatError(mockCoreErrorDescriptor);

        printErrorMessages(error, false, (msg: string | Error) => {
          lines.push(msg);
        });

        assert.equal(lines.length, 3);
        assert.equal(
          lines[0],
          `${chalk.red.bold(`Error ${error.errorCode}:`)} ${error.formattedMessage}`,
        );
        assert.equal(lines[1], "");
        assert.equal(
          lines[2],
          `For more info go to ${HARDHAT_WEBSITE_URL}${error.errorCode} or run ${HARDHAT_NAME} with --show-stack-traces`,
        );
      });

      it("should print the stack trace", () => {
        const lines: Array<string | Error> = [];
        const error = new HardhatError(mockCoreErrorDescriptor);

        printErrorMessages(error, true, (msg: string | Error) => {
          lines.push(msg);
        });

        assert.equal(lines.length, 3);
        assert.equal(
          lines[0],
          `${chalk.red.bold(`Error ${error.errorCode}:`)} ${error.formattedMessage}`,
        );
        assert.equal(lines[1], "");
        assert.equal(lines[2], error);
      });
    });

    describe("with a Hardhat plugin error", () => {
      it("should print the error message", () => {
        const lines: Array<string | Error> = [];
        const error = new HardhatError(mockPluginErrorDescriptor);

        printErrorMessages(error, false, (msg: string | Error) => {
          lines.push(msg);
        });

        assert.equal(lines.length, 3);
        assert.equal(
          lines[0],
          `${chalk.red.bold(`Error ${error.errorCode} in plugin ${error.pluginId}:`)} ${error.formattedMessage}`,
        );
        assert.equal(lines[1], "");
        assert.equal(
          lines[2],
          `For more info go to ${HARDHAT_WEBSITE_URL}${error.errorCode} or run ${HARDHAT_NAME} with --show-stack-traces`,
        );
      });

      it("should print the stack trace", () => {
        const lines: Array<string | Error> = [];
        const error = new HardhatError(mockPluginErrorDescriptor);

        printErrorMessages(error, true, (msg: string | Error) => {
          lines.push(msg);
        });

        assert.equal(lines.length, 3);
        assert.equal(
          lines[0],
          `${chalk.red.bold(`Error ${error.errorCode} in plugin ${error.pluginId}:`)} ${error.formattedMessage}`,
        );
        assert.equal(lines[1], "");
        assert.equal(lines[2], error);
      });
    });

    describe("with a deprecated Hardhat error", () => {
      it("should print the error message with deprecation notice", () => {
        const lines: Array<string | Error> = [];
        const error = new HardhatError(mockDeprecatedCoreErrorDescriptor);

        printErrorMessages(error, false, (msg: string | Error) => {
          lines.push(msg);
        });

        assert.equal(lines.length, 3);
        assert.ok(
          (lines[0] as string).includes(error.formattedMessage),
          "should contain the error message",
        );
        assert.ok(
          (lines[0] as string).includes(
            "This error is deprecated and will be removed in a future version of Hardhat",
          ),
          "should contain the deprecation notice",
        );
        assert.equal(lines[1], "");
        assert.equal(
          lines[2],
          `For more info go to ${HARDHAT_WEBSITE_URL}${error.errorCode} or run ${HARDHAT_NAME} with --show-stack-traces`,
        );
      });
    });

    describe("with a deprecated Hardhat plugin error", () => {
      it("should print the error message with deprecation notice", () => {
        const lines: Array<string | Error> = [];
        const error = new HardhatError(mockDeprecatedPluginErrorDescriptor);

        printErrorMessages(error, false, (msg: string | Error) => {
          lines.push(msg);
        });

        assert.equal(lines.length, 3);
        assert.ok(
          (lines[0] as string).includes(error.formattedMessage),
          "should contain the error message",
        );
        assert.ok(
          (lines[0] as string).includes(
            "This error is deprecated and will be removed in a future version of Hardhat",
          ),
          "should contain the deprecation notice",
        );
        assert.equal(lines[1], "");
        assert.equal(
          lines[2],
          `For more info go to ${HARDHAT_WEBSITE_URL}${error.errorCode} or run ${HARDHAT_NAME} with --show-stack-traces`,
        );
      });
    });

    describe("with a Hardhat community plugin error", () => {
      it("should print the error message", () => {
        const lines: Array<string | Error> = [];
        const error = new HardhatPluginError(
          "community-plugin",
          "error message",
        );

        printErrorMessages(error, false, (msg: string | Error) => {
          lines.push(msg);
        });

        assert.equal(lines.length, 3);
        assert.equal(
          lines[0],
          `${chalk.red.bold(`Error in community plugin ${error.pluginId}:`)} ${error.message}`,
        );
        assert.equal(lines[1], "");
        assert.equal(
          lines[2],
          `For more info run ${HARDHAT_NAME} with --show-stack-traces`,
        );
      });

      it("should print the stack trace", () => {
        const lines: Array<string | Error> = [];
        const error = new HardhatPluginError(
          "community-plugin",
          "error message",
        );

        printErrorMessages(error, true, (msg: string | Error) => {
          lines.push(msg);
        });

        assert.equal(lines.length, 3);
        assert.equal(
          lines[0],
          `${chalk.red.bold(`Error in community plugin ${error.pluginId}:`)} ${error.message}`,
        );
        assert.equal(lines[1], "");
        assert.equal(lines[2], error);
      });
    });

    describe("with an unknown error", () => {
      it("should print the error message with the stack traces for an instance of Error", () => {
        const lines: Array<string | Error> = [];
        const error = new Error("error message");

        printErrorMessages(error, false, (msg: string | Error) => {
          lines.push(msg);
        });

        assert.equal(lines.length, 5);
        assert.equal(lines[0], chalk.red.bold(`An unexpected error occurred:`));
        assert.equal(lines[1], "");
        assert.equal(lines[2], error);
        assert.equal(lines[3], "");
        assert.equal(
          lines[4],
          `If you think this is a bug in Hardhat, please report it here: ${HARDHAT_WEBSITE_URL}report-bug`,
        );
      });
    });
  });
});
