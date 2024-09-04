import type { FileManager, KeystoreLoader } from "../../src/internal/types.js";

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import chalk from "chalk";

import { createUnencryptedKeystoreFile } from "../../src/internal/keystores/unencrypted-keystore-file.js";
import { KeystoreFileLoader } from "../../src/internal/loaders/keystore-file-loader.js";
import { remove } from "../../src/internal/tasks/delete.js";
import { UserInteractions } from "../../src/internal/ui/user-interactions.js";
import { MemoryKeystore } from "../helpers/memory-keystore.js";
import { MockFileManager } from "../helpers/mock-file-manager.js";
import { MockUserInterruptionManager } from "../helpers/mock-user-interruption-manager.js";

const fakeKeystoreFilePath = "./fake-keystore-path.json";

describe("tasks - delete", () => {
  let memoryKeystore: MemoryKeystore;
  let mockUserInterruptionManager: MockUserInterruptionManager;
  let mockFileManager: FileManager;
  let mockKeystoreLoader: KeystoreLoader;
  let userInteractions: UserInteractions;

  beforeEach(() => {
    memoryKeystore = new MemoryKeystore();
    mockUserInterruptionManager = new MockUserInterruptionManager();
    userInteractions = new UserInteractions(mockUserInterruptionManager);
    mockFileManager = new MockFileManager();
    mockKeystoreLoader = new KeystoreFileLoader(
      "./fake-keystore-path.json",
      mockFileManager,
      () => memoryKeystore,
    );
  });

  describe("a successful `delete` with a known key", () => {
    beforeEach(async () => {
      const keystoreFile = createUnencryptedKeystoreFile();
      keystoreFile.keys.myKey = "myValue";
      await mockFileManager.writeJsonFile(fakeKeystoreFilePath, keystoreFile);

      await remove(
        {
          key: "myKey",
        },
        mockKeystoreLoader,
        userInteractions,
      );
    });

    it("should display the key removed message", async () => {
      assert.equal(
        mockUserInterruptionManager.displayMessage.mock.calls[0].arguments[1],
        `Key "myKey" removed`,
      );
    });

    it("should remove the key from the keystore", async () => {
      assert.deepEqual(await memoryKeystore.readValue("key"), undefined);
    });

    it("should save the updated keystore to file", async () => {
      assert.ok(
        await mockFileManager.fileExists(fakeKeystoreFilePath),
        "keystore should have been saved",
      );
    });
  });

  describe("a `delete` when the keystore file does not exist", () => {
    beforeEach(async () => {
      await remove(
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
        !(await mockFileManager.fileExists(fakeKeystoreFilePath)),
        "keystore should not have been saved",
      );
    });
  });

  describe("a `delete` with a key that is not in the keystore", () => {
    beforeEach(async () => {
      const keystoreFile = createUnencryptedKeystoreFile();
      keystoreFile.keys.key = "value";
      await mockFileManager.writeJsonFile(fakeKeystoreFilePath, keystoreFile);

      await remove(
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
      const keystoreFile =
        await mockFileManager.readJsonFile(fakeKeystoreFilePath);

      assert.deepEqual(
        keystoreFile.keys,
        { key: "value" },
        "keystore should not have been saved",
      );
    });
  });
});
