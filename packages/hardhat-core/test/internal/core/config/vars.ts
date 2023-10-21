import { assert, expect } from "chai";
import fs from "fs-extra";
import * as os from "os";
import sinon from "sinon";
import chalk from "chalk";
import { vars } from "../../../../src/internal/core/config/config-env";
import { VarsManager } from "../../../../src/internal/core/vars/vars-manager";
import { HardhatContext } from "../../../../src/internal/context";
import { resetHardhatContext } from "../../../../src/internal/reset";

describe("vars", function () {
  const TMP_FILE_PATH = `${os.tmpdir()}/test-vars.json`;
  let ctx: HardhatContext;

  before(function () {
    ctx = HardhatContext.createHardhatContext();
  });

  beforeEach(function () {
    fs.removeSync(TMP_FILE_PATH);

    // Create a new instance of the vars manager so that it can point to the test file
    ctx.varsManager = new VarsManager(TMP_FILE_PATH);

    ctx.varsManager.set("key1", "val1");
  });

  after(function () {
    resetHardhatContext();
  });

  describe("hasVars", function () {
    it("should return true if the key exists", function () {
      expect(vars.has("key1")).to.equal(true);
    });

    it("should return false if the key does not exist", function () {
      expect(vars.has("non-existing")).to.equal(false);
    });
  });

  describe("getVars", function () {
    it("should return the value associated to the key", function () {
      expect(vars.get("key1")).to.equal("val1");
    });

    it("should return the default value for the var because the key is not found", function () {
      expect(vars.get("nonExistingKey", "defaultValue")).to.equal(
        "defaultValue"
      );
    });

    it("should throw an error if the key does not exist and no default value is set", function () {
      const sandbox = sinon.createSandbox();
      const spyConsoleError = sandbox.stub(console, "error");

      expect(() => vars.get("nonExistingKey")).to.throw(
        "HH1201: Cannot find a value associated to the key 'nonExistingKey'"
      );

      assert(
        spyConsoleError.calledWith(
          chalk.red(
            `Error in the configuration file 'hardhat.config.ts', use '${chalk.italic(
              "npx hardhat vars setup"
            )}' to list the vars that need to be setup`
          )
        )
      );

      spyConsoleError.restore();
    });
  });
});
