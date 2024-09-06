import type { Keystore } from "../../src/internal/types.js";

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

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
    });

    it("should remove a key", async () => {
      // Be sure that the key exists
      assert.equal(await keystore.readValue("key1"), "value1");

      await keystore.removeKey("key1");

      // Be sure the key has been deleted
      assert.ok(!(await keystore.hasKey("key1")), "The key should not exist");
    });

    it("should add a new value", async () => {
      // Be sure that the key does not exist
      assert.ok(
        !(await keystore.hasKey("new-key")),
        "The key should not exist",
      );

      await keystore.addNewValue("new-key", "new-value");

      // Be sure the key has been added
      assert.equal(await keystore.readValue("new-key"), "new-value");
    });
  });
});
