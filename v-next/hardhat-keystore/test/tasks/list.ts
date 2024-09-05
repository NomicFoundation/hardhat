import type { KeystoreLoader } from "../../src/internal/types.js";

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import chalk from "chalk";

import { KeystoreFileLoader } from "../../src/internal/loaders/keystore-file-loader.js";
import { list } from "../../src/internal/tasks/list.js";
import { UserInteractions } from "../../src/internal/ui/user-interactions.js";
import { MockFileManager } from "../helpers/mock-file-manager.js";
import { MockUserInterruptionManager } from "../helpers/mock-user-interruption-manager.js";

const fakeKeystoreFilePath = "./fake-keystore-path.json";

describe("tasks - list", () => {
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

  describe("a successful `list`", () => {
    beforeEach(async () => {
      mockFileManager.setupExistingKeystoreFile({
        key: "value",
        key2: "value2",
      });

      await list(keystoreLoader, userInteractions);
    });

    it("should display the keys as a message", async () => {
      assert.equal(
        mockUserInterruptionManager.output,
        `Keys:
key
key2
`,
      );
    });

    it("should not attempt to save the keystore", async () => {
      assert.equal(
        mockFileManager.writeJsonFile.mock.calls.length,
        0,
        "keystore should not have been saved",
      );
    });
  });

  describe("a `list` when the keystore file does not exist", () => {
    beforeEach(async () => {
      await list(keystoreLoader, userInteractions);
    });

    it("should display a message that the keystore is not set", async () => {
      assert.ok(
        mockUserInterruptionManager.output.includes(
          `No keystore found. Please set one up using ${chalk.blue.italic("npx hardhat keystore set {key}")}`,
        ),
        "the no keystore found message should have been displayed",
      );
    });

    it("should not attempt to save the keystore", async () => {
      assert.equal(
        mockFileManager.writeJsonFile.mock.calls.length,
        0,
        "keystore should not have been saved",
      );
    });
  });

  describe("a `list` when the keystore has no keys", () => {
    beforeEach(async () => {
      mockFileManager.setupExistingKeystoreFile({});

      await list(keystoreLoader, userInteractions);
    });

    it("should display a message that the keystore has no keys", async () => {
      assert.ok(
        mockUserInterruptionManager.output.includes(
          "The keystore does not contain any keys.",
        ),
        "the empty keys message should have been displayed",
      );
    });
  });
});
