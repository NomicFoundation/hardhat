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
      },
    });

    varsManagerSetup = new VarsManagerSetup(TMP_FILE_PATH);
  });

  //
  // getRequiredVarsAlreadySet, getOptionalVarsAlreadySet, getRequiredVarsToSet and getOptionalVarsToSet are tested when testing the functions has and get
  //

  describe("has", () => {
    it("should have keys only in the _optionalVarsAlreadySet array", () => {
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

    it("should have keys only in the _optionalVarsToSet array", () => {
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

  describe("get", () => {
    it("should have keys only in the _requiredVarsAlreadySet array", () => {
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

    it("should have keys only in the _requiredVarsToSet array", () => {
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
      it("should have the key in the _requiredVarsAlreadySet array", () => {
        varsManagerSetup.get("key1", "defaultValue");

        assert.deepEqual(varsManagerSetup.getRequiredVarsAlreadySet(), [
          "key1",
        ]);
        assert.deepEqual(varsManagerSetup.getOptionalVarsAlreadySet(), []);

        assert.deepEqual(varsManagerSetup.getRequiredVarsToSet(), []);
        assert.deepEqual(varsManagerSetup.getOptionalVarsToSet(), []);
      });

      it("should have keys in the _optionalVarsToSet array", () => {
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

  describe("has and get order priority", () => {
    it("should have keys only in the _requiredVarsAlreadySet array", () => {
      varsManagerSetup.has("key1");
      varsManagerSetup.get("key1");

      varsManagerSetup.get("key2");
      varsManagerSetup.has("key2");

      assert.deepEqual(varsManagerSetup.getRequiredVarsAlreadySet(), [
        "key1",
        "key2",
      ]);
      assert.deepEqual(varsManagerSetup.getOptionalVarsAlreadySet(), []);

      assert.deepEqual(varsManagerSetup.getRequiredVarsToSet(), []);
      assert.deepEqual(varsManagerSetup.getOptionalVarsToSet(), []);
    });

    it("should have keys only in the _requiredVarsToSet array", () => {
      varsManagerSetup.has("nonExistingKey1");
      varsManagerSetup.get("nonExistingKey1");

      varsManagerSetup.get("nonExistingKey2");
      varsManagerSetup.has("nonExistingKey2");

      assert.deepEqual(varsManagerSetup.getRequiredVarsAlreadySet(), []);
      assert.deepEqual(varsManagerSetup.getOptionalVarsAlreadySet(), []);

      assert.deepEqual(varsManagerSetup.getRequiredVarsToSet(), [
        "nonExistingKey1",
        "nonExistingKey2",
      ]);
      assert.deepEqual(varsManagerSetup.getOptionalVarsToSet(), []);
    });

    describe("default value", () => {
      it("should have keys in the _requiredVarsToSet", () => {
        // The second get should overwrite the first optional one (optional because of the default value)
        varsManagerSetup.get("nonExistingKey", "defaultValue");

        assert.deepEqual(varsManagerSetup.getRequiredVarsToSet(), []);
        assert.deepEqual(varsManagerSetup.getOptionalVarsToSet(), [
          "nonExistingKey",
        ]);

        // Overwrite the first get
        varsManagerSetup.get("nonExistingKey");

        assert.deepEqual(varsManagerSetup.getRequiredVarsAlreadySet(), []);
        assert.deepEqual(varsManagerSetup.getOptionalVarsAlreadySet(), []);

        assert.deepEqual(varsManagerSetup.getRequiredVarsToSet(), [
          "nonExistingKey",
        ]);
        assert.deepEqual(varsManagerSetup.getOptionalVarsToSet(), []);
      });
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

    describe("hasWithEnvVars has the same behavior as has", () => {
      it("should return the same value", () => {
        expect(varsManagerSetup.hasWithEnvVars(KEY)).to.equal(
          varsManagerSetup.has(KEY)
        );
      });
    });

    describe("getWithEnvVars has the same behavior as has", () => {
      it("should return the same value", () => {
        expect(varsManagerSetup.getWithEnvVars(KEY)).to.equal(
          varsManagerSetup.get(KEY)
        );
      });
    });
  });
});
