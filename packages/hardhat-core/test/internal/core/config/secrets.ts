import { expect } from "chai";
import fs from "fs-extra";
import * as os from "os";
import { secrets } from "../../../../src/internal/core/config/config-env";
import { SecretsManager } from "../../../../src/internal/core/secrets/secrets-manager";
import { HardhatContext } from "../../../../src/internal/context";

describe("secrets", function () {
  const TMP_FILE_PATH = `${os.tmpdir()}/test-secrets.json`;
  let ctx: HardhatContext;

  before(() => {
    ctx = HardhatContext.createHardhatContext();
  });

  beforeEach(() => {
    fs.removeSync(TMP_FILE_PATH);
    ctx.secretManager = new SecretsManager(TMP_FILE_PATH);

    ctx.secretManager.set("key1", "val1");
  });

  describe("hasSecret", function () {
    it("should return true if the key exists", function () {
      expect(secrets.has("key1")).to.equal(true);
    });

    it("should return false if the key does not exist", function () {
      expect(secrets.has("non-existing")).to.equal(false);
    });
  });

  describe("getSecret", function () {
    it("should return the value associated to the key", function () {
      expect(secrets.get("key1")).to.equal("val1");
    });

    it("should return the default value for the secret because the key is not found", function () {
      expect(secrets.get("nonExistingKey", "defaultValue")).to.equal(
        "defaultValue"
      );
    });

    it("should throw an error if the key does not exist and no default value is set", function () {
      expect(() => secrets.get("nonExistingKey")).to.throw(
        "HH1201: Cannot find a secret value associated to the key 'nonExistingKey'"
      );
    });
  });
});
