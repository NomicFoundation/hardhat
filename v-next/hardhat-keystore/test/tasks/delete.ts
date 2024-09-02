import assert from "node:assert/strict";
import { before, beforeEach, describe, it } from "node:test";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";
import chalk from "chalk";

import { remove } from "../../src/tasks/delete.js";
import { UserInteractions } from "../../src/ui/user-interactions.js";
import { MemoryKeystore } from "../helpers/memory-keystore.js";
import { MockKeystoreLoader } from "../helpers/mock-keystore-loader.js";
import { MockUserInterruptionManager } from "../helpers/mock-user-interruption-manager.js";

describe("tasks - delete", () => {
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

  describe("a successful `delete` with a known key", () => {
    beforeEach(async () => {
      memoryKeystore.addNewValue("myKey", "myValue");

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
      assert.ok(mockKeystoreLoader.saveCalled);
    });
  });

  describe("a `delete` when the keystore file does not exist", () => {
    beforeEach(async () => {
      mockKeystoreLoader.setNoExistingKeystore();

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
      assert.equal(mockKeystoreLoader.saveCalled, false);
    });
  });

  describe("a `delete` with a key that is not in the keystore", () => {
    beforeEach(async () => {
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
      assert.equal(mockKeystoreLoader.saveCalled, false);
    });
  });

  describe("a `delete` with an unspecified key (programmatic)", async () => {
    it("should throw a missing task argument Hardhat error if no key provided", async () => {
      await assertRejectsWithHardhatError(
        remove(
          {
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing the error case
            key: undefined as any,
          },
          mockKeystoreLoader,
          userInteractions,
        ),
        HardhatError.ERRORS.TASK_DEFINITIONS.MISSING_VALUE_FOR_TASK_ARGUMENT,
        {
          argument: "key",
          task: "keystore delete",
        },
      );
    });
  });
});
