import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { remove, writeJsonFile } from "@ignored/hardhat-vnext-utils/fs";

import { UnencryptedKeystoreLoader } from "../../src/keystores/unencrypted-keystore-loader.js";
import { UnencryptedKeystore } from "../../src/keystores/unencrypted-keystore.js";
import { RawInterruptionsImpl } from "../../src/ui/raw-interruptions.js";
import { getKeystoreFilePath } from "../../src/utils/get-keystore-file-path.js";
import { getFullOutput } from "../helpers/get-full-output.js";
import { MockConsoleWrapper } from "../helpers/mock-console-wrapper.js";

const TEST_PASSWORD = "Test-password";

describe("unencrypted keystore loader", () => {
  let unencryptedKeystoreLoader: UnencryptedKeystoreLoader;
  let interruptions: RawInterruptionsImpl;
  let mockConsoleWrapper: MockConsoleWrapper;

  beforeEach(() => {
    mockConsoleWrapper = new MockConsoleWrapper();
    interruptions = new RawInterruptionsImpl(mockConsoleWrapper);
  });

  describe("the keystore is not initialized", () => {
    beforeEach(async () => {
      await remove(await getKeystoreFilePath());

      const keystoreFilePath = await getKeystoreFilePath();
      unencryptedKeystoreLoader = new UnencryptedKeystoreLoader(
        keystoreFilePath,
        interruptions,
      );
    });

    it("should return `undefined` because there is no keystore", async () => {
      assert.equal(await unencryptedKeystoreLoader.load(), undefined);
    });

    it("should successfully init the keystore", async () => {
      mockConsoleWrapper.requestSecretInput = async () => TEST_PASSWORD;

      const res = await unencryptedKeystoreLoader.create();

      assert.equal(res instanceof UnencryptedKeystore, true);
      assert.equal(
        getFullOutput(mockConsoleWrapper.info, 4),
        `
👷🔐 Hardhat-Keystore 🔐👷

This is the first time you are using the keystore, please set a password.
The password must have at least 8 characters, one uppercase letter, one lowercase letter, and one special character.
`,
      );
    });

    it("should successfully init the keystore but also show password warnings", async () => {
      // Simulate a scenario where:
      // first: a password does not meet the criteria,
      // then: the passwords do not match.
      // The user will eventually correct the password values.
      // The following mock simulate the user's inputs for the password.
      let count = 0;
      mockConsoleWrapper.requestSecretInput = async () => {
        let msg = "";
        if (count === 0) {
          // Step 1: invalid password
          msg = "invalid";
        } else if (count === 1) {
          // Step 2: valid password
          msg = TEST_PASSWORD;
        } else if (count === 2) {
          // Step 3: passwords do not match
          msg = "not-matching-password";
        } else {
          // Step 4: passwords match
          msg = TEST_PASSWORD;
        }
        count++;
        return msg;
      };

      const res = await unencryptedKeystoreLoader.create();

      // Assert that the keystore is successfully initialized
      assert.equal(res instanceof UnencryptedKeystore, true);
      assert.notEqual(await unencryptedKeystoreLoader.load(), undefined);

      // Be sure that the error messages are displayed to the user
      assert.equal(
        mockConsoleWrapper.error.mock.calls[0].arguments[0],
        "Invalid password!",
      );
      assert.equal(
        mockConsoleWrapper.error.mock.calls[1].arguments[0],
        "Passwords do not match!",
      );
    });
  });

  describe("the keystore is initialized", () => {
    beforeEach(async () => {
      await writeJsonFile(await getKeystoreFilePath(), {
        version: "",
        keys: {
          key1: "value1",
        },
      });

      const keystoreFilePath = await getKeystoreFilePath();
      unencryptedKeystoreLoader = new UnencryptedKeystoreLoader(
        keystoreFilePath,
        interruptions,
      );
    });

    it("should return the keystore on load", async () => {
      assert.notEqual(await unencryptedKeystoreLoader.load(), undefined);
    });
  });
});
