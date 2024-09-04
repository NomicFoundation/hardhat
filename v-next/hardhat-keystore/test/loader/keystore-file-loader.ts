import type { UnencryptedKeystoreFile } from "../../src/internal/types.js";

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import chalk from "chalk";

import { createUnencryptedKeystoreFile } from "../../src/internal/keystores/unencrypted-keystore-file.js";
import { UnencryptedKeystore } from "../../src/internal/keystores/unencrypted-keystore.js";
import { KeystoreFileLoader } from "../../src/internal/loaders/keystore-file-loader.js";
import { getFullOutput } from "../helpers/get-full-output.js";
import { MockFileManager } from "../helpers/mock-file-manager.js";
import { MockUserInterruptionManager } from "../helpers/mock-user-interruption-manager.js";

const TEST_PASSWORD = "Test-password";

describe.skip("unencrypted keystore loader", () => {
  let keystoreFileLoader: KeystoreFileLoader;
  let mockFileManager: MockFileManager;
  let mockUserInterruptionManager: MockUserInterruptionManager;

  beforeEach(() => {
    mockUserInterruptionManager = new MockUserInterruptionManager();
    mockFileManager = new MockFileManager();
  });

  describe("the keystore is not initialized", () => {
    beforeEach(async () => {
      keystoreFileLoader = new KeystoreFileLoader(
        "./example-keystore.json",
        mockFileManager,
        () => new UnencryptedKeystore(),
      );
    });

    it("should know there is no keystore", async () => {
      assert.equal(await keystoreFileLoader.exists(), false);
    });

    it("should successfully init the keystore", async () => {
      mockUserInterruptionManager.requestSecretInput = async () =>
        TEST_PASSWORD;

      const res = await keystoreFileLoader.create();

      assert.equal(res instanceof UnencryptedKeystore, true);
      assert.equal(
        getFullOutput(mockUserInterruptionManager.displayMessage, 4),
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
      mockUserInterruptionManager.requestSecretInput = async () => {
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

      const res = await keystoreFileLoader.create();

      // Assert that the keystore is successfully initialized
      assert.equal(res instanceof UnencryptedKeystore, true);
      assert.notEqual(await keystoreFileLoader.load(), undefined);

      // Be sure that the error messages are displayed to the user
      assert.equal(
        mockUserInterruptionManager.displayMessage.mock.calls[4].arguments[1],
        chalk.red("Invalid password!"),
      );
      assert.equal(
        mockUserInterruptionManager.displayMessage.mock.calls[5].arguments[1],
        chalk.red("Passwords do not match!"),
      );
    });
  });

  describe("the keystore is initialized", () => {
    let exampleKeystoreFile: UnencryptedKeystoreFile;

    beforeEach(async () => {
      exampleKeystoreFile = createUnencryptedKeystoreFile();

      mockFileManager.setKeystoreFile(exampleKeystoreFile);

      keystoreFileLoader = new KeystoreFileLoader(
        "./example-keystore.json",
        mockFileManager,
        () => new UnencryptedKeystore(),
      );
    });

    it("should know there is a keystore", async () => {
      assert.equal(await keystoreFileLoader.exists(), true);
    });

    it("should return the keystore on load", async () => {
      const loadedKeystore = await keystoreFileLoader.load();

      assert.deepEqual(
        loadedKeystore.toJSON(),
        exampleKeystoreFile,
        "Keystore on disk and loaded version should be the same",
      );
    });
  });
});
