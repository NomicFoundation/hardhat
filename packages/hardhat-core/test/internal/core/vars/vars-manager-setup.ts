import "mocha";
import fs from "fs-extra";
import { assert, expect } from "chai";
import * as os from "os";
import { VarsManagerSetup } from "../../../../src/internal/core/vars/vars-manager-setup";

describe("VarsManagerSetup", () => {
  const TMP_FILE_PATH = `${os.tmpdir()}/test-vars.json`;
  let varsManagerSetup: VarsManagerSetup;

  beforeEach(() => {
    fs.removeSync(TMP_FILE_PATH);

    fs.writeJSONSync(TMP_FILE_PATH, {
      _format: "test",
      vars: {
        key1: { value: "val1" },
        key2: { value: "val2" },
        key3: { value: "val3" },
        key4: { value: "val4" },
        key5: { value: "val5" },
        key6: { value: "val6" },
        key7: { value: "val7" },
      },
    });

    varsManagerSetup = new VarsManagerSetup(TMP_FILE_PATH);
  });

  //
  // getRequiredVarsAlreadySet, getOptionalVarsAlreadySet, getRequiredVarsToSet and getOptionalVarsToSet are tested when testing the functions has and get
  //

  describe("has - basic operations", () => {
    it("should return keys only with the function getOptionalVarsAlreadySet", () => {
      varsManagerSetup.has("key1");
      varsManagerSetup.has("key2");

      assert.deepEqual(varsManagerSetup.getRequiredVarsAlreadySet(), []);
      assert.deepEqual(varsManagerSetup.getOptionalVarsAlreadySet(), [
        "key1",
        "key2",
      ]);

      assert.deepEqual(varsManagerSetup.getRequiredVarsToSet(), []);
      assert.deepEqual(varsManagerSetup.getOptionalVarsToSet(), []);
    });

    it("should return keys only with the function getOptionalVarsToSet", () => {
      varsManagerSetup.has("nonExistingKey1");
      varsManagerSetup.has("nonExistingKey2");

      assert.deepEqual(varsManagerSetup.getRequiredVarsAlreadySet(), []);
      assert.deepEqual(varsManagerSetup.getOptionalVarsAlreadySet(), []);

      assert.deepEqual(varsManagerSetup.getRequiredVarsToSet(), []);
      assert.deepEqual(varsManagerSetup.getOptionalVarsToSet(), [
        "nonExistingKey1",
        "nonExistingKey2",
      ]);
    });
  });

  describe("get - basic operations", () => {
    it("should return keys only with the function getRequiredVarsAlreadySet", () => {
      varsManagerSetup.get("key1");
      varsManagerSetup.get("key2");

      assert.deepEqual(varsManagerSetup.getRequiredVarsAlreadySet(), [
        "key1",
        "key2",
      ]);
      assert.deepEqual(varsManagerSetup.getOptionalVarsAlreadySet(), []);

      assert.deepEqual(varsManagerSetup.getRequiredVarsToSet(), []);
      assert.deepEqual(varsManagerSetup.getOptionalVarsToSet(), []);
    });

    it("should return keys only with the function getRequiredVarsToSet", () => {
      varsManagerSetup.get("nonExistingKey1");
      varsManagerSetup.get("nonExistingKey2");

      assert.deepEqual(varsManagerSetup.getRequiredVarsAlreadySet(), []);
      assert.deepEqual(varsManagerSetup.getOptionalVarsAlreadySet(), []);

      assert.deepEqual(varsManagerSetup.getRequiredVarsToSet(), [
        "nonExistingKey1",
        "nonExistingKey2",
      ]);
      assert.deepEqual(varsManagerSetup.getOptionalVarsToSet(), []);
    });

    describe("default values is passed", () => {
      it("should return keys only with the function getOptionalVarsAlreadySet", () => {
        varsManagerSetup.get("key1", "defaultValue");

        assert.deepEqual(varsManagerSetup.getRequiredVarsAlreadySet(), []);
        assert.deepEqual(varsManagerSetup.getOptionalVarsAlreadySet(), [
          "key1",
        ]);

        assert.deepEqual(varsManagerSetup.getRequiredVarsToSet(), []);
        assert.deepEqual(varsManagerSetup.getOptionalVarsToSet(), []);
      });

      it("should return keys only with the function getOptionalVarsToSet", () => {
        varsManagerSetup.get("nonExistingKey", "defaultValue");

        assert.deepEqual(varsManagerSetup.getRequiredVarsAlreadySet(), []);
        assert.deepEqual(varsManagerSetup.getOptionalVarsAlreadySet(), []);

        assert.deepEqual(varsManagerSetup.getRequiredVarsToSet(), []);
        assert.deepEqual(varsManagerSetup.getOptionalVarsToSet(), [
          "nonExistingKey",
        ]);
      });
    });
  });

  describe("mix of optional and required variables", () => {
    /**
     * How to calculate required and optional variables:
     *
     * G = get function
     * H = has function
     * GD = get function with default value
     *
     * optional variables = H + (GD - G)
     * required variables = G - H
     */

    it("should return keys only for the already set variables", () => {
      varsManagerSetup.has("key1");
      varsManagerSetup.has("key2");
      varsManagerSetup.has("key3");

      varsManagerSetup.get("key1");
      varsManagerSetup.get("key2");
      varsManagerSetup.get("key6");
      varsManagerSetup.get("key7");
      varsManagerSetup.get("key3");

      varsManagerSetup.get("key1", "defaultValue1");
      varsManagerSetup.get("key5", "defaultValue5");
      varsManagerSetup.get("key6", "defaultValue6");

      assert.deepEqual(varsManagerSetup.getRequiredVarsAlreadySet(), [
        "key6",
        "key7",
      ]);
      assert.deepEqual(varsManagerSetup.getOptionalVarsAlreadySet(), [
        "key1",
        "key2",
        "key3",
        "key5",
      ]);

      assert.deepEqual(varsManagerSetup.getRequiredVarsToSet(), []);
      assert.deepEqual(varsManagerSetup.getOptionalVarsToSet(), []);
    });

    it("should return keys only for the variables that need to be set", () => {
      varsManagerSetup.has("nonExistingKey1");
      varsManagerSetup.has("nonExistingKey2");
      varsManagerSetup.has("nonExistingKey3");

      varsManagerSetup.get("nonExistingKey1");
      varsManagerSetup.get("nonExistingKey2");
      varsManagerSetup.get("nonExistingKey6");
      varsManagerSetup.get("nonExistingKey7");
      varsManagerSetup.get("nonExistingKey3");

      varsManagerSetup.get("nonExistingKey1", "defaultValue1");
      varsManagerSetup.get("nonExistingKey5", "defaultValue5");
      varsManagerSetup.get("nonExistingKey6", "defaultValue6");

      assert.deepEqual(varsManagerSetup.getRequiredVarsAlreadySet(), []);
      assert.deepEqual(varsManagerSetup.getOptionalVarsAlreadySet(), []);

      assert.deepEqual(varsManagerSetup.getRequiredVarsToSet(), [
        "nonExistingKey6",
        "nonExistingKey7",
      ]);
      assert.deepEqual(varsManagerSetup.getOptionalVarsToSet(), [
        "nonExistingKey1",
        "nonExistingKey2",
        "nonExistingKey3",
        "nonExistingKey5",
      ]);
    });
  });

  describe("env variables are present", () => {
    const ENV_VAR_PREFIX = "HARDHAT_VAR_";
    const KEY = "key_env_1";

    beforeEach(() => {
      process.env[`${ENV_VAR_PREFIX}${KEY}`] = "val1";
    });

    afterEach(() => {
      delete process.env[`${ENV_VAR_PREFIX}${KEY}`];
    });

    it("should return false, env vars should be ignored during setup", () => {
      expect(varsManagerSetup.has(KEY)).to.equal(false);
    });

    it("should return an empty string, env vars should be ignored during setup", () => {
      expect(varsManagerSetup.get(KEY)).to.equal("");
    });

    it("should return an the default value, env vars should be ignored during setup", () => {
      expect(varsManagerSetup.get(KEY, "defaultValue")).to.equal(
        "defaultValue"
      );
    });
  });
});
