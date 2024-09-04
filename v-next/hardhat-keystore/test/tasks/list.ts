import type {
  FileManager,
  Keystore,
  KeystoreLoader,
} from "../../src/internal/types.js";

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import chalk from "chalk";

import { createUnencryptedKeystoreFile } from "../../src/internal/keystores/unencrypted-keystore-file.js";
import { UnencryptedKeystore } from "../../src/internal/keystores/unencrypted-keystore.js";
import { KeystoreFileLoader } from "../../src/internal/loaders/keystore-file-loader.js";
import { list } from "../../src/internal/tasks/list.js";
import { UserInteractions } from "../../src/internal/ui/user-interactions.js";
import { getFullOutput } from "../helpers/get-full-output.js";
import { MockFileManager } from "../helpers/mock-file-manager.js";
import { MockUserInterruptionManager } from "../helpers/mock-user-interruption-manager.js";

const fakeKeystoreFilePath = "./fake-keystore-path.json";

describe("tasks - list", () => {
  let memoryKeystore: Keystore;
  let mockUserInterruptionManager: MockUserInterruptionManager;
  let mockFileManager: FileManager;
  let mockKeystoreLoader: KeystoreLoader;
  let userInteractions: UserInteractions;

  beforeEach(() => {
    mockUserInterruptionManager = new MockUserInterruptionManager();
    userInteractions = new UserInteractions(mockUserInterruptionManager);
    mockFileManager = new MockFileManager();
    memoryKeystore = new UnencryptedKeystore();
    mockKeystoreLoader = new KeystoreFileLoader(
      fakeKeystoreFilePath,
      mockFileManager,
      () => memoryKeystore,
    );
  });

  describe("a successful `list`", () => {
    beforeEach(async () => {
      const keystoreFile = createUnencryptedKeystoreFile();
      keystoreFile.keys.key = "value";
      keystoreFile.keys.key2 = "value2";
      await mockFileManager.writeJsonFile(fakeKeystoreFilePath, keystoreFile);

      await list(mockKeystoreLoader, userInteractions);
    });

    it("should display the keys as a message", async () => {
      assert.equal(
        getFullOutput(mockUserInterruptionManager.displayMessage, 3),
        `Keys:
key
key2`,
      );
    });
  });

  describe("a `list` when the keystore file does not exist", () => {
    beforeEach(async () => {
      await list(mockKeystoreLoader, userInteractions);
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

  describe("a `list` when the keystore has no keys", () => {
    beforeEach(async () => {
      const keystoreFile = createUnencryptedKeystoreFile();
      await mockFileManager.writeJsonFile(fakeKeystoreFilePath, keystoreFile);

      await list(mockKeystoreLoader, userInteractions);
    });

    it("should display a message that the keystore has no keys", async () => {
      assert.equal(
        mockUserInterruptionManager.displayMessage.mock.calls[0].arguments[1],
        "The keystore does not contain any keys.",
      );
    });
  });
});
