import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

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

  it("should delete the key", async () => {
    memoryKeystore.addNewValue("myKey", "myValue");

    await remove(
      {
        key: "myKey",
      },
      mockKeystoreLoader,
      userInteractions,
    );

    assert.equal(
      mockUserInterruptionManager.displayMessage.mock.calls[0].arguments[1],
      `Key "myKey" removed`,
    );

    const keystore = await mockKeystoreLoader.create();
    assert.deepEqual(await keystore.readValue("key"), undefined);
  });

  it("should throw because the key is not specified", async () => {
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

  it("should indicate that the keystore is not set", async () => {
    mockKeystoreLoader.setNoExistingKeystore();

    await remove(
      {
        key: "key",
      },
      mockKeystoreLoader,
      userInteractions,
    );

    assert.equal(
      mockUserInterruptionManager.displayMessage.mock.calls[0].arguments[1],
      `No keystore found. Please set one up using ${chalk.blue.italic("npx hardhat keystore set {key}")} `,
    );
  });

  it("should indicate that the key is not found", async () => {
    await remove(
      {
        key: "unknown",
      },
      mockKeystoreLoader,
      userInteractions,
    );

    assert.equal(
      mockUserInterruptionManager.displayMessage.mock.calls[0].arguments[1],
      chalk.red(`Key "unknown" not found`),
    );
  });
});
