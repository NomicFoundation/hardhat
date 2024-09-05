import type { KeystoreLoader } from "../../src/internal/types.js";

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import chalk from "chalk";

import { KeystoreFileLoader } from "../../src/internal/loaders/keystore-file-loader.js";
import { set } from "../../src/internal/tasks/set.js";
import { UserInteractions } from "../../src/internal/ui/user-interactions.js";
import { MockFileManager } from "../helpers/mock-file-manager.js";
import { MockUserInterruptionManager } from "../helpers/mock-user-interruption-manager.js";

const fakeKeystoreFilePath = "./fake-keystore-path.json";

describe("tasks - set", () => {
  let mockFileManager: MockFileManager;
  let mockUserInterruptionManager: MockUserInterruptionManager;

  let userInteractions: UserInteractions;
  let keystoreLoader: KeystoreLoader;

  beforeEach(() => {
    mockFileManager = new MockFileManager();
    mockUserInterruptionManager = new MockUserInterruptionManager();

    userInteractions = new UserInteractions(mockUserInterruptionManager);
    keystoreLoader = new KeystoreFileLoader(
      fakeKeystoreFilePath,
      mockFileManager,
    );
  });

  describe("a successful `set`", () => {
    beforeEach(async () => {
      mockUserInterruptionManager.requestSecretInput = async () => "myValue2";

      await set(
        {
          key: "myKey",
          force: false,
        },
        keystoreLoader,
        userInteractions,
      );
    });

    it("should display a message that the key was set", async () => {
      assert.equal(
        mockUserInterruptionManager.displayMessage.mock.calls[0].arguments[1],
        `Key "myKey" set`,
      );
    });

    it("should save the updated keystore to file", async () => {
      const keystoreFile =
        await mockFileManager.readJsonFile(fakeKeystoreFilePath);

      assert.deepEqual(
        keystoreFile.keys,
        { myKey: "myValue2" },
        "keystore should have been saved with update",
      );
    });
  });

  describe("an unforced `set` on an existing key", async () => {
    beforeEach(async () => {
      mockFileManager.setupExistingKeystoreFile({ key: "oldValue" });

      mockUserInterruptionManager.requestSecretInput = async () => "newValue";

      await set({ key: "key", force: false }, keystoreLoader, userInteractions);
    });

    it("should warn that the key already exists", async () => {
      assert.equal(
        mockUserInterruptionManager.displayMessage.mock.calls[0].arguments[1],
        chalk.yellow(
          `The key "key" already exists. Use the ${chalk.blue.italic("--force")} flag to overwrite it.`,
        ),
      );
    });

    it("should not update the value in the keystore", async () => {
      const keystoreFile =
        await mockFileManager.readJsonFile(fakeKeystoreFilePath);

      assert.deepEqual(
        keystoreFile.keys,
        { key: "oldValue" },
        "keystore should not have been updated with the new value",
      );
    });
  });

  describe("a forced `set` with a new value", async () => {
    beforeEach(async () => {
      mockFileManager.setupExistingKeystoreFile({ key: "oldValue" });

      mockUserInterruptionManager.requestSecretInput = async () => "newValue";
      await set({ key: "key", force: true }, keystoreLoader, userInteractions);
    });

    it("should display a message that the key was updated", async () => {
      assert.equal(
        mockUserInterruptionManager.displayMessage.mock.calls[0].arguments[1],
        'Key "key" set',
      );
    });

    it("should modify an existing value because the flag --force is passed", async () => {
      const keystoreFile =
        await mockFileManager.readJsonFile(fakeKeystoreFilePath);

      assert.deepEqual(
        keystoreFile.keys,
        { key: "newValue" },
        "keystore should have been updated with the new value",
      );
    });
  });

  describe("`set` with an invalid key", async () => {
    beforeEach(async () => {
      mockFileManager.setupExistingKeystoreFile({ key: "value" });

      await set(
        { key: "1key", force: false },
        keystoreLoader,
        userInteractions,
      );
    });

    it("should display a message that the key is not valid", async () => {
      assert.equal(
        mockUserInterruptionManager.displayMessage.mock.calls[0].arguments[1],
        chalk.red(
          `Invalid value for key: "1key". Keys can only have alphanumeric characters and underscores, and they cannot start with a number.`,
        ),
      );
    });
  });

  describe("the user entering an empty value", async () => {
    beforeEach(async () => {
      mockFileManager.setupExistingKeystoreFile({ key: "oldValue" });

      mockUserInterruptionManager.requestSecretInput = async () => "";

      await set({ key: "key", force: true }, keystoreLoader, userInteractions);
    });

    it("should display a message that a value cannot be empty", async () => {
      assert.equal(
        mockUserInterruptionManager.displayMessage.mock.calls[0].arguments[1],
        chalk.red("The value cannot be empty."),
      );
    });

    it("should not save the keystore to file", async () => {
      assert.equal(
        mockFileManager.writeJsonFile.mock.calls.length,
        0,
        "keystore should not be saved",
      );
    });
  });

  describe("a `set` when the keystore file does not exist", () => {
    beforeEach(async () => {
      mockFileManager.setupNoKeystoreFile();
      userInteractions.requestSecretFromUser = async () => "myValue2";

      await set(
        { key: "myKey", force: false },
        keystoreLoader,
        userInteractions,
      );
    });

    it("should create a new keystore file with the appropriate value", async () => {
      const keystoreFile =
        await mockFileManager.readJsonFile(fakeKeystoreFilePath);

      assert.deepEqual(
        keystoreFile.keys,
        { myKey: "myValue2" },
        "keystore should have been saved with update",
      );
    });
  });
});
