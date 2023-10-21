import "mocha";
import fs from "fs-extra";
import { assert } from "chai";
import * as os from "os";
import { VarsManagerSetup } from "../../../../src/internal/core/vars/vars-manager-setup";

describe("VarsManagerSetup", function () {
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
  // getOptionalVarsKeys and getRequiredVarsKeys are tested when testing the functions has and get
  //

  describe("has", function () {
    it("should not add keys to the optional or required vars if they are already present", function () {
      varsManagerSetup.has("key1");
      varsManagerSetup.has("key2");

      assert.deepEqual(varsManagerSetup.getOptionalVarsKeys(), []);
      assert.deepEqual(varsManagerSetup.getRequiredVarsKeys(), []);
    });

    it("should not add a key to the optional keys if it is already present in the required keys", function () {
      varsManagerSetup.get("nonExistingKey");
      varsManagerSetup.has("nonExistingKey");

      assert.deepEqual(varsManagerSetup.getRequiredVarsKeys(), [
        "nonExistingKey",
      ]);
      assert.deepEqual(varsManagerSetup.getOptionalVarsKeys(), []);
    });

    it("should add a key to the optional keys if the key is not stored", function () {
      varsManagerSetup.has("nonExistingKey");

      assert.deepEqual(varsManagerSetup.getRequiredVarsKeys(), []);
      assert.deepEqual(varsManagerSetup.getOptionalVarsKeys(), [
        "nonExistingKey",
      ]);
    });
  });

  describe("get", function () {
    it("should not add keys to the optional or required vars if they are already present", function () {
      varsManagerSetup.get("key3");
      varsManagerSetup.get("key4");

      assert.deepEqual(varsManagerSetup.getOptionalVarsKeys(), []);
      assert.deepEqual(varsManagerSetup.getRequiredVarsKeys(), []);
    });

    it("should add a key to the required keys if it is already present in the optional keys and remove it from the optional keys", function () {
      varsManagerSetup.has("nonExistingKey");
      assert.deepEqual(varsManagerSetup.getOptionalVarsKeys(), [
        "nonExistingKey",
      ]);

      varsManagerSetup.get("nonExistingKey");

      assert.deepEqual(varsManagerSetup.getRequiredVarsKeys(), [
        "nonExistingKey",
      ]);
      assert.deepEqual(varsManagerSetup.getOptionalVarsKeys(), []);
    });

    it("should add a key to the required keys if the key is not stored", function () {
      varsManagerSetup.get("nonExistingKey");

      assert.deepEqual(varsManagerSetup.getRequiredVarsKeys(), [
        "nonExistingKey",
      ]);
      assert.deepEqual(varsManagerSetup.getOptionalVarsKeys(), []);
    });

    it("should add a key to the optional keys if the default value is specified", function () {
      varsManagerSetup.get("nonExistingKey", "defaultValue");

      assert.deepEqual(varsManagerSetup.getRequiredVarsKeys(), []);
      assert.deepEqual(varsManagerSetup.getOptionalVarsKeys(), [
        "nonExistingKey",
      ]);
    });
  });
});
