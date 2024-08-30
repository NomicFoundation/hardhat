import assert from "node:assert/strict";
import path from "node:path";
import { beforeEach, describe, it } from "node:test";

import { UnencryptedKeystore } from "../../src/keystores/unencrypted-keystore.js";

const KEYSTORE_FILE_PATH = path.join(
  `${process.cwd()}`,
  "test",
  "fixture-projects",
  "unencrypted-keystore",
  "keystore.json",
);

describe("UnencryptedKeystore", () => {
  let keystore: UnencryptedKeystore;

  beforeEach(() => {
    keystore = new UnencryptedKeystore(
      {
        version: "",
        keys: {
          key1: "value1",
          key2: "value2",
        },
      },
      KEYSTORE_FILE_PATH,
    );
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
