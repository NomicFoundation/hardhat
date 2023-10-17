import fs from "fs-extra";
import { expect } from "chai";
import * as os from "os";
import { SecretsManager } from "../../../../src/internal/core/secrets/secrets-manager";

describe("SecretsManager", function () {
  let TMP_FILE_PATH: string;
  let secretsManager: SecretsManager;

  beforeEach(() => {
    TMP_FILE_PATH = `${os.tmpdir()}/test-secrets.json`;
    fs.removeSync(TMP_FILE_PATH);

    secretsManager = new SecretsManager(TMP_FILE_PATH);
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
      expect(secretsManager.getStoragePath()).to.equal(TMP_FILE_PATH);
    });
  });

  describe("set", function () {
    it("should throw if the key is invalid", function () {
      expect(() => secretsManager.set("invalid key", "val")).to.throw(
        "HH1203: Invalid key 'invalid key'. Keys can only have alphanumeric characters and underscores, and they cannot start with a number."
      );

      expect(() => secretsManager.set("0key", "val")).to.throw(
        "HH1203: Invalid key '0key'. Keys can only have alphanumeric characters and underscores, and they cannot start with a number."
      );

      expect(() => secretsManager.set("invalid!", "val")).to.throw(
        "HH1203: Invalid key 'invalid!'. Keys can only have alphanumeric characters and underscores, and they cannot start with a number."
      );
    });
  });

  describe("the json file should match all the operations performed with the secrets", function () {
    function performOperations() {
      secretsManager.set("key1", "val1");
      secretsManager.set("key2", "val2");
      secretsManager.set("key3", "val3");

      secretsManager.delete("key1");
      secretsManager.delete("non-existent");

      secretsManager.set("key4", "val4");
      secretsManager.set("key5", "val5");

      secretsManager.delete("key5");
    }

    it("should match", function () {
      performOperations();

      const secrets = fs.readJSONSync(TMP_FILE_PATH).secrets;
      expect(secrets).to.deep.equal({
        key2: { value: "val2" },
        key3: { value: "val3" },
        key4: { value: "val4" },
      });
    });

    it("should match after reloading the secrets manager (json file is persistent in storage)", function () {
      performOperations();

      const newSecretsManager = new SecretsManager(TMP_FILE_PATH);

      expect(newSecretsManager.get("key1")).to.equal(undefined);
      expect(newSecretsManager.get("key2")).to.equal("val2");
      expect(newSecretsManager.get("key3")).to.equal("val3");
      expect(newSecretsManager.get("key4")).to.equal("val4");
      expect(newSecretsManager.get("key5")).to.equal(undefined);
    });
  });

  describe("test all methods (set, get, list and delete)", function () {
    it("should execute all methods correctly", function () {
      // set
      secretsManager.set("key1", "val1");
      secretsManager.set("key2", "val2");
      secretsManager.set("key3", "val3");

      // has
      expect(secretsManager.has("key1")).to.equal(true);
      expect(secretsManager.has("key4")).to.equal(false);

      // delete
      expect(secretsManager.delete("key1")).to.equal(true);
      expect(secretsManager.delete("non-existent")).to.equal(false);

      // get
      expect(secretsManager.get("key1")).to.equal(undefined);
      expect(secretsManager.get("key2")).to.equal("val2");
      expect(secretsManager.get("key3")).to.equal("val3");

      // list
      expect(secretsManager.list()).to.deep.equal(["key2", "key3"]);

      // delete
      expect(secretsManager.delete("key2")).to.equal(true);
      expect(secretsManager.delete("key3")).to.equal(true);

      // list
      expect(secretsManager.list()).to.deep.equal([]);

      // get
      expect(secretsManager.get("key3")).to.equal(undefined);

      // set
      secretsManager.set("key1", "val1");
      secretsManager.set("key4", "val4");
      secretsManager.set("key5", "val5");

      // list
      expect(secretsManager.list()).to.deep.equal(["key1", "key4", "key5"]);

      // get
      expect(secretsManager.get("key1")).to.equal("val1");
      expect(secretsManager.get("key4")).to.equal("val4");
      expect(secretsManager.get("key5")).to.equal("val5");
    });
  });

  describe("load secrets from environment variables", function () {
    const ENV_VAR_PREFIX = "HARDHAT_SECRET_";

    beforeEach(() => {
      process.env[`${ENV_VAR_PREFIX}key_env_1`] = "val1";
      secretsManager = new SecretsManager(TMP_FILE_PATH);
    });

    it("should load the key-value pairs from the environment variables", function () {
      expect(secretsManager.get("key_env_1")).to.equal("val1");
    });

    it("should not store the env variable in the file but only in the cache", function () {
      const secrets = fs.readJSONSync(TMP_FILE_PATH).secrets;
      expect(secrets).to.deep.equal({});
    });

    describe("error when env key is wrong", () => {
      it("should throw an error because the env variable key is not correct", function () {
        process.env[`${ENV_VAR_PREFIX}0_invalidKey`] = "val1";

        expect(() => new SecretsManager(TMP_FILE_PATH)).to.throw(
          "Invalid key '0_invalidKey'. Keys can only have alphanumeric characters and underscores, and they cannot start with a number."
        );

        delete process.env[`${ENV_VAR_PREFIX}0_invalidKey`];
      });

      it("should throw an error because the env variable value is not correct", function () {
        process.env[`${ENV_VAR_PREFIX}env_key1`] = "";

        expect(() => new SecretsManager(TMP_FILE_PATH)).to.throw(
          "HH300: Invalid environment variable 'HARDHAT_SECRET_env_key1' with value: ''"
        );
      });
    });
  });
});
