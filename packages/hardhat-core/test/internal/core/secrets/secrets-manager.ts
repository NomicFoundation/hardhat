import fs from "fs-extra";
import { expect } from "chai";
import { SecretsManager } from "../../../../src/internal/core/secrets/secrets-manager";

const TMP_FILE_PATH = `${__dirname}/test-secrets.json`;

let secretsManager: SecretsManager;

describe("SecretsManager", function () {
  beforeEach(() => {
    fs.removeSync(TMP_FILE_PATH);
    secretsManager = new SecretsManager(TMP_FILE_PATH);
  });

  //
  // For deep testing of the set, get, list and delete methods, see the last test
  //

  describe("format", function () {
    it("should contain the _format property and it should have a valid value", function () {
      const format = fs.readJSONSync(TMP_FILE_PATH)._format;

      expect(format).to.not.equal(undefined);
      expect(format.length).to.be.greaterThan(0);
    });
  });

  describe("set", function () {
    it("should throw if the key is invalid", function () {
      expect(() => secretsManager.set("invalid key", "value")).to.throw(
        "HH316: Invalid value 'invalid key' for argument key. The argument should match the following regex expression: /^[a-zA-Z_]+[a-zA-Z0-9_]*$/"
      );

      expect(() => secretsManager.set("0key", "value")).to.throw(
        "HH316: Invalid value '0key' for argument key. The argument should match the following regex expression: /^[a-zA-Z_]+[a-zA-Z0-9_]*$/"
      );

      expect(() => secretsManager.set("invalid!", "value")).to.throw(
        "HH316: Invalid value 'invalid!' for argument key. The argument should match the following regex expression: /^[a-zA-Z_]+[a-zA-Z0-9_]*$/"
      );
    });
  });

  describe("the json file should match all the operations performed with the secrets", function () {
    function performOperations() {
      secretsManager.set("key1", "value1");
      secretsManager.set("key2", "value2");
      secretsManager.set("key3", "value3");

      secretsManager.delete("key1");
      secretsManager.delete("non-existent");

      secretsManager.set("key4", "value4");
      secretsManager.set("key5", "value5");

      secretsManager.delete("key5");
    }

    it("should match", function () {
      performOperations();

      const secrets = fs.readJSONSync(TMP_FILE_PATH).secrets;
      expect(secrets).to.deep.equal({
        key2: { value: "value2" },
        key3: { value: "value3" },
        key4: { value: "value4" },
      });
    });

    it("should match after reloading the secrets manager (json file is persistent in storage)", function () {
      performOperations();

      const newSecretsManager = new SecretsManager(TMP_FILE_PATH);

      expect(newSecretsManager.get("key1")).to.equal(undefined);
      expect(newSecretsManager.get("key2")).to.equal("value2");
      expect(newSecretsManager.get("key3")).to.equal("value3");
      expect(newSecretsManager.get("key4")).to.equal("value4");
      expect(newSecretsManager.get("key5")).to.equal(undefined);
    });
  });

  describe("test all methods (set, get, list and delete)", function () {
    it("should execute all methods correctly", function () {
      // set
      secretsManager.set("key1", "value1");
      secretsManager.set("key2", "value2");
      secretsManager.set("key3", "value3");

      // delete
      expect(secretsManager.delete("key1")).to.equal(true);
      expect(secretsManager.delete("non-existent")).to.equal(false);

      // get
      expect(secretsManager.get("key1")).to.equal(undefined);
      expect(secretsManager.get("key2")).to.equal("value2");
      expect(secretsManager.get("key3")).to.equal("value3");

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
      secretsManager.set("key1", "value1");
      secretsManager.set("key4", "value4");
      secretsManager.set("key5", "value5");

      // list
      expect(secretsManager.list()).to.deep.equal(["key1", "key4", "key5"]);

      // get
      expect(secretsManager.get("key1")).to.equal("value1");
      expect(secretsManager.get("key4")).to.equal("value4");
      expect(secretsManager.get("key5")).to.equal("value5");
    });
  });
});
