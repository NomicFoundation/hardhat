import { assert } from "chai";
import { TASK_COMPILE } from "hardhat/builtin-tasks/task-names";
import { NomicLabsHardhatPluginError } from "hardhat/plugins";

import { useEnvironment } from "./helpers";

describe("Vyper plugin", async function () {
  describe("Successful compilation", async function () {
    useEnvironment("successful-compilation");

    it("Should successfully compile the contract", async function () {
      await this.env.run(TASK_COMPILE);
      assert.equal(
        this.env.artifacts.readArtifactSync("test").contractName,
        "test"
      );
    });
  });

  describe("Partial compilation", async function () {
    useEnvironment("partial-compilation");

    it("Should successfully compile the contract", async function () {
      try {
        await this.env.run(TASK_COMPILE);
      } catch (error: any) {
        assert.instanceOf(error, NomicLabsHardhatPluginError);
        assert.include("compilation failed", error.message.toLowerCase());
        assert.equal(
          this.env.artifacts.readArtifactSync("test").contractName,
          "test"
        );

        return;
      }

      assert.fail("Should have failed");
    });
  });

  describe("Mixed language", async function () {
    useEnvironment("mixed-language");

    it("Should successfully compile the contracts", async function () {
      await this.env.run(TASK_COMPILE);
      assert.equal(
        this.env.artifacts.readArtifactSync("test").contractName,
        "test"
      );
      assert.equal(
        this.env.artifacts.readArtifactSync("Greeter").contractName,
        "Greeter"
      );
    });
  });
});
