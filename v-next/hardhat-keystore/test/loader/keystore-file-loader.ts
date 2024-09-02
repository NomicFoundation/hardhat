import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { remove, writeJsonFile } from "@ignored/hardhat-vnext-utils/fs";
import chalk from "chalk";

import { UnencryptedKeystore } from "../../src/internal/keystores/unencrypted-keystore.js";
import { KeystoreFileLoader } from "../../src/internal/loaders/keystore-file-loader.js";
import { UserInteractions } from "../../src/internal/ui/user-interactions.js";
import { getKeystoreFilePath } from "../../src/internal/utils/get-keystore-file-path.js";
import { getFullOutput } from "../helpers/get-full-output.js";
import { MockUserInterruptionManager } from "../helpers/mock-user-interruption-manager.js";

const TEST_PASSWORD = "Test-password";

describe("unencrypted keystore loader", () => {
  let unencryptedKeystoreLoader: KeystoreFileLoader;
  let interruptions: UserInteractions;
  let mockConsoleWrapper: MockUserInterruptionManager;

  beforeEach(() => {
    mockConsoleWrapper = new MockUserInterruptionManager();
    interruptions = new UserInteractions(mockConsoleWrapper);
  });

  describe("the keystore is not initialized", () => {
    beforeEach(async () => {
      await remove(await getKeystoreFilePath());

      const keystoreFilePath = await getKeystoreFilePath();
      unencryptedKeystoreLoader = new KeystoreFileLoader(
        keystoreFilePath,
        () => new UnencryptedKeystore(interruptions),
      );
    });

    it("should know there is no keystore", async () => {
      assert.equal(await unencryptedKeystoreLoader.exists(), false);
    });

    it("should successfully init the keystore", async () => {
      mockConsoleWrapper.requestSecretInput = async () => TEST_PASSWORD;

      const res = await unencryptedKeystoreLoader.create();

      assert.equal(res instanceof UnencryptedKeystore, true);
      assert.equal(
        getFullOutput(mockConsoleWrapper.displayMessage, 4),
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
        mockConsoleWrapper.displayMessage.mock.calls[4].arguments[1],
        chalk.red("Invalid password!"),
      );
      assert.equal(
        mockConsoleWrapper.displayMessage.mock.calls[5].arguments[1],
        chalk.red("Passwords do not match!"),
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
      unencryptedKeystoreLoader = new KeystoreFileLoader(
        keystoreFilePath,
        () => new UnencryptedKeystore(interruptions),
      );
    });

    it("should know there is a keystore", async () => {
      assert.equal(await unencryptedKeystoreLoader.exists(), true);
    });

    it("should return the keystore on load", async () => {
      assert.notEqual(await unencryptedKeystoreLoader.load(), undefined);
    });
  });
});
