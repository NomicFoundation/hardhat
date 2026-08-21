import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { detectNativeBindingFailure } from "../../../../src/internal/cli/error-handling/native-binding-error.js";

describe("native-binding-error", () => {
  describe("detectNativeBindingFailure", () => {
    it("detects the EDR shape: a top-level message with a cause chain naming the missing module", () => {
      const cause = new Error(
        "Cannot find module '@nomicfoundation/edr-linux-arm64-gnu'",
      );
      const error = new Error(
        "Cannot find native binding. npm has a bug related to optional dependencies (https://github.com/npm/cli/issues/4828).",
        { cause },
      );

      assert.deepEqual(detectNativeBindingFailure(error), {
        parentPackage: "@nomicfoundation/edr",
        missingPackage: "@nomicfoundation/edr-linux-arm64-gnu",
      });
    });

    it("detects the ESM message form of the EDR shape", () => {
      const error = new Error(
        "Cannot find package '@nomicfoundation/edr-darwin-arm64' imported from /project/index.js",
      );

      assert.deepEqual(detectNativeBindingFailure(error), {
        parentPackage: "@nomicfoundation/edr",
        missingPackage: "@nomicfoundation/edr-darwin-arm64",
      });
    });

    it("detects the solidity-analyzer shape: a bare MODULE_NOT_FOUND with no cause", () => {
      const error = new Error(
        "Cannot find module '@nomicfoundation/solidity-analyzer-linux-arm64-gnu'",
      );

      assert.deepEqual(detectNativeBindingFailure(error), {
        parentPackage: "@nomicfoundation/solidity-analyzer",
        missingPackage: "@nomicfoundation/solidity-analyzer-linux-arm64-gnu",
      });
    });

    it("ignores a platform-shaped missing module that isn't a known binding package", () => {
      const error = new Error("Cannot find module 'some-app-linux-x64-gnu'");

      assert.equal(detectNativeBindingFailure(error), undefined);
    });

    it("ignores a missing module with no platform suffix", () => {
      const error = new Error("Cannot find module '@nomicfoundation/edr'");

      assert.equal(detectNativeBindingFailure(error), undefined);
    });

    it("ignores the loader's own local binding probe", () => {
      const error = new Error(
        "Cannot find module './edr.linux-arm64-gnu.node'",
      );

      assert.equal(detectNativeBindingFailure(error), undefined);
    });

    // We only detect the native binding for the specific NPM bug, everything else goes through
    it("does not detect a wrapper message that doesn't name a missing module", () => {
      const error = new Error("Cannot find native binding");

      assert.equal(detectNativeBindingFailure(error), undefined);
    });

    it("ignores an unrelated error", () => {
      const error = new Error("something else went wrong");

      assert.equal(detectNativeBindingFailure(error), undefined);
    });
  });
});
