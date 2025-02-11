import type { HardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/types/hre";

import assert from "node:assert/strict";
import path from "node:path";
import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { createHardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/hre";
import { remove, writeJsonFile } from "@ignored/hardhat-vnext-utils/fs";

import hardhatKeystorePlugin from "../../src/index.js";
import {
  addSecretToKeystore,
  createEmptyEncryptedKeystore,
  createMasterKey,
  type EncryptedKeystore,
} from "../../src/internal/keystores/encryption.js";
import { setupKeystorePassword } from "../helpers/insert-password-hook.js";
import { setupKeystoreFileLocationOverrideAt } from "../helpers/setup-keystore-file-location-override-at.js";
import { TEST_PASSWORD } from "../helpers/test-password.js";

const keystoreFilePath = path.join(
  fileURLToPath(import.meta.url),
  "..",
  "..",
  "fixture-projects",
  "unencrypted-keystore",
  "keystore.json",
);

/**
 * These tests are writing to the filesystem within `./test/fixture-projects/unencrypted-keystore`.
 *
 * They test the end to end keystore task runs by monkey patching `process.stdin` and `process.stdout`.
 */
describe("integration tests for the keystore tasks", () => {
  let hre: HardhatRuntimeEnvironment;
  let masterKey: Uint8Array;
  let salt: Uint8Array;

  beforeEach(async () => {
    ({ masterKey, salt } = createMasterKey({
      password: TEST_PASSWORD,
    }));

    let keystoreFile: EncryptedKeystore = createEmptyEncryptedKeystore({
      masterKey,
      salt,
    });

    const secrets = [
      {
        key: "myKey1",
        value: "myValue1",
      },
      {
        key: "myKey2",
        value: "myValue2",
      },
    ];

    for (const secret of secrets) {
      keystoreFile = addSecretToKeystore({
        masterKey,
        encryptedKeystore: keystoreFile,
        key: secret.key,
        value: secret.value,
      });
    }

    await _overwriteKeystoreFileWith(keystoreFilePath, keystoreFile);

    hre = await createHardhatRuntimeEnvironment({
      plugins: [
        hardhatKeystorePlugin,
        setupKeystoreFileLocationOverrideAt(keystoreFilePath),
        setupKeystorePassword([TEST_PASSWORD, "newSecret"]),
      ],
    });
  });

  afterEach(async () => {
    await remove(keystoreFilePath);
  });

  it("should display the value on a `npx hardhat keystore get`", async () => {
    await _assertConsoleOutputMatchesFor(
      () => hre.tasks.getTask(["keystore", "get"]).run({ key: "myKey1" }),
      "myValue1\n",
    );
  });

  it("should display the list of keys on `npx hardhat keystore list`", async () => {
    await _assertConsoleOutputMatchesFor(
      () => hre.tasks.getTask(["keystore", "list"]).run({}),
      "Keys:\nmyKey1\nmyKey2\n\n",
    );
  });

  it("should display the delete the key on `npx hardhat keystore delete myKey1`", async () => {
    await _assertConsoleOutputMatchesFor(
      () => hre.tasks.getTask(["keystore", "delete"]).run({ key: "myKey1" }),
      'Key "myKey1" deleted\n',
    );
  });

  it("should set a value on a `npx hardhat keystore set`", async () => {
    await _assertConsoleOutputMatchesFor(
      () => hre.tasks.getTask(["keystore", "set"]).run({ key: "myNewKey" }),
      `Key "myNewKey" set\n`,
    );
  });
});

async function _overwriteKeystoreFileWith(
  filePath: string,
  keystoreFile: EncryptedKeystore,
) {
  await remove(filePath);

  await writeJsonFile(filePath, keystoreFile);
}

/**
 * This is a helper function that mocks out `process.stdin`'s read and `process.stdout`'s write
 * to allow for crude integration testing.
 *
 * This is obviously brittle, however the tasks intentionally don't go through the Hook
 * User Interruption system, hence we can't just mock `hre.interruptions` to provide inputs
 * and assert against outputs.
 *
 * @param action the action to run in the scope of monkey patched stdin and stdout
 * @param expectedOutput the expected stdout output as a string
 * @param inputs optional inputs to be provided to stdin
 */
async function _assertConsoleOutputMatchesFor(
  action: () => Promise<void>,
  expectedOutput: string,
  inputs?: string[],
): Promise<void> {
  let output = "";

  const originalWrite = process.stdout.write;
  process.stdout.write = (chunk: string): boolean => {
    output += chunk.toString();

    return true;
  };

  const originalRead = process.stdin.read;
  if (inputs !== undefined) {
    const mockStream = new Readable({
      read() {
        for (const input of inputs) {
          this.push(input);
        }

        this.push(null);
      },
    });

    Object.assign(process.stdin, mockStream);
  }

  try {
    await action();

    assert.equal(output, expectedOutput);
  } finally {
    process.stdout.write = originalWrite;
    process.stdin.read = originalRead;
  }
}
