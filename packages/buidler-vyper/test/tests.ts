import { TASK_COMPILE } from "@nomiclabs/buidler/builtin-tasks/task-names";
import {
  Artifacts,
  NomicLabsBuidlerPluginError,
} from "@nomiclabs/buidler/plugins";
import { assert } from "chai";
import path from "path";

import { useEnvironment } from "./helpers";

describe("Vyper plugin", async function () {
  describe("Successful compilation", async function () {
    useEnvironment(path.join(__dirname, "projects", "successful-compilation"));

    it("Should successfully compile the contract", async function () {
      await this.env.run(TASK_COMPILE);
      const artifacts = new Artifacts(this.env.config.paths.artifacts);
      assert.equal(artifacts.readArtifactSync("test").contractName, "test");
    });
  });

  describe("Partial compilation", async function () {
    useEnvironment(path.join(__dirname, "projects", "partial-compilation"));

    it("Should successfully compile the contract", async function () {
      try {
        await this.env.run(TASK_COMPILE);
      } catch (error) {
        assert.instanceOf(error, NomicLabsBuidlerPluginError);
        assert.include("compilation failed", error.message.toLowerCase());

        const artifacts = new Artifacts(this.env.config.paths.artifacts);
        assert.equal(artifacts.readArtifactSync("test").contractName, "test");

        return;
      }

      assert.fail("Should have failed");
    });
  });
});
