import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";

import assert from "node:assert/strict";
import path from "node:path";
import { Readable } from "node:stream";
import { after, afterEach, beforeEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";
import {
  remove,
  writeJsonFile,
  writeUtf8File,
} from "@nomicfoundation/hardhat-utils/fs";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import hardhatKeystorePlugin from "../../src/index.js";
import {
  addSecretToKeystore,
  createEmptyEncryptedKeystore,
  createMasterKey,
  type EncryptedKeystore,
} from "../../src/internal/keystores/encryption.js";
import { getKeystoreType } from "../../src/internal/utils/get-keystore-type.js";
import { setupKeystorePassword } from "../helpers/insert-password-hook.js";
import { setupKeystoreFileLocationOverrideAt } from "../helpers/setup-keystore-file-location-override-at.js";
import {
  TEST_PASSWORD_DEV,
  TEST_PASSWORD_PROD,
} from "../helpers/test-password.js";

const basePath = path.join(
  fileURLToPath(import.meta.url),
  "..",
  "..",
  "fixture-projects",
  "keystore",
);

const keystoreProdFilePath = path.join(basePath, "keystore.json");
const keystoreDevFilePath = path.join(basePath, "keystore-dev.json");
const keystoreDevPasswordFilePath = path.join(
  basePath,
  "fake-keystore-dev-password-path-tasks.txt",
);

/**
 * These tests are writing to the filesystem within `./test/fixture-projects/keystore`.
 *
 * They test the end to end keystore task runs by monkey patching `process.stdin` and `process.stdout`.
 */
describe("integration tests for the keystore tasks", () => {
  let hre: HardhatRuntimeEnvironment;
  let masterKey: Uint8Array;
  let salt: Uint8Array;

  after(async () => {
    await remove(keystoreDevPasswordFilePath);
  });

  for (const dev of [false, true]) {
    const keystoreFilePath = dev ? keystoreDevFilePath : keystoreProdFilePath;

    describe(`${dev ? "development" : "production"} keystore`, () => {
      beforeEach(async () => {
        ({ masterKey, salt } = createMasterKey({
          password: dev ? TEST_PASSWORD_DEV : TEST_PASSWORD_PROD,
        }));

        let keystoreFile: EncryptedKeystore = createEmptyEncryptedKeystore({
          masterKey,
          salt,
        });

        if (dev) {
          await writeUtf8File(keystoreDevPasswordFilePath, TEST_PASSWORD_DEV);
        }

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
            setupKeystoreFileLocationOverrideAt(
              keystoreFilePath,
              keystoreDevFilePath,
              keystoreDevPasswordFilePath,
            ),
            setupKeystorePassword(
              dev ? ["newSecret"] : [TEST_PASSWORD_PROD, "newSecret"],
            ),
          ],
        });
      });

      afterEach(async () => {
        await remove(keystoreFilePath);
      });

      it("should display the value on a `npx hardhat keystore get`", async () => {
        await _assertConsoleOutputMatchesFor(
          () =>
            hre.tasks.getTask(["keystore", "get"]).run({ dev, key: "myKey1" }),
          "myValue1\n",
        );
      });

      it("should display the list of keys on `npx hardhat keystore list`", async () => {
        await _assertConsoleOutputMatchesFor(
          () => hre.tasks.getTask(["keystore", "list"]).run({ dev }),
          `Keys in the ${getKeystoreType(dev)} keystore:\nmyKey1\nmyKey2\n\n`,
        );
      });

      it("should display the delete the key on `npx hardhat keystore delete myKey1`", async () => {
        await _assertConsoleOutputMatchesFor(
          () =>
            hre.tasks
              .getTask(["keystore", "delete"])
              .run({ dev, key: "myKey1" }),
          `Key "myKey1" deleted from the ${getKeystoreType(dev)} keystore\n`,
        );
      });

      it("should set a value on a `npx hardhat keystore set`", async () => {
        await _assertConsoleOutputMatchesFor(
          () =>
            hre.tasks
              .getTask(["keystore", "set"])
              .run({ dev, key: "myNewKey" }),
          `Key "myNewKey" set in the ${getKeystoreType(dev)} keystore\n`,
        );
      });

      it("should show the keystore path", async () => {
        await _assertConsoleOutputMatchesFor(
          () => hre.tasks.getTask(["keystore", "path"]).run({ dev }),
          `${keystoreFilePath}\n`,
        );
      });

      it(
        "should throw when changing the password in the development keystore",
        { skip: !dev },
        async () => {
          await assertRejectsWithHardhatError(
            () =>
              hre.tasks.getTask(["keystore", "change-password"]).run({ dev }),
            HardhatError.ERRORS.HARDHAT_KEYSTORE.GENERAL
              .CANNOT_CHANGED_PASSWORD_FOR_DEV_KEYSTORE,
            {},
          );
        },
      );

      it("should change the password", { skip: dev }, async () => {
        const NEW_PASSWORD = "newPassword";

        let tmpHre = await createHardhatRuntimeEnvironment({
          plugins: [
            hardhatKeystorePlugin,
            setupKeystoreFileLocationOverrideAt(
              keystoreFilePath,
              keystoreDevFilePath,
              keystoreDevPasswordFilePath,
            ),
            setupKeystorePassword([
              TEST_PASSWORD_PROD,
              NEW_PASSWORD,
              NEW_PASSWORD,
            ]),
          ],
        });

        await _assertConsoleOutputMatchesFor(
          () => tmpHre.tasks.getTask(["keystore", "change-password"]).run(),
          "Unlock the production keystore using your current password before proceeding with the password change.\n" +
            "Change your password.\n" +
            "The password must have at least 8 characters.\n" +
            "\n" +
            "Password changed successfully!\n",
        );

        tmpHre = await createHardhatRuntimeEnvironment({
          plugins: [
            hardhatKeystorePlugin,
            setupKeystoreFileLocationOverrideAt(
              keystoreFilePath,
              keystoreDevFilePath,
              keystoreDevPasswordFilePath,
            ),
            setupKeystorePassword([NEW_PASSWORD]),
          ],
        });

        // Check that the keystore with the new password is working as expected
        await _assertConsoleOutputMatchesFor(
          () =>
            tmpHre.tasks.getTask(["keystore", "get"]).run({ key: "myKey1" }),
          "myValue1\n",
        );
      });
    });
  }
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
