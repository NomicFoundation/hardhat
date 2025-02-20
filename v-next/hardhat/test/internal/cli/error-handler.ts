import assert from "node:assert/strict";
import { describe, it } from "node:test";
import util from "node:util";

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

const mockErrorDescriptor = {
  number: 123,
  messageTemplate: "error message",
  websiteTitle: "Mock error",
  websiteDescription: "This is a mock error",
} as const;

describe("error-handler", () => {
  describe("printErrorMessages", () => {
    describe("with a Hardhat error", () => {
      it("should print the error message", () => {
        const lines: string[] = [];
        const error = new HardhatError(mockErrorDescriptor);

        printErrorMessages(error, false, (msg: string) => {
          lines.push(msg);
        });

        assert.equal(lines.length, 2);
        assert.equal(
          lines[0],
          `${chalk.red.bold(`Error ${error.errorCode}:`)} ${error.formattedMessage}`,
        );
        assert.equal(lines[1], "");
        // Commented out until we have the new website
        // assert.equal(
        //   lines[2],
        //   `For more info go to ${HARDHAT_WEBSITE_URL}${error.errorCode} or run ${HARDHAT_NAME} with --show-stack-traces`,
        // );
      });

      it("should print the stack trace", () => {
        const lines: string[] = [];
        const error = new HardhatError(mockErrorDescriptor);

        printErrorMessages(error, true, (msg: string) => {
          lines.push(msg);
        });

        assert.equal(lines.length, 3);
        assert.equal(
          lines[0],
          `${chalk.red.bold(`Error ${error.errorCode}:`)} ${error.formattedMessage}`,
        );
        assert.equal(lines[1], "");
        assert.equal(lines[2], `${error.stack}`);
      });
    });

    describe("with a Hardhat plugin error", () => {
      it("should print the error message", () => {
        const lines: string[] = [];
        const error = new HardhatError({
          pluginId: "example-plugin",
          ...mockErrorDescriptor,
        });

        printErrorMessages(error, false, (msg: string) => {
          lines.push(msg);
        });

        assert.equal(lines.length, 2);
        assert.equal(
          lines[0],
          `${chalk.red.bold(`Error ${error.errorCode} in plugin ${error.pluginId}:`)} ${error.formattedMessage}`,
        );
        assert.equal(lines[1], "");
        // Commented out until we have the new website
        // assert.equal(
        //   lines[2],
        //   `For more info go to ${HARDHAT_WEBSITE_URL}${error.errorCode} or run ${HARDHAT_NAME} with --show-stack-traces`,
        // );
      });

      it("should print the stack trace", () => {
        const lines: string[] = [];
        const error = new HardhatError({
          pluginId: "example-plugin",
          ...mockErrorDescriptor,
        });

        printErrorMessages(error, true, (msg: string) => {
          lines.push(msg);
        });

        assert.equal(lines.length, 3);
        assert.equal(
          lines[0],
          `${chalk.red.bold(`Error ${error.errorCode} in plugin ${error.pluginId}:`)} ${error.formattedMessage}`,
        );
        assert.equal(lines[1], "");
        assert.equal(lines[2], `${error.stack}`);
      });
    });

    describe("with a Hardhat community plugin error", () => {
      it("should print the error message", () => {
        const lines: string[] = [];
        const error = new HardhatPluginError(
          "community-plugin",
          "error message",
        );

        printErrorMessages(error, false, (msg: string) => {
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
        const lines: string[] = [];
        const error = new HardhatPluginError(
          "community-plugin",
          "error message",
        );

        printErrorMessages(error, true, (msg: string) => {
          lines.push(msg);
        });

        assert.equal(lines.length, 3);
        assert.equal(
          lines[0],
          `${chalk.red.bold(`Error in community plugin ${error.pluginId}:`)} ${error.message}`,
        );
        assert.equal(lines[1], "");
        assert.equal(lines[2], `${error.stack}`);
      });
    });

    describe("with an unknown error", () => {
      it("should print the error message with the stack traces for an instance of Error", () => {
        const lines: string[] = [];
        const error = new Error("error message");

        printErrorMessages(error, false, (msg: string) => {
          lines.push(msg);
        });

        assert.equal(lines.length, 5);
        assert.equal(lines[0], chalk.red.bold(`An unexpected error occurred:`));
        assert.equal(lines[1], "");
        assert.equal(lines[2], `${error.stack}`);
        assert.equal(lines[3], "");
        assert.equal(
          lines[4],
          `If you think this is a bug in Hardhat, please report it here: ${HARDHAT_WEBSITE_URL}report-bug`,
        );
      });

      it("should print the error message with the error for an unknown error", () => {
        const lines: string[] = [];
        const error = { message: "error message" };

        printErrorMessages(error, false, (msg: string) => {
          lines.push(msg);
        });

        assert.equal(lines.length, 5);
        assert.equal(lines[0], chalk.red.bold(`An unexpected error occurred:`));
        assert.equal(lines[1], "");
        assert.equal(lines[2], `${util.inspect(error)}`);
        assert.equal(lines[3], "");
        assert.equal(
          lines[4],
          `If you think this is a bug in Hardhat, please report it here: ${HARDHAT_WEBSITE_URL}report-bug`,
        );
      });
    });
  });
});
