import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import chalk from "chalk";

import { list } from "../../src/internal/tasks/list.js";
import { UserInteractions } from "../../src/internal/ui/user-interactions.js";
import { getFullOutput } from "../helpers/get-full-output.js";
import { MemoryKeystore } from "../helpers/memory-keystore.js";
import { MockKeystoreLoader } from "../helpers/mock-keystore-loader.js";
import { MockUserInterruptionManager } from "../helpers/mock-user-interruption-manager.js";

describe("tasks - list", () => {
  let memoryKeystore: MemoryKeystore;
  let mockUserInterruptionManager: MockUserInterruptionManager;
  let mockKeystoreLoader: MockKeystoreLoader;
  let userInteractions: UserInteractions;

  beforeEach(() => {
    memoryKeystore = new MemoryKeystore();
    mockUserInterruptionManager = new MockUserInterruptionManager();
    userInteractions = new UserInteractions(mockUserInterruptionManager);
    mockKeystoreLoader = new MockKeystoreLoader(memoryKeystore);
  });

  describe("a successful `list`", () => {
    beforeEach(async () => {
      memoryKeystore.addNewValue("key", "value");
      memoryKeystore.addNewValue("key2", "value2");

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
      mockKeystoreLoader.setNoExistingKeystore();

      await list(mockKeystoreLoader, userInteractions);
    });

    it("should display a message that the keystore is not set", async () => {
      assert.equal(
        mockUserInterruptionManager.displayMessage.mock.calls[0].arguments[1],
        `No keystore found. Please set one up using ${chalk.blue.italic("npx hardhat keystore set {key}")} `,
      );
    });

    it("should not attempt to save the keystore", async () => {
      assert.equal(mockKeystoreLoader.saveCalled, false);
    });
  });

  describe("a `list` when the keystore has no keys", () => {
    beforeEach(async () => {
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
