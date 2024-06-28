import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  HardhatError,
  HardhatPluginError,
} from "@ignored/hardhat-vnext-errors";
import chalk from "chalk";

import { printErrorMessages } from "../../../src/internal/cli/error-handler.js";
import {
  HARDHAT_NAME,
  HARDHAT_WEBSITE_URL,
} from "../../../src/internal/constants.js";
import { createTestEnvManager } from "../../helpers/env-vars.js";

const mockErrorDescriptor = {
  number: 123,
  messageTemplate: "error message",
  websiteTitle: "Mock error",
  websiteDescription: "This is a mock error",
} as const;

describe("error-handler", () => {
  describe("printErrorMessages", () => {
    describe("with a Hardhat error", () => {
      const { setEnvVar } = createTestEnvManager();

      it("should print the error message", () => {
        const lines: string[] = [];
        const error = new HardhatError(mockErrorDescriptor);

        printErrorMessages(error, (msg: string) => {
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

      it("should print the stack trace when the stack is enabled via env vars", () => {
        const lines: string[] = [];
        const error = new HardhatError(mockErrorDescriptor);

        // stack traces are enabled in CI environments
        setEnvVar("GITHUB_ACTIONS", "true");

        printErrorMessages(error, (msg: string) => {
          lines.push(msg);
        });

        assert.equal(lines.length, 3);
        assert.equal(
          lines[0],
          `${chalk.red.bold(`Error ${error.errorCode}:`)} ${error.formattedMessage}`,
        );
        assert.equal(lines[1], "");
        assert.equal(lines[2], error.stack);
      });

      it("should print the stack trace when the stack is enabled via --show-stack-traces", () => {
        try {
          const lines: string[] = [];
          const error = new HardhatError(mockErrorDescriptor);

          process.argv.push("--show-stack-traces");

          printErrorMessages(error, (msg: string) => {
            lines.push(msg);
          });

          assert.equal(lines.length, 3);
          assert.equal(
            lines[0],
            `${chalk.red.bold(`Error ${error.errorCode}:`)} ${error.formattedMessage}`,
          );
          assert.equal(lines[1], "");
          assert.equal(lines[2], error.stack);
        } finally {
          process.argv.pop();
        }
      });
    });

    describe("with a Hardhat plugin error", () => {
      const { setEnvVar } = createTestEnvManager();

      it("should print the error message", () => {
        const lines: string[] = [];
        const error = new HardhatError({
          pluginId: "example-plugin",
          ...mockErrorDescriptor,
        });

        printErrorMessages(error, (msg: string) => {
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

      it("should print the stack trace when the stack is enabled via env vars", () => {
        const lines: string[] = [];
        const error = new HardhatError({
          pluginId: "example-plugin",
          ...mockErrorDescriptor,
        });

        // stack traces are enabled in CI environments
        setEnvVar("GITHUB_ACTIONS", "true");

        printErrorMessages(error, (msg: string) => {
          lines.push(msg);
        });

        assert.equal(lines.length, 3);
        assert.equal(
          lines[0],
          `${chalk.red.bold(`Error ${error.errorCode} in plugin ${error.pluginId}:`)} ${error.formattedMessage}`,
        );
        assert.equal(lines[1], "");
        assert.equal(lines[2], error.stack);
      });

      it("should print the stack trace when the stack is enabled via --show-stack-traces", () => {
        try {
          const lines: string[] = [];
          const error = new HardhatError({
            pluginId: "example-plugin",
            ...mockErrorDescriptor,
          });

          process.argv.push("--show-stack-traces");

          printErrorMessages(error, (msg: string) => {
            lines.push(msg);
          });

          assert.equal(lines.length, 3);
          assert.equal(
            lines[0],
            `${chalk.red.bold(`Error ${error.errorCode} in plugin ${error.pluginId}:`)} ${error.formattedMessage}`,
          );
          assert.equal(lines[1], "");
          assert.equal(lines[2], error.stack);
        } finally {
          process.argv.pop();
        }
      });
    });

    describe("with a Hardhat community plugin error", () => {
      const { setEnvVar } = createTestEnvManager();

      it("should print the error message", () => {
        const lines: string[] = [];
        const error = new HardhatPluginError(
          "community-plugin",
          "error message",
        );

        printErrorMessages(error, (msg: string) => {
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

      it("should print the stack trace when the stack is enabled via env vars", () => {
        const lines: string[] = [];
        const error = new HardhatPluginError(
          "community-plugin",
          "error message",
        );

        // stack traces are enabled in CI environments
        setEnvVar("GITHUB_ACTIONS", "true");

        printErrorMessages(error, (msg: string) => {
          lines.push(msg);
        });

        assert.equal(lines.length, 3);
        assert.equal(
          lines[0],
          `${chalk.red.bold(`Error in community plugin ${error.pluginId}:`)} ${error.message}`,
        );
        assert.equal(lines[1], "");
        assert.equal(lines[2], error.stack);
      });

      it("should print the stack trace when the stack is enabled via --show-stack-traces", () => {
        try {
          const lines: string[] = [];
          const error = new HardhatPluginError(
            "community-plugin",
            "error message",
          );

          process.argv.push("--show-stack-traces");

          printErrorMessages(error, (msg: string) => {
            lines.push(msg);
          });

          assert.equal(lines.length, 3);
          assert.equal(
            lines[0],
            `${chalk.red.bold(`Error in community plugin ${error.pluginId}:`)} ${error.message}`,
          );
          assert.equal(lines[1], "");
          assert.equal(lines[2], error.stack);
        } finally {
          process.argv.pop();
        }
      });
    });

    describe("with an unknown error", () => {
      it("should print the error message with the stack traces for an instance of Error", () => {
        const lines: string[] = [];
        const error = new Error("error message");

        printErrorMessages(error, (msg: string) => {
          lines.push(msg);
        });

        assert.equal(lines.length, 5);
        assert.equal(lines[0], chalk.red.bold(`An unexpected error occurred:`));
        assert.equal(lines[1], "");
        assert.equal(lines[2], error.stack);
        assert.equal(lines[3], "");
        assert.equal(
          lines[4],
          `If you think this is a bug in Hardhat, please report it here: ${HARDHAT_WEBSITE_URL}report-bug`,
        );
      });
    });
  });
});
