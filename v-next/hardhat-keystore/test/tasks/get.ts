import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import chalk from "chalk";

import { get } from "../../src/internal/tasks/get.js";
import { UserInteractions } from "../../src/internal/ui/user-interactions.js";
import { MemoryKeystore } from "../helpers/memory-keystore.js";
import { MockKeystoreLoader } from "../helpers/mock-keystore-loader.js";
import { MockUserInterruptionManager } from "../helpers/mock-user-interruption-manager.js";

describe("tasks - get", () => {
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

  describe("a successful `get` with a known key", () => {
    beforeEach(async () => {
      memoryKeystore.addNewValue("myKey", "myValue");

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
        !mockKeystoreLoader.saveCalled,
        "keystore should not have been saved",
      );
    });
  });

  describe("a `get` when the keystore file does not exist", () => {
    beforeEach(async () => {
      mockKeystoreLoader.setNoExistingKeystore();

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
        !mockKeystoreLoader.saveCalled,
        "keystore should not have been saved",
      );
    });
  });

  describe("a `get` with a key that is not in the keystore", () => {
    beforeEach(async () => {
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
        !mockKeystoreLoader.saveCalled,
        "keystore should not have been saved",
      );
    });
  });
});
