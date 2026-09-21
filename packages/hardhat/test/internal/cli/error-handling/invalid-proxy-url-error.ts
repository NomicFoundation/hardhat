import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  DispatcherError,
  InvalidProxyUrlError,
} from "@nomicfoundation/hardhat-utils/request";

import { detectInvalidProxyUrl } from "../../../../src/internal/cli/error-handling/invalid-proxy-url-error.js";

describe("invalid-proxy-url-error", () => {
  describe("detectInvalidProxyUrl", () => {
    it("detects a DispatcherError caused by InvalidProxyUrlError", () => {
      const cause = new InvalidProxyUrlError("HTTPS_PROXY");
      const error = new DispatcherError(cause.message, cause);

      assert.deepEqual(detectInvalidProxyUrl(error), {
        envVarName: "HTTPS_PROXY",
      });
    });

    it("detects InvalidProxyUrlError at the top of the chain", () => {
      const error = new InvalidProxyUrlError("http_proxy");

      assert.deepEqual(detectInvalidProxyUrl(error), {
        envVarName: "http_proxy",
      });
    });

    it("detects the cause through a wrapping HardhatError", () => {
      const cause = new InvalidProxyUrlError("HTTPS_PROXY");
      const dispatcherError = new DispatcherError(cause.message, cause);
      const error = new HardhatError(
        HardhatError.ERRORS.HARDHAT_SLANG_SOLX.GENERAL.CHECKSUM_DOWNLOAD_FAILED,
        {
          version: "0.1.8",
          url: "https://example.test/solx.sha256",
          reason: dispatcherError.message,
        },
        dispatcherError,
      );

      assert.deepEqual(detectInvalidProxyUrl(error), {
        envVarName: "HTTPS_PROXY",
      });
    });

    it("ignores an unrelated DispatcherError", () => {
      const error = new DispatcherError("connection reset");

      assert.equal(detectInvalidProxyUrl(error), undefined);
    });

    it("ignores an unrelated error", () => {
      const error = new Error("something else went wrong");

      assert.equal(detectInvalidProxyUrl(error), undefined);
    });
  });
});
