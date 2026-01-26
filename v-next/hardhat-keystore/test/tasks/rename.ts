import type { KeystoreLoader } from "../../src/internal/types.js";
import type { Mock } from "node:test";

import assert from "node:assert/strict";
import path from "node:path";
import { after, beforeEach, describe, it, mock } from "node:test";
import { fileURLToPath } from "node:url";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { remove as removeFile } from "@nomicfoundation/hardhat-utils/fs";
import chalk from "chalk";

import { decryptSecret } from "../../src/internal/keystores/encryption.js";
import { KeystoreFileLoader } from "../../src/internal/loaders/keystore-file-loader.js";
import { rename } from "../../src/internal/tasks/rename.js";
import { getKeystoreType } from "../../src/internal/utils/get-keystore-type.js";
import { assertOutputIncludes } from "../helpers/assert-output-includes.js";
import { MockFileManager } from "../helpers/mock-file-manager.js";
import { mockRequestSecretFn } from "../helpers/mock-request-secret.js";
import { TEST_PASSWORD_PROD } from "../helpers/test-password.js";

const fakeKeystoreProdFilePath = "./fake-keystore-path.json";
const fakeKeystoreDevFilePath = "./fake-keystore-dev-path.json";
const fakeKeystoreDevPasswordFilePath = path.join(
  fileURLToPath(import.meta.url),
  "..",
  "..",
  "fixture-projects",
  "keystore",
  "fake-keystore-hardhat.checksum-path-rename",
);

describe("tasks - rename", () => {
  let mockFileManager: MockFileManager;
  let mockConsoleLog: Mock<(text: string) => void>;
  let mockRequestSecret: Mock<(text: string) => Promise<string>>;

  let keystoreLoader: KeystoreLoader;

  after(async () => {
    await removeFile(fakeKeystoreDevPasswordFilePath);
  });

  for (const dev of [false, true]) {
    const fakeKeystoreFilePath = dev
      ? fakeKeystoreDevFilePath
      : fakeKeystoreProdFilePath;

    describe(`${dev ? "development" : "production"} keystore`, () => {
      beforeEach(async () => {
        mockFileManager = new MockFileManager(dev);
        mockConsoleLog = mock.fn();

        if (dev) {
          await mockFileManager.writePasswordFileForDevKeystore(
            fakeKeystoreDevPasswordFilePath,
          );
        }

        keystoreLoader = new KeystoreFileLoader(
          fakeKeystoreFilePath,
          fakeKeystoreDevPasswordFilePath,
          mockFileManager,
        );
      });

      describe("a successful `rename` with a known key", () => {
        beforeEach(async () => {
          mockFileManager.setupExistingKeystoreFile({
            myKey: "myValue",
            myOtherKey: "myOtherValue",
          });
          mockRequestSecret = mockRequestSecretFn(
            dev ? [] : [TEST_PASSWORD_PROD],
          );

          await rename(
            {
              dev,
              oldKey: "myKey",
              newKey: "renamedKey",
              force: false,
            },
            keystoreLoader,
            mockRequestSecret,
            mockConsoleLog,
          );
        });

        it("should display the key renamed message", async () => {
          assertOutputIncludes(
            mockConsoleLog,
            `Key "myKey" renamed to "renamedKey" in the ${getKeystoreType(dev)} keystore`,
          );
        });

        it("should save the updated keystore with the renamed key to file", async () => {
          const keystoreFile =
            await mockFileManager.readJsonFile(fakeKeystoreFilePath);

          assert.deepEqual(
            Object.keys(keystoreFile.secrets).sort(),
            ["myOtherKey", "renamedKey"],
            "keystore should have the renamed key and the other key",
          );
        });

        it("should preserve the value during rename", async () => {
          const keystoreFile =
            await mockFileManager.readJsonFile(fakeKeystoreFilePath);

          assert.deepEqual(
            decryptSecret({
              masterKey: mockFileManager.masterKey,
              encryptedKeystore: keystoreFile,
              key: "renamedKey",
            }),
            "myValue",
            "renamed key should have the original value",
          );
        });

        it("should remove the old key", async () => {
          const keystoreFile =
            await mockFileManager.readJsonFile(fakeKeystoreFilePath);

          assert.ok(
            !("myKey" in keystoreFile.secrets),
            "old key should have been removed",
          );
        });
      });

      describe("a `rename` when the keystore file does not exist", () => {
        beforeEach(async () => {
          mockFileManager.setupNoKeystoreFile();
          mockRequestSecret = mockRequestSecretFn(
            dev ? [] : [TEST_PASSWORD_PROD],
          );

          await rename(
            {
              dev,
              oldKey: "key",
              newKey: "newKey",
              force: false,
            },
            keystoreLoader,
            mockRequestSecret,
            mockConsoleLog,
          );

          assert.equal(process.exitCode, 1);
          process.exitCode = undefined;
        });

        it("should display a message that the keystore is not set", async () => {
          assertOutputIncludes(
            mockConsoleLog,
            `No ${getKeystoreType(dev)} keystore found. Please set one up using ${chalk.blue.italic(`npx hardhat keystore set {key}${dev === true ? " --dev" : ""}`)} `,
          );
        });

        it("should not attempt to save the keystore", async () => {
          assert.ok(
            !(await mockFileManager.fileExists(fakeKeystoreFilePath)),
            "keystore should not have been saved",
          );
        });
      });

      describe("a `rename` with an old key that is not in the keystore", () => {
        beforeEach(async () => {
          mockFileManager.setupExistingKeystoreFile({ key: "value" });
          mockRequestSecret = mockRequestSecretFn(
            dev ? [] : [TEST_PASSWORD_PROD],
          );

          await rename(
            {
              dev,
              oldKey: "unknown",
              newKey: "newKey",
              force: false,
            },
            keystoreLoader,
            mockRequestSecret,
            mockConsoleLog,
          );

          assert.equal(process.exitCode, 1);
          process.exitCode = undefined;
        });

        it("should display a message that the key is not found", async () => {
          assertOutputIncludes(
            mockConsoleLog,
            chalk.red(
              `Key "unknown" not found in the ${getKeystoreType(dev)} keystore`,
            ),
          );
        });

        it("should not attempt to save the keystore", async () => {
          const keystoreFile =
            await mockFileManager.readJsonFile(fakeKeystoreFilePath);

          assert.deepEqual(
            Object.keys(keystoreFile.secrets),
            ["key"],
            "keystore should not have been modified",
          );
        });
      });

      describe("a `rename` with an invalid old key", () => {
        beforeEach(async () => {
          mockFileManager.setupExistingKeystoreFile({ key: "value" });
          mockRequestSecret = mockRequestSecretFn(
            dev ? [] : [TEST_PASSWORD_PROD],
          );

          await rename(
            {
              dev,
              oldKey: "1invalidKey",
              newKey: "newKey",
              force: false,
            },
            keystoreLoader,
            mockRequestSecret,
            mockConsoleLog,
          );

          assert.equal(process.exitCode, 1);
          process.exitCode = undefined;
        });

        it("should display a message that the old key is not valid", async () => {
          assertOutputIncludes(
            mockConsoleLog,
            chalk.red(
              `Invalid value for key: "1invalidKey". Keys can only have alphanumeric characters and underscores, and they cannot start with a number.`,
            ),
          );
        });
      });

      describe("a `rename` with an invalid new key", () => {
        beforeEach(async () => {
          mockFileManager.setupExistingKeystoreFile({ key: "value" });
          mockRequestSecret = mockRequestSecretFn(
            dev ? [] : [TEST_PASSWORD_PROD],
          );

          await rename(
            {
              dev,
              oldKey: "key",
              newKey: "1invalidKey",
              force: false,
            },
            keystoreLoader,
            mockRequestSecret,
            mockConsoleLog,
          );

          assert.equal(process.exitCode, 1);
          process.exitCode = undefined;
        });

        it("should display a message that the new key is not valid", async () => {
          assertOutputIncludes(
            mockConsoleLog,
            chalk.red(
              `Invalid value for key: "1invalidKey". Keys can only have alphanumeric characters and underscores, and they cannot start with a number.`,
            ),
          );
        });
      });

      describe("a `rename` when the new key already exists and force flag is not set", () => {
        beforeEach(async () => {
          mockFileManager.setupExistingKeystoreFile({
            oldKey: "oldValue",
            existingKey: "existingValue",
          });
          mockRequestSecret = mockRequestSecretFn(
            dev ? [] : [TEST_PASSWORD_PROD],
          );

          await rename(
            {
              dev,
              oldKey: "oldKey",
              newKey: "existingKey",
              force: false,
            },
            keystoreLoader,
            mockRequestSecret,
            mockConsoleLog,
          );

          assert.equal(process.exitCode, 1);
          process.exitCode = undefined;
        });

        it("should display a message that the new key already exists", async () => {
          assertOutputIncludes(
            mockConsoleLog,
            chalk.yellow(
              `The key "existingKey" already exists in the ${getKeystoreType(dev)} keystore. Use the ${chalk.blue.italic("--force")} flag to overwrite it.`,
            ),
          );
        });

        it("should not modify the keystore", async () => {
          const keystoreFile =
            await mockFileManager.readJsonFile(fakeKeystoreFilePath);

          assert.deepEqual(
            Object.keys(keystoreFile.secrets).sort(),
            ["existingKey", "oldKey"],
            "keystore should not have been modified",
          );

          assert.deepEqual(
            decryptSecret({
              masterKey: mockFileManager.masterKey,
              encryptedKeystore: keystoreFile,
              key: "existingKey",
            }),
            "existingValue",
            "existing key value should not have been changed",
          );
        });
      });

      describe("a `rename` when the new key already exists and force flag is set", () => {
        beforeEach(async () => {
          mockFileManager.setupExistingKeystoreFile({
            oldKey: "oldValue",
            existingKey: "existingValue",
          });
          mockRequestSecret = mockRequestSecretFn(
            dev ? [] : [TEST_PASSWORD_PROD],
          );

          await rename(
            {
              dev,
              oldKey: "oldKey",
              newKey: "existingKey",
              force: true,
            },
            keystoreLoader,
            mockRequestSecret,
            mockConsoleLog,
          );
        });

        it("should display the key renamed message", async () => {
          assertOutputIncludes(
            mockConsoleLog,
            `Key "oldKey" renamed to "existingKey" in the ${getKeystoreType(dev)} keystore`,
          );
        });

        it("should overwrite the existing key with the value from the old key", async () => {
          const keystoreFile =
            await mockFileManager.readJsonFile(fakeKeystoreFilePath);

          assert.deepEqual(
            Object.keys(keystoreFile.secrets),
            ["existingKey"],
            "keystore should only have the renamed key",
          );

          assert.deepEqual(
            decryptSecret({
              masterKey: mockFileManager.masterKey,
              encryptedKeystore: keystoreFile,
              key: "existingKey",
            }),
            "oldValue",
            "renamed key should have the value from the old key",
          );
        });
      });

      describe("a `rename` with the wrong password", { skip: dev }, () => {
        beforeEach(async () => {
          mockFileManager.setupExistingKeystoreFile({
            myKey: "myValue",
            myOtherKey: "myOtherValue",
          });
          mockRequestSecret = mockRequestSecretFn(["wrong password"]);

          await assertRejectsWithHardhatError(
            rename(
              {
                dev,
                oldKey: "myKey",
                newKey: "renamedKey",
                force: false,
              },
              keystoreLoader,
              mockRequestSecret,
              mockConsoleLog,
            ),
            HardhatError.ERRORS.HARDHAT_KEYSTORE.GENERAL
              .INVALID_PASSWORD_OR_CORRUPTED_KEYSTORE,
            {},
          );
        });

        it("should not have renamed the key", async () => {
          const keystoreFile =
            await mockFileManager.readJsonFile(fakeKeystoreFilePath);

          assert.deepEqual(
            Object.keys(keystoreFile.secrets).sort(),
            ["myKey", "myOtherKey"],
            "keystore should not have been modified",
          );

          // Check that the keys have not being changed or corrupted
          assert.deepEqual(
            decryptSecret({
              masterKey: mockFileManager.masterKey,
              encryptedKeystore: keystoreFile,
              key: "myKey",
            }),
            "myValue",
            "original key should still have its value",
          );
          assert.deepEqual(
            decryptSecret({
              masterKey: mockFileManager.masterKey,
              encryptedKeystore: keystoreFile,
              key: "myOtherKey",
            }),
            "myOtherValue",
            "other key should still have its value",
          );
        });
      });
    });
  }
});
