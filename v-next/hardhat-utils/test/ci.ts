import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";

import { isCi } from "../src/ci.js";

// Get the original ENV variables so they can be restored at the end of teh tests
const ORIGINAL_ENV_VARS = process.env;

describe("ci", () => {
  describe("isCi", () => {
    beforeEach(() => {
      process.env = {};
    });

    after(() => {
      // Restore original ENV variables
      process.env = ORIGINAL_ENV_VARS;
    });

    it("should be false because all the ENV variables are undefined", async () => {
      assert.equal(isCi(), false);
    });

    it("should be true because the ENV variable CI is true", async () => {
      process.env.CI = "true";
      assert.equal(isCi(), true);
    });

    it("should be true because the ENV variable CONTINUOUS_INTEGRATION is true", async () => {
      process.env.CONTINUOUS_INTEGRATION = "true";
      assert.equal(isCi(), true);
    });

    it("should be true because the ENV variable BUILD_NUMBER is true", async () => {
      process.env.BUILD_NUMBER = "true";
      assert.equal(isCi(), true);
    });

    it("should be true because the ENV variable RUN_ID is true", async () => {
      process.env.RUN_ID = "true";
      assert.equal(isCi(), true);
    });

    it("should be true because the ENV variable GITHUB_ACTIONS is true", async () => {
      process.env.GITHUB_ACTIONS = "true";
      assert.equal(isCi(), true);
    });

    it("should be true because the ENV variable NOW is true", async () => {
      process.env.NOW = "true";
      assert.equal(isCi(), true);
    });

    it("should be true because the ENV variable DEPLOYMENT_ID is true", async () => {
      process.env.DEPLOYMENT_ID = "true";
      assert.equal(isCi(), true);
    });

    it("should be true because the ENV variable CODEBUILD_BUILD_NUMBER is true", async () => {
      process.env.CODEBUILD_BUILD_NUMBER = "true";
      assert.equal(isCi(), true);
    });
  });
});
