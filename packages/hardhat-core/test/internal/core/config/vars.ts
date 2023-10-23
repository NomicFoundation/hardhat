import { expect } from "chai";
import fs from "fs-extra";
import * as os from "os";
import { vars } from "../../../../src/internal/core/config/config-env";
import { VarsManager } from "../../../../src/internal/core/vars/vars-manager";
import { HardhatContext } from "../../../../src/internal/context";
import { resetHardhatContext } from "../../../../src/internal/reset";
import { VarsManagerSetup } from "../../../../src/internal/core/vars/vars-manager-setup";

describe("vars", function () {
  const TMP_FILE_PATH = `${os.tmpdir()}/test-vars.json`;
  let ctx: HardhatContext;
  const ENV_VAR_PREFIX = "HARDHAT_VAR_";
  const ENV_KEY = "key_env_1";

  before(function () {
    ctx = HardhatContext.createHardhatContext();
    process.env[`${ENV_VAR_PREFIX}${ENV_KEY}`] = "val1";
  });

  after(function () {
    resetHardhatContext();
    delete process.env[`${ENV_VAR_PREFIX}${ENV_KEY}`];
  });

  describe("setup scenario", function () {
    beforeEach(function () {
      fs.removeSync(TMP_FILE_PATH);

      // Create a new instance of the vars manager so that it can point to the test file
      ctx.varsManager = new VarsManagerSetup(TMP_FILE_PATH);

      ctx.varsManager.set("key1", "val1");
    });

    describe("hasVars", function () {
      it("should return true if the key exists", function () {
        expect(vars.has("key1")).to.equal(true);
      });

      it("should return false if the key does not exist", function () {
        expect(vars.has("non-existing")).to.equal(false);
      });

      it("should return false for the env variable", function () {
        expect(vars.has(ENV_KEY)).to.equal(false);
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

      it("should not get the env variable", function () {
        expect(vars.get(ENV_KEY)).to.equal("");
      });

      it("should not throw an error if the key does not exist and no default value is set", function () {
        vars.get("nonExistingKey");
      });
    });
  });

  describe("normal scenario", function () {
    beforeEach(function () {
      fs.removeSync(TMP_FILE_PATH);

      // Create a new instance of the vars manager so that it can point to the test file
      ctx.varsManager = new VarsManager(TMP_FILE_PATH);

      ctx.varsManager.set("key1", "val1");
    });

    describe("hasVars", function () {
      it("should return true if the key exists", function () {
        expect(vars.has("key1")).to.equal(true);
      });

      it("should return false if the key does not exist", function () {
        expect(vars.has("non-existing")).to.equal(false);
      });

      it("should return true for the env variable", function () {
        expect(vars.has(ENV_KEY)).to.equal(true);
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

      it("should get the env variable", function () {
        expect(vars.get(ENV_KEY)).to.equal("val1");
      });

      it("should throw an error if the key does not exist and no default value is set", function () {
        expect(() => vars.get("nonExistingKey")).to.throw(
          "HH1201: Cannot find a value associated to the key 'nonExistingKey'. Use 'npx hardhat vars setup' to list the vars that need to be setup in your Hardhat configuration file."
        );
      });
    });
  });
});
