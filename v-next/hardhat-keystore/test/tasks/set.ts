import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";
import chalk from "chalk";

import { set } from "../../src/tasks/set.js";
import { UserInteractions } from "../../src/ui/user-interactions.js";
import { MemoryKeystore } from "../helpers/memory-keystore.js";
import { MockKeystoreLoader } from "../helpers/mock-keystore-loader.js";
import { MockUserInterruptionManager } from "../helpers/mock-user-interruption-manager.js";

describe("tasks - set", () => {
  let memoryKeystore: MemoryKeystore;
  let mockKeystoreLoader: MockKeystoreLoader;
  let mockUserInterruptionManager: MockUserInterruptionManager;
  let userInteractions: UserInteractions;

  beforeEach(() => {
    memoryKeystore = new MemoryKeystore();
    mockUserInterruptionManager = new MockUserInterruptionManager();
    userInteractions = new UserInteractions(mockUserInterruptionManager);
    mockKeystoreLoader = new MockKeystoreLoader(memoryKeystore);
  });

  describe("a successful `set`", () => {
    beforeEach(async () => {
      mockUserInterruptionManager.requestSecretInput = async () => "myValue2";

      await set(
        {
          key: "myKey",
          force: false,
        },
        mockKeystoreLoader,
        userInteractions,
      );
    });

    it("should display a message that the key was set", async () => {
      assert.equal(
        mockUserInterruptionManager.displayMessage.mock.calls[0].arguments[1],
        `Key "myKey" set`,
      );
    });

    it("should add a new key to the keystore", async () => {
      assert.deepEqual(await memoryKeystore.readValue("myKey"), "myValue2");
    });

    it("should save the updated keystore to file", async () => {
      assert.ok(
        mockKeystoreLoader.saveCalled,
        "keystore should have been saved",
      );
    });
  });

  describe("an unforced `set` on an existing key", async () => {
    beforeEach(async () => {
      memoryKeystore.addNewValue("key", "oldValue");

      mockUserInterruptionManager.requestSecretInput = async () => "newValue";

      await set(
        { key: "key", force: false },
        mockKeystoreLoader,
        userInteractions,
      );
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
      assert.deepEqual(await memoryKeystore.readValue("key"), "oldValue");
    });

    it("should not save the keystore to file", async () => {
      assert.ok(!mockKeystoreLoader.saveCalled, "keystore should not be saved");
    });
  });

  describe("a forced `set` with a new value", async () => {
    it("should modify an existing value because the flag --force is passed", async () => {
      // Arrange
      mockUserInterruptionManager.requestSecretInput = async () => "oldValue";

      await set(
        { key: "key", force: false },
        mockKeystoreLoader,
        userInteractions,
      );

      // Act
      mockUserInterruptionManager.requestSecretInput = async () => "newValue";

      await set(
        { key: "key", force: true },
        mockKeystoreLoader,
        userInteractions,
      );

      // Assert
      const keystore = await mockKeystoreLoader.create();
      // It should NOT modify the keystore
      assert.deepEqual(await keystore.readValue("key"), "newValue");
    });
  });

  describe("`set` with an invalid key", async () => {
    beforeEach(async () => {
      await set(
        { key: "1key", force: false },
        mockKeystoreLoader,
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
      mockUserInterruptionManager.requestSecretInput = async () => "";

      await set(
        { key: "key", force: true },
        mockKeystoreLoader,
        userInteractions,
      );
    });

    it("should display a message that a value cannot be empty", async () => {
      assert.equal(
        mockUserInterruptionManager.displayMessage.mock.calls[0].arguments[1],
        chalk.red("The value cannot be empty."),
      );
    });

    it("should not set the key in the keystore", async () => {
      assert.deepEqual(await memoryKeystore.readValue("key"), undefined);
    });

    it("should not save the keystore to file", async () => {
      assert.ok(!mockKeystoreLoader.saveCalled, "keystore should not be saved");
    });
  });

  describe("a `set` when the keystore file does not exist", () => {
    beforeEach(async () => {
      mockKeystoreLoader.setNoExistingKeystore();

      await set(
        { key: "key", force: false },
        mockKeystoreLoader,
        userInteractions,
      );
    });

    it("should trigger a create on the loader", async () => {
      assert.ok(
        mockKeystoreLoader.createCalled,
        "The keystore initialization process should be run",
      );
    });
  });

  describe("a `set` with an unspecified key (programmatic)", async () => {
    it("should throw a missing task argument Hardhat error if no key provided", async () => {
      await assertRejectsWithHardhatError(
        set(
          {
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing the error case
            key: undefined as any,
            force: false,
          },
          mockKeystoreLoader,
          userInteractions,
        ),
        HardhatError.ERRORS.TASK_DEFINITIONS.MISSING_VALUE_FOR_TASK_ARGUMENT,
        {
          argument: "key",
          task: "keystore set",
        },
      );
    });
  });
});
