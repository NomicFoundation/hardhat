import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { styleText } from "node:util";

import {
  HardhatError,
  HardhatPluginError,
} from "@nomicfoundation/hardhat-errors";
import {
  DispatcherError,
  InvalidProxyUrlError,
} from "@nomicfoundation/hardhat-utils/request";

import { printErrorMessages } from "../../../../src/internal/cli/error-handling/error-handler.js";
import {
  HARDHAT_NAME,
  HARDHAT_WEBSITE_URL,
} from "../../../../src/internal/constants.js";
import { UsingHardhat2PluginError } from "../../../../src/internal/using-hardhat2-plugin-errors.js";

const nativeBindingErrorDescriptor =
  HardhatError.ERRORS.CORE.GENERAL.NATIVE_BINDING_LOAD_FAILED;

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

describe("error-handler", () => {
  describe("printErrorMessages", () => {
    describe("with a Hardhat error", () => {
      it("should print the error message", async () => {
        const lines: Array<string | Error> = [];
        const error = new HardhatError(mockCoreErrorDescriptor);

        await printErrorMessages(error, false, (msg: string | Error) => {
          lines.push(msg);
        });

        assert.equal(lines.length, 3);
        assert.equal(
          lines[0],
          `${styleText(["red", "bold"], `Error ${error.errorCode}:`)} ${error.formattedMessage}`,
        );
        assert.equal(lines[1], "");
        assert.equal(
          lines[2],
          `For more info go to ${HARDHAT_WEBSITE_URL}${error.errorCode} or run ${HARDHAT_NAME} with --show-stack-traces`,
        );
      });

      it("should print the stack trace", async () => {
        const lines: Array<string | Error> = [];
        const error = new HardhatError(mockCoreErrorDescriptor);

        await printErrorMessages(error, true, (msg: string | Error) => {
          lines.push(msg);
        });

        assert.equal(lines.length, 3);
        assert.equal(
          lines[0],
          `${styleText(["red", "bold"], `Error ${error.errorCode}:`)} ${error.formattedMessage}`,
        );
        assert.equal(lines[1], "");
        assert.equal(lines[2], error);
      });
    });

    describe("with a Hardhat plugin error", () => {
      it("should print the error message", async () => {
        const lines: Array<string | Error> = [];
        const error = new HardhatError(mockPluginErrorDescriptor);

        await printErrorMessages(error, false, (msg: string | Error) => {
          lines.push(msg);
        });

        assert.equal(lines.length, 3);
        assert.equal(
          lines[0],
          `${styleText(["red", "bold"], `Error ${error.errorCode} in plugin ${error.pluginId}:`)} ${error.formattedMessage}`,
        );
        assert.equal(lines[1], "");
        assert.equal(
          lines[2],
          `For more info go to ${HARDHAT_WEBSITE_URL}${error.errorCode} or run ${HARDHAT_NAME} with --show-stack-traces`,
        );
      });

      it("should print the stack trace", async () => {
        const lines: Array<string | Error> = [];
        const error = new HardhatError(mockPluginErrorDescriptor);

        await printErrorMessages(error, true, (msg: string | Error) => {
          lines.push(msg);
        });

        assert.equal(lines.length, 3);
        assert.equal(
          lines[0],
          `${styleText(["red", "bold"], `Error ${error.errorCode} in plugin ${error.pluginId}:`)} ${error.formattedMessage}`,
        );
        assert.equal(lines[1], "");
        assert.equal(lines[2], error);
      });
    });

    describe("with a Hardhat community plugin error", () => {
      it("should print the error message", async () => {
        const lines: Array<string | Error> = [];
        const error = new HardhatPluginError(
          "community-plugin",
          "error message",
        );

        await printErrorMessages(error, false, (msg: string | Error) => {
          lines.push(msg);
        });

        assert.equal(lines.length, 3);
        assert.equal(
          lines[0],
          `${styleText(["red", "bold"], `Error in community plugin ${error.pluginId}:`)} ${error.message}`,
        );
        assert.equal(lines[1], "");
        assert.equal(
          lines[2],
          `For more info run ${HARDHAT_NAME} with --show-stack-traces`,
        );
      });

      it("should print the stack trace", async () => {
        const lines: Array<string | Error> = [];
        const error = new HardhatPluginError(
          "community-plugin",
          "error message",
        );

        await printErrorMessages(error, true, (msg: string | Error) => {
          lines.push(msg);
        });

        assert.equal(lines.length, 3);
        assert.equal(
          lines[0],
          `${styleText(["red", "bold"], `Error in community plugin ${error.pluginId}:`)} ${error.message}`,
        );
        assert.equal(lines[1], "");
        assert.equal(lines[2], error);
      });
    });

    describe("with an unknown error", () => {
      it("should print the error message with the stack traces for an instance of Error", async () => {
        const lines: Array<string | Error> = [];
        const error = new Error("error message");

        await printErrorMessages(error, false, (msg: string | Error) => {
          lines.push(msg);
        });

        assert.equal(lines.length, 5);
        assert.equal(
          lines[0],
          styleText(["red", "bold"], `An unexpected error occurred:`),
        );
        assert.equal(lines[1], "");
        assert.equal(lines[2], error);
        assert.equal(lines[3], "");
        assert.equal(
          lines[4],
          `If you think this is a bug in Hardhat, please report it here: ${HARDHAT_WEBSITE_URL}report-bug`,
        );
      });
    });

    describe("with a Hardhat 2 to Hardhat 3 migration error", () => {
      it("should print the error message", async () => {
        const lines: Array<string | Error> = [];
        const error = new Error(
          "class extends value undefined is not a constructor or null",
        );

        await printErrorMessages(error, false, (msg: string | Error) => {
          lines.push(msg);
        });

        assert.equal(lines.length, 5);
        assert.equal(
          lines[0],
          styleText(["red", "bold"], `Hardhat 3 migration error:`),
        );
        assert.equal(lines[1], "");
        assert.equal(lines[2], error);
        assert.equal(lines[3], "");
        assert.equal(
          lines[4],
          `It looks like you are migrating from Hardhat 2 to Hardhat 3. The following error often shows up during this kind of migration.\nPlease read https://hardhat.org/migrate-from-hardhat2 to learn how to migrate your project to Hardhat 3.`,
        );
      });

      it("should always print the stack trace", async () => {
        const error = new Error(
          "class extends value undefined is not a constructor or null",
        );

        for (const shouldShowStackTraces of [false, true]) {
          const lines: Array<string | Error> = [];
          await printErrorMessages(
            error,
            shouldShowStackTraces,
            (msg: string | Error) => {
              lines.push(msg);
            },
          );
          assert.ok(
            lines.includes(error),
            `error stack should be printed (shouldShowStackTraces=${shouldShowStackTraces})`,
          );
        }
      });
    });

    describe("with a CommonJS to ESM migration error", () => {
      it("should print the error message", async () => {
        const lines: Array<string | Error> = [];
        const error = new Error("Cannot use import statement outside a module");

        await printErrorMessages(error, false, (msg: string | Error) => {
          lines.push(msg);
        });

        assert.equal(lines.length, 5);
        assert.equal(
          lines[0],
          styleText(["red", "bold"], `Hardhat 3 migration error:`),
        );
        assert.equal(lines[1], "");
        assert.equal(lines[2], error);
        assert.equal(lines[3], "");
        assert.equal(
          lines[4],
          `It looks like you are migrating from CommonJS to ESM. The following error often shows up during this kind of migration.\nPlease read https://hardhat.org/migrate-to-esm to learn how to migrate your project to ESM.`,
        );
      });

      it("should always print the stack trace", async () => {
        const error = new Error("Cannot use import statement outside a module");

        for (const shouldShowStackTraces of [false, true]) {
          const lines: Array<string | Error> = [];
          await printErrorMessages(
            error,
            shouldShowStackTraces,
            (msg: string | Error) => {
              lines.push(msg);
            },
          );
          assert.ok(
            lines.includes(error),
            `error stack should be printed (shouldShowStackTraces=${shouldShowStackTraces})`,
          );
        }
      });
    });

    describe("with a UsingHardhat2PluginError", () => {
      // Regression check: the classifier routes UsingHardhat2PluginError to
      // the HH2_TO_HH3_MIGRATION branch, so the output should match it.
      it("is treated as a Hardhat 2 to Hardhat 3 migration error", async () => {
        const lines: Array<string | Error> = [];
        const error = new UsingHardhat2PluginError("extendConfig");

        await printErrorMessages(error, false, (msg: string | Error) => {
          lines.push(msg);
        });

        assert.equal(lines.length, 5);
        assert.equal(
          lines[0],
          styleText(["red", "bold"], `Hardhat 3 migration error:`),
        );
        assert.equal(lines[2], error);
        assert.equal(
          lines[4],
          `It looks like you are migrating from Hardhat 2 to Hardhat 3. The following error often shows up during this kind of migration.\nPlease read https://hardhat.org/migrate-from-hardhat2 to learn how to migrate your project to Hardhat 3.`,
        );
      });
    });

    describe("with a native binding load failure", () => {
      it("is categorized as HHE27, with the original error preserved for the stack trace", async () => {
        const cause = new Error(
          "Cannot find module '@nomicfoundation/edr-linux-arm64-gnu'",
        );
        const error = new Error(
          "Cannot find native binding. npm has a bug related to optional dependencies (https://github.com/npm/cli/issues/4828).",
          { cause },
        );
        const expected = new HardhatError(nativeBindingErrorDescriptor, {
          parentPackage: "@nomicfoundation/edr",
          missingPackage: "@nomicfoundation/edr-linux-arm64-gnu",
        });

        const lines: Array<string | Error> = [];
        await printErrorMessages(error, false, (msg: string | Error) => {
          lines.push(msg);
        });

        assert.equal(lines.length, 3);
        assert.equal(
          lines[0],
          `${styleText(["red", "bold"], `Error ${expected.errorCode}:`)} ${expected.formattedMessage}`,
        );
        assert.equal(lines[1], "");
        assert.equal(
          lines[2],
          `For more info go to ${HARDHAT_WEBSITE_URL}${expected.errorCode} or run ${HARDHAT_NAME} with --show-stack-traces`,
        );
      });

      it("still prints the original (uncategorized) error for the stack trace", async () => {
        const cause = new Error(
          "Cannot find module '@nomicfoundation/edr-linux-arm64-gnu'",
        );
        const error = new Error(
          "Cannot find native binding. npm has a bug related to optional dependencies (https://github.com/npm/cli/issues/4828).",
          { cause },
        );

        const lines: Array<string | Error> = [];
        await printErrorMessages(error, true, (msg: string | Error) => {
          lines.push(msg);
        });

        assert.equal(lines[2], error);
      });
    });

    describe("with an invalid proxy URL from the environment", () => {
      function dispatcherErrorFromInvalidProxy(
        envVarName: string = "HTTPS_PROXY",
      ): DispatcherError {
        const cause = new InvalidProxyUrlError(envVarName);
        return new DispatcherError(cause.message, cause);
      }

      it("is categorized as a Hardhat error naming the env var and expected format, without echoing the proxy value", async () => {
        const cause = new InvalidProxyUrlError("HTTPS_PROXY");
        const error = new DispatcherError("http://127.0.0.1:8888", cause);
        const expected = new HardhatError(
          HardhatError.ERRORS.CORE.GENERAL.INVALID_PROXY_URL,
          {
            envVarName: "HTTPS_PROXY",
          },
        );

        const lines: Array<string | Error> = [];
        await printErrorMessages(error, false, (msg: string | Error) => {
          lines.push(msg);
        });

        const printed = lines.map(String).join("\n");

        assert.equal(lines.length, 3);
        assert.equal(
          lines[0],
          `${styleText(["red", "bold"], `Error ${expected.errorCode}:`)} ${expected.formattedMessage}`,
        );
        assert.equal(lines[1], "");
        assert.equal(
          lines[2],
          `For more info go to ${HARDHAT_WEBSITE_URL}${expected.errorCode} or run ${HARDHAT_NAME} with --show-stack-traces`,
        );
        assert.match(printed, /HTTPS_PROXY/);
        assert.match(printed, /http:\/\/host:port/);
        assert.equal(printed.includes("127.0.0.1:8888"), false);
        assert.equal(printed.includes("report-bug"), false);
        assert.equal(
          printed.includes("An unexpected error occurred"),
          false,
          "should not use the unexpected-error banner",
        );
        assert.equal(
          lines.includes(error),
          false,
          "should not print the stack by default",
        );
      });

      it("still prints the original (uncategorized) error for the stack trace", async () => {
        const error = dispatcherErrorFromInvalidProxy();

        const lines: Array<string | Error> = [];
        await printErrorMessages(error, true, (msg: string | Error) => {
          lines.push(msg);
        });

        assert.equal(lines[2], error);
      });

      it("converts a download HardhatError wrapping the same cause to the proxy error", async () => {
        const dispatcherError = dispatcherErrorFromInvalidProxy("HTTPS_PROXY");
        const error = new HardhatError(
          HardhatError.ERRORS.HARDHAT_SLANG_SOLX.GENERAL
            .CHECKSUM_DOWNLOAD_FAILED,
          {
            version: "0.1.8",
            url: "https://example.test/solx.sha256",
            reason: dispatcherError.message,
          },
          dispatcherError,
        );
        const expected = new HardhatError(
          HardhatError.ERRORS.CORE.GENERAL.INVALID_PROXY_URL,
          {
            envVarName: "HTTPS_PROXY",
          },
        );

        const lines: Array<string | Error> = [];
        await printErrorMessages(error, false, (msg: string | Error) => {
          lines.push(msg);
        });

        const header = String(lines[0]);
        assert.equal(
          header,
          `${styleText(["red", "bold"], `Error ${expected.errorCode}:`)} ${expected.formattedMessage}`,
        );
        assert.equal(header.includes("hardhat-slang-solx"), false);
        assert.equal(header.includes("Couldn't download"), false);
        assert.match(header, /HTTPS_PROXY/);
        assert.match(header, /http:\/\/host:port/);
      });

      it("does not recategorize an unrelated DispatcherError", async () => {
        const error = new DispatcherError("connection reset");
        const lines: Array<string | Error> = [];

        await printErrorMessages(error, false, (msg: string | Error) => {
          lines.push(msg);
        });

        assert.equal(
          lines[0],
          styleText(["red", "bold"], `An unexpected error occurred:`),
        );
        assert.equal(
          String(lines[4] ?? ""),
          `If you think this is a bug in Hardhat, please report it here: ${HARDHAT_WEBSITE_URL}report-bug`,
        );
      });
    });
  });
});
