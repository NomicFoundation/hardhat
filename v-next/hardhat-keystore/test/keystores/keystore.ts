import type { Keystore as KeystoreI } from "../../src/internal/types.js";

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import {
  addSecretToKeystore,
  createEmptyEncryptedKeystore,
  createMasterKey,
} from "../../src/internal/keystores/encryption.js";
import { Keystore } from "../../src/internal/keystores/keystore.js";
import { TEST_PASSWORD } from "../helpers/test-password.js";

describe("Keystore", () => {
  describe("when the keystore is valid", () => {
    let keystore: KeystoreI;
    let masterKey: Uint8Array;
    let salt: Uint8Array;

    beforeEach(() => {
      ({ masterKey, salt } = createMasterKey({
        password: TEST_PASSWORD,
      }));

      let keystoreFile = createEmptyEncryptedKeystore({ masterKey, salt });

      const secrets = [
        {
          key: "key1",
          value: "value1",
        },
        {
          key: "key2",
          value: "value2",
        },
      ];

      for (const secret of secrets) {
        keystoreFile = addSecretToKeystore({
          masterKey,
          encryptedKeystore: keystoreFile,
          key: secret.key,
          value: secret.value,
        });
      }

      keystore = new Keystore(keystoreFile);
    });

    it("should list the keys", async () => {
      assert.deepEqual(await keystore.listUnverifiedKeys(), ["key1", "key2"]);
    });

    it("should read a value", async () => {
      assert.equal(await keystore.readValue("key1", masterKey), "value1");
    });

    it("should remove a key", async () => {
      // Be sure that the key exists
      assert.equal(await keystore.readValue("key1", masterKey), "value1");

      await keystore.removeKey("key1", masterKey);

      // Be sure the key has been deleted
      assert.ok(
        !(await keystore.hasKey("key1", masterKey)),
        "The key should not exist",
      );
    });

    it("should add a new value", async () => {
      // Be sure that the key does not exist
      assert.ok(
        !(await keystore.hasKey("new-key", masterKey)),
        "The key should not exist",
      );

      await keystore.addNewValue("new-key", "new-value", masterKey);

      // Be sure the key has been added
      assert.equal(await keystore.readValue("new-key", masterKey), "new-value");
    });
  });
});
