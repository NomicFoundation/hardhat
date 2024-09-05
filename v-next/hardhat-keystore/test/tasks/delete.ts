import type { KeystoreLoader } from "../../src/internal/types.js";

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import chalk from "chalk";

import { KeystoreFileLoader } from "../../src/internal/loaders/keystore-file-loader.js";
import { remove } from "../../src/internal/tasks/delete.js";
import { UserInteractions } from "../../src/internal/ui/user-interactions.js";
import { MockFileManager } from "../helpers/mock-file-manager.js";
import { MockUserInterruptionManager } from "../helpers/mock-user-interruption-manager.js";

const fakeKeystoreFilePath = "./fake-keystore-path.json";

describe("tasks - delete", () => {
  let mockFileManager: MockFileManager;
  let mockUserInterruptionManager: MockUserInterruptionManager;

  let userInteractions: UserInteractions;
  let keystoreLoader: KeystoreLoader;

  beforeEach(() => {
    mockFileManager = new MockFileManager();
    mockUserInterruptionManager = new MockUserInterruptionManager();

    userInteractions = new UserInteractions(mockUserInterruptionManager);
    keystoreLoader = new KeystoreFileLoader(
      "./fake-keystore-path.json",
      mockFileManager,
    );
  });

  describe("a successful `delete` with a known key", () => {
    beforeEach(async () => {
      mockFileManager.setupExistingKeystoreFile({
        myKey: "myValue",
        myOtherKey: "myOtherValue",
      });

      await remove(
        {
          key: "myKey",
        },
        keystoreLoader,
        userInteractions,
      );
    });

    it("should display the key removed message", async () => {
      assert.ok(
        mockUserInterruptionManager.output.includes(`Key "myKey" removed`),
        "the key remove message should have been displayed",
      );
    });

    it("should save the updated keystore with the removed key to file", async () => {
      const keystoreFile =
        await mockFileManager.readJsonFile(fakeKeystoreFilePath);

      assert.deepEqual(
        keystoreFile.keys,
        { myOtherKey: "myOtherValue" },
        "keystore should have been saved with update",
      );
    });
  });

  describe("a `delete` when the keystore file does not exist", () => {
    beforeEach(async () => {
      mockFileManager.setupNoKeystoreFile();

      await remove(
        {
          key: "key",
        },
        keystoreLoader,
        userInteractions,
      );
    });

    it("should display a message that the keystore is not set", async () => {
      assert.ok(
        mockUserInterruptionManager.output.includes(
          `No keystore found. Please set one up using ${chalk.blue.italic("npx hardhat keystore set {key}")} `,
        ),
        "the no keystore found message should have been displayed",
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
      mockFileManager.setupExistingKeystoreFile({ key: "value" });

      await remove(
        {
          key: "unknown",
        },
        keystoreLoader,
        userInteractions,
      );
    });

    it("should display a message that the key is not found", async () => {
      assert.ok(
        mockUserInterruptionManager.output.includes(
          chalk.red(`Key "unknown" not found`),
        ),
        "the key not found message should have been displayed",
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
