import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getEnvVariableNameFromGlobalOption,
  setGlobalOptionsAsEnvVariables,
} from "../src/env.js";

describe("env", () => {
  describe("getEnvVariableNameFromGlobalOption", () => {
    it("should load the global options in the env variables", async () => {
      setGlobalOptionsAsEnvVariables({
        network: "test-network",
        coverage: true,
      });

      assert.equal(process.env.HARDHAT_NETWORK, "test-network");
      assert.equal(process.env.HARDHAT_COVERAGE, "true");
    });
  });

  describe("getEnvVariableNameFromGlobalOption", () => {
    it("should return the global option name in env variable format", async () => {
      assert.equal(
        getEnvVariableNameFromGlobalOption("someOptionName"),
        "HARDHAT_SOME_OPTION_NAME",
      );
    });
  });
});
