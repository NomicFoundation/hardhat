import { expect } from "chai";
import { TASK_COMPILE } from "hardhat/builtin-tasks/task-names";
import { TASK_VERIFY_PROCESS_ARGUMENTS } from "../../src/task-names";
import { useEnvironment } from "../helpers";

describe("verify task", () => {
  useEnvironment("hardhat-project-undefined-config");

  before(async function () {
    await this.hre.run(TASK_COMPILE, { force: true, quiet: true });
  });

  describe("verify:process-arguments", () => {
    it("should throw if the address was not provided", async function () {
      await expect(
        this.hre.run(TASK_VERIFY_PROCESS_ARGUMENTS, {
          constructorArgsParams: [],
          constructorArgs: "path/to/constructor/args/module.js",
          libraries: "path/to/libs/module.js",
          contract: "",
        })
      ).to.be.rejectedWith(/You didn’t provide any address./);
    });
  });
});
