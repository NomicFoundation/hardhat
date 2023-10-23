import fs from "fs-extra";
import { expect } from "chai";
import * as os from "os";
import { VarsManager } from "../../../../src/internal/core/vars/vars-manager";

describe("VarsManager", function () {
  let TMP_FILE_PATH: string;
  let varsManager: VarsManager;

  beforeEach(() => {
    TMP_FILE_PATH = `${os.tmpdir()}/test-vars.json`;
    fs.removeSync(TMP_FILE_PATH);

    varsManager = new VarsManager(TMP_FILE_PATH);
  });

  //
  // For deep testing of the set, has, get, list and delete methods, see the last test
  //

  describe("format", function () {
    it("should contain the _format property and it should have a valid value", function () {
      const format = fs.readJSONSync(TMP_FILE_PATH)._format;

      expect(format).to.not.equal(undefined);
      expect(format.length).to.be.greaterThan(0);
    });
  });

  describe("getStoragePath", () => {
    it("should get the path where the key-value pairs are stored", () => {
      expect(varsManager.getStoragePath()).to.equal(TMP_FILE_PATH);
    });
  });

  describe("set", function () {
    it("should throw if the key is invalid", function () {
      expect(() => varsManager.set("invalid key", "val")).to.throw(
        "HH1202: Invalid key 'invalid key'. Keys can only have alphanumeric characters and underscores, and they cannot start with a number."
      );

      expect(() => varsManager.set("0key", "val")).to.throw(
        "HH1202: Invalid key '0key'. Keys can only have alphanumeric characters and underscores, and they cannot start with a number."
      );

      expect(() => varsManager.set("invalid!", "val")).to.throw(
        "HH1202: Invalid key 'invalid!'. Keys can only have alphanumeric characters and underscores, and they cannot start with a number."
      );
    });
  });

  describe("the json file should match all the operations performed with the VarsManager", function () {
    function performOperations() {
      varsManager.set("key1", "val1");
      varsManager.set("key2", "val2");
      varsManager.set("key3", "val3");

      varsManager.delete("key1");
      varsManager.delete("non-existent");

      varsManager.set("key4", "val4");
      varsManager.set("key5", "val5");

      varsManager.delete("key5");
    }

    it("should match", function () {
      performOperations();

      const vars = fs.readJSONSync(TMP_FILE_PATH).vars;
      expect(vars).to.deep.equal({
        key2: { value: "val2" },
        key3: { value: "val3" },
        key4: { value: "val4" },
      });
    });

    it("should match after reloading the VarsManager (json file is persistent in storage)", function () {
      performOperations();

      const newVarsManager = new VarsManager(TMP_FILE_PATH);

      expect(newVarsManager.get("key1")).to.equal(undefined);
      expect(newVarsManager.get("key2")).to.equal("val2");
      expect(newVarsManager.get("key3")).to.equal("val3");
      expect(newVarsManager.get("key4")).to.equal("val4");
      expect(newVarsManager.get("key5")).to.equal(undefined);
    });
  });

  describe("test all methods (set, get, list and delete)", function () {
    it("should execute all methods correctly", function () {
      // set
      varsManager.set("key1", "val1");
      varsManager.set("key2", "val2");
      varsManager.set("key3", "val3");

      // has
      expect(varsManager.has("key1")).to.equal(true);
      expect(varsManager.has("key4")).to.equal(false);

      // delete
      expect(varsManager.delete("key1")).to.equal(true);
      expect(varsManager.delete("non-existent")).to.equal(false);

      // get
      expect(varsManager.get("key1")).to.equal(undefined);
      expect(varsManager.get("key2")).to.equal("val2");
      expect(varsManager.get("key3")).to.equal("val3");

      // list
      expect(varsManager.list()).to.deep.equal(["key2", "key3"]);

      // delete
      expect(varsManager.delete("key2")).to.equal(true);
      expect(varsManager.delete("key3")).to.equal(true);

      // list
      expect(varsManager.list()).to.deep.equal([]);

      // get
      expect(varsManager.get("key3")).to.equal(undefined);

      // set
      varsManager.set("key1", "val1");
      varsManager.set("key4", "val4");
      varsManager.set("key5", "val5");

      // list
      expect(varsManager.list()).to.deep.equal(["key1", "key4", "key5"]);

      // get
      expect(varsManager.get("key1")).to.equal("val1");
      expect(varsManager.get("key4")).to.equal("val4");
      expect(varsManager.get("key5")).to.equal("val5");
    });
  });

  describe("load vars from environment variables", function () {
    const ENV_VAR_PREFIX = "HARDHAT_VAR_";
    const KEY = "key_env_1";

    describe("when ENV variables are correctly set", () => {
      beforeEach(() => {
        process.env[`${ENV_VAR_PREFIX}${KEY}`] = "val1";
        varsManager = new VarsManager(TMP_FILE_PATH);
      });

      afterEach(() => {
        delete process.env[`${ENV_VAR_PREFIX}${KEY}`];
      });

      describe("function has (without env variables)", () => {
        it("should not have the key-value pairs from the environment variables", function () {
          expect(varsManager.has(KEY)).to.equal(false);
        });
      });

      describe("function hasWithEnvVars (with env variables)", () => {
        it("should have the key-value pairs from the environment variables", function () {
          expect(varsManager.hasWithEnvVars(KEY)).to.equal(true);
        });
      });

      describe("function get (without env variables)", () => {
        it("should get the value from the file, not from the env keys", function () {
          expect(varsManager.get(KEY)).to.equal(undefined);
        });

        it("should get the value from the file, not from the env keys (same key as the env variable)", function () {
          varsManager.set(KEY, "storedValue");

          expect(varsManager.get(KEY)).to.equal("storedValue");
        });
      });

      describe("function getWithEnvVars (with env variables)", () => {
        it("should load the key-value pairs from the environment variables", function () {
          expect(varsManager.getWithEnvVars(KEY)).to.equal("val1");
        });

        it("should show the env variable value. Env variables have priority over the stored ones", function () {
          varsManager.set(KEY, "storedValue");

          expect(varsManager.getWithEnvVars(KEY)).to.equal("val1");
        });
      });

      it("should not store the env variable in the file but only in the cache", function () {
        // Add a new key-value pair to be sure that env variables are not added when the cache is stored on file during the set operation
        varsManager.set("key", "val");

        const vars = fs.readJSONSync(TMP_FILE_PATH).vars;

        expect(vars).to.deep.equal({
          key: { value: "val" },
        });
      });
    });

    describe("error when env key is wrong", () => {
      it("should throw an error because the env variable key is not correct", function () {
        process.env[`${ENV_VAR_PREFIX}0_invalidKey`] = "val1";

        expect(() => new VarsManager(TMP_FILE_PATH)).to.throw(
          "Invalid key '0_invalidKey'. Keys can only have alphanumeric characters and underscores, and they cannot start with a number."
        );

        delete process.env[`${ENV_VAR_PREFIX}0_invalidKey`];
      });

      it("should throw an error because the env variable value is not correct", function () {
        process.env[`${ENV_VAR_PREFIX}key_env_1`] = "   "; // space and tab to be sure that spaces are striped correctly

        expect(() => new VarsManager(TMP_FILE_PATH)).to.throw(
          "HH300: Invalid environment variable 'HARDHAT_VAR_key_env_1' with value: '   '"
        );

        delete process.env[`${ENV_VAR_PREFIX}key_env_1`];
      });
    });
  });
});
