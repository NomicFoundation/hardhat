import type { Keystore, KeystoreLoader } from "../../src/internal/types.js";

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import chalk from "chalk";

import { createUnencryptedKeystoreFile } from "../../src/internal/keystores/unencrypted-keystore-file.js";
import { UnencryptedKeystore } from "../../src/internal/keystores/unencrypted-keystore.js";
import { KeystoreFileLoader } from "../../src/internal/loaders/keystore-file-loader.js";
import { get } from "../../src/internal/tasks/get.js";
import { UserInteractions } from "../../src/internal/ui/user-interactions.js";
import { MockFileManager } from "../helpers/mock-file-manager.js";
import { MockUserInterruptionManager } from "../helpers/mock-user-interruption-manager.js";

const fakeKeystoreFilePath = "./fake-keystore-path.json";

describe("tasks - get", () => {
  let keystore: Keystore;
  let mockUserInterruptionManager: MockUserInterruptionManager;
  let mockFileManager: MockFileManager;
  let mockKeystoreLoader: KeystoreLoader;
  let userInteractions: UserInteractions;

  beforeEach(() => {
    keystore = new UnencryptedKeystore();
    mockUserInterruptionManager = new MockUserInterruptionManager();
    userInteractions = new UserInteractions(mockUserInterruptionManager);
    mockFileManager = new MockFileManager();
    mockKeystoreLoader = new KeystoreFileLoader(
      fakeKeystoreFilePath,
      mockFileManager,
      () => keystore,
    );
  });

  describe("a successful `get` with a known key", () => {
    beforeEach(async () => {
      const keystoreFile = createUnencryptedKeystoreFile();
      keystoreFile.keys.myKey = "myValue";
      await mockFileManager.writeJsonFile(fakeKeystoreFilePath, keystoreFile);
      mockFileManager.writeJsonFileCalled = false;

      await get(
        {
          key: "myKey",
        },
        mockKeystoreLoader,
        userInteractions,
      );
    });

    it("should display the gotten value", async () => {
      assert.equal(
        mockUserInterruptionManager.displayMessage.mock.calls[0].arguments[1],
        "myValue",
      );
    });

    it("should not save the keystore to file", async () => {
      assert.ok(
        !mockFileManager.writeJsonFileCalled,
        "keystore should not have been saved",
      );
    });
  });

  describe("a `get` when the keystore file does not exist", () => {
    beforeEach(async () => {
      mockFileManager.deleteKeystoreFile();

      await get(
        {
          key: "key",
        },
        mockKeystoreLoader,
        userInteractions,
      );
    });

    it("should display a message that the keystore is not set", async () => {
      assert.equal(
        mockUserInterruptionManager.displayMessage.mock.calls[0].arguments[1],
        `No keystore found. Please set one up using ${chalk.blue.italic("npx hardhat keystore set {key}")} `,
      );
    });

    it("should not attempt to save the keystore", async () => {
      assert.ok(
        !mockFileManager.writeJsonFileCalled,
        "keystore should not have been saved",
      );
    });
  });

  describe("a `get` with a key that is not in the keystore", () => {
    beforeEach(async () => {
      const keystoreFile = createUnencryptedKeystoreFile();
      keystoreFile.keys.known = "value";
      await mockFileManager.writeJsonFile(fakeKeystoreFilePath, keystoreFile);
      mockFileManager.writeJsonFileCalled = false;

      await get(
        {
          key: "unknown",
        },
        mockKeystoreLoader,
        userInteractions,
      );
    });

    it("should display a message that the key is not found", async () => {
      assert.equal(
        mockUserInterruptionManager.displayMessage.mock.calls[0].arguments[1],
        chalk.red(`Key "unknown" not found`),
      );
    });

    it("should not attempt to save the keystore", async () => {
      assert.ok(
        !mockFileManager.writeJsonFileCalled,
        "keystore should not have been saved",
      );
    });
  });
});
