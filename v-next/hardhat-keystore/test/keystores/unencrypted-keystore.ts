import type { Keystore } from "../../src/internal/types.js";

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { UnencryptedKeystore } from "../../src/internal/keystores/unencrypted-keystore.js";

describe("UnencryptedKeystore", () => {
  describe("when the keystore is valid", () => {
    let keystore: Keystore;

    beforeEach(() => {
      const keystoreFile =
        UnencryptedKeystore.createEmptyUnencryptedKeystoreFile();

      keystoreFile.keys = {
        key1: "value1",
        key2: "value2",
      };

      keystore = new UnencryptedKeystore(keystoreFile);
    });

    it("should list the keys", async () => {
      assert.deepEqual(await keystore.listKeys(), ["key1", "key2"]);
    });

    it("should read a value", async () => {
      assert.equal(await keystore.readValue("key1"), "value1");
      assert.equal(await keystore.readValue("unknown"), undefined);
    });

    it("should remove a key", async () => {
      // Be sure that the key exists
      assert.equal(await keystore.readValue("key1"), "value1");

      await keystore.removeKey("key1");

      // Be sure the key has been deleted
      assert.equal(await keystore.readValue("key1"), undefined);
    });

    it("should add a new value", async () => {
      // Be sure that the key does not exist
      assert.equal(await keystore.readValue("new-key"), undefined);

      await keystore.addNewValue("new-key", "new-value");

      // Be sure the key has been added
      assert.equal(await keystore.readValue("new-key"), "new-value");
    });
  });

  describe.skip("when the keystore is invalid", () => {
    it("should throw an error because the keystore file format is invalid", async () => {
      await assertRejectsWithHardhatError(
        async () => {
          // new KeystoreFileLoader.();
        },
        HardhatError.ERRORS.KEYSTORE.INVALID_KEYSTORE_FILE_FORMAT,
        {},
      );
    });
  });
});
