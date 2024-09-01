import type { KeystoreFile } from "../../src/types.js";
import type { HardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/types/hre";

import assert from "node:assert/strict";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { createHardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/hre";
import { remove, writeJsonFile } from "@ignored/hardhat-vnext-utils/fs";

import hardhatKeystorePlugin from "../../src/index.js";
import { MockUserInterruptionManager } from "../helpers/mock-user-interruption-manager.js";
import { setupKeystoreFileLocationOverrideAt } from "../helpers/setup-keystore-file-location-override-at.js";
import { setupMockUserInterruptionPlugin } from "../helpers/setup-mock-user-interruptions-plugin.js";

const keystoreFilePath = path.join(
  fileURLToPath(import.meta.url),
  "../../fixture-projects/unencrypted-keystore/keystore.json",
);

describe("integration tests for the keystore tasks", () => {
  let hre: HardhatRuntimeEnvironment;
  let mockUserInterruptions: MockUserInterruptionManager;

  beforeEach(async () => {
    await remove(keystoreFilePath);

    const keystoreFile: KeystoreFile = {
      version: "",
      keys: {
        myKey1: "myValue1",
        myKey2: "myValue2",
      },
    };

    await writeJsonFile(keystoreFilePath, keystoreFile);

    mockUserInterruptions = new MockUserInterruptionManager();

    hre = await createHardhatRuntimeEnvironment({
      plugins: [
        hardhatKeystorePlugin,
        setupKeystoreFileLocationOverrideAt(keystoreFilePath),
        setupMockUserInterruptionPlugin(mockUserInterruptions),
      ],
    });
  });

  afterEach(async () => {
    await remove(keystoreFilePath);
  });

  it("should display the value on a `npx hardhat keystore get`", async () => {
    await assertConsoleOutputMatchesFor(
      () => hre.tasks.getTask(["keystore", "get"]).run({ key: "myKey1" }),
      "myValue1\n",
    );
  });

  it("should display the list of keys on `npx hardhat keystore list`", async () => {
    await assertConsoleOutputMatchesFor(
      () => hre.tasks.getTask(["keystore", "list"]).run({}),
      "Keys:\nmyKey1\nmyKey2\n",
    );
  });

  it("should display the delete the key on `npx hardhat keystore delete myKey1`", async () => {
    await assertConsoleOutputMatchesFor(
      () => hre.tasks.getTask(["keystore", "delete"]).run({ key: "myKey1" }),
      'Key "myKey1" removed\n',
    );
  });

  it.skip("should display the setting of the key on `npx hardhat keystore set myNewKey`", async () => {
    const task = hre.tasks.getTask(["keystore", "set"]);

    await task.run({ key: "myNewKey" });
  });
});

// This is a ... hack
async function assertConsoleOutputMatchesFor(
  action: () => Promise<void>,
  expectedOutput: string,
): Promise<void> {
  let output = "";
  const originalWrite = process.stdout.write;

  process.stdout.write = (chunk: string): boolean => {
    output += chunk.toString();

    return true;
  };

  try {
    await action();

    assert.equal(output, expectedOutput);
  } finally {
    process.stdout.write = originalWrite;
  }
}
