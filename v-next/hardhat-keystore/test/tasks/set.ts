import type { KeystoreLoader } from "../../src/internal/types.js";
import type { Mock } from "node:test";

import assert from "node:assert/strict";
import path from "node:path";
import { after, beforeEach, describe, it, mock } from "node:test";
import { fileURLToPath } from "node:url";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { readUtf8File, remove } from "@nomicfoundation/hardhat-utils/fs";
import chalk from "chalk";

import {
  decryptSecret,
  deriveMasterKeyFromKeystore,
} from "../../src/internal/keystores/encryption.js";
import { KeystoreFileLoader } from "../../src/internal/loaders/keystore-file-loader.js";
import { set } from "../../src/internal/tasks/set.js";
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
  "fake-keystore-dev-password-path-set.txt",
);

describe("tasks - set", () => {
  let mockFileManager: MockFileManager;
  let mockConsoleLog: Mock<(text: string) => void>;
  let mockRequestSecret: Mock<(text: string) => Promise<string>>;

  let keystoreLoader: KeystoreLoader;

  after(async () => {
    await remove(fakeKeystoreDevPasswordFilePath);
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
          await mockFileManager.writePAsswordFileForDevKeystore(
            fakeKeystoreDevPasswordFilePath,
          );
        }

        keystoreLoader = new KeystoreFileLoader(
          fakeKeystoreFilePath,
          fakeKeystoreDevPasswordFilePath,
          mockFileManager,
        );
      });

      describe("a successful `set`", () => {
        beforeEach(async () => {
          mockFileManager.setupExistingKeystoreFile({ key: "oldValue" });
          mockRequestSecret = mockRequestSecretFn(
            dev ? ["myValue2"] : [TEST_PASSWORD_PROD, "myValue2"],
          );

          await set(
            {
              key: "myKey",
              dev,
              force: false,
            },
            keystoreLoader,
            mockRequestSecret,
            mockConsoleLog,
          );
        });

        it("should display a message that the key was set", async () => {
          assertOutputIncludes(
            mockConsoleLog,
            `Key "myKey" set in the ${getKeystoreType(dev)} keystore`,
          );
        });

        it("should save the updated keystore to file", async () => {
          const keystoreFile =
            await mockFileManager.readJsonFile(fakeKeystoreFilePath);

          assert.deepEqual(
            decryptSecret({
              masterKey: mockFileManager.masterKey,
              encryptedKeystore: keystoreFile,
              key: "myKey",
            }),
            "myValue2",
            "keystore should have been saved with update",
          );
        });
      });

      describe("an unforced `set` on an existing key", async () => {
        beforeEach(async () => {
          mockFileManager.setupExistingKeystoreFile({ key: "oldValue" });

          mockRequestSecret = mockRequestSecretFn(
            dev ? ["newValue"] : [TEST_PASSWORD_PROD, "newValue"],
          );

          await set(
            { key: "key", dev, force: false },
            keystoreLoader,
            mockRequestSecret,
            mockConsoleLog,
          );

          assert.equal(process.exitCode, 1);
          process.exitCode = undefined;
        });

        it("should warn that the key already exists", async () => {
          assertOutputIncludes(
            mockConsoleLog,
            chalk.yellow(
              `The key "key" already exists in the ${getKeystoreType(dev)} keystore. Use the ${chalk.blue.italic("--force")} flag to overwrite it.`,
            ),
          );
        });

        it("should not update the value in the keystore", async () => {
          const keystoreFile =
            await mockFileManager.readJsonFile(fakeKeystoreFilePath);

          assert.deepEqual(
            decryptSecret({
              masterKey: mockFileManager.masterKey,
              encryptedKeystore: keystoreFile,
              key: "key",
            }),
            "oldValue",
            "keystore should not have been updated with the new value",
          );
        });
      });

      describe("a forced `set` with a new value", async () => {
        beforeEach(async () => {
          mockFileManager.setupExistingKeystoreFile({ key: "oldValue" });
          mockRequestSecret = mockRequestSecretFn(
            dev ? ["newValue"] : [TEST_PASSWORD_PROD, "newValue"],
          );

          await set(
            { key: "key", dev, force: true },
            keystoreLoader,
            mockRequestSecret,
            mockConsoleLog,
          );
        });

        it("should display a message that the key was updated", async () => {
          assertOutputIncludes(
            mockConsoleLog,
            `Key "key" set in the ${getKeystoreType(dev)} keystore`,
          );
        });

        it("should modify an existing value because the flag --force is passed", async () => {
          const keystoreFile =
            await mockFileManager.readJsonFile(fakeKeystoreFilePath);

          assert.deepEqual(
            decryptSecret({
              masterKey: mockFileManager.masterKey,
              encryptedKeystore: keystoreFile,
              key: "key",
            }),
            "newValue",
            "keystore should have been updated with the new value",
          );
        });
      });

      describe("`set` with an invalid key", async () => {
        beforeEach(async () => {
          mockFileManager.setupExistingKeystoreFile({ key: "value" });
          mockRequestSecret = mockRequestSecretFn(
            dev ? ["value"] : [TEST_PASSWORD_PROD, "value"],
          );

          await set(
            { key: "1key", dev, force: false },
            keystoreLoader,
            mockRequestSecret,
            mockConsoleLog,
          );

          assert.equal(process.exitCode, 1);
          process.exitCode = undefined;
        });

        it("should display a message that the key is not valid", async () => {
          assertOutputIncludes(
            mockConsoleLog,
            chalk.red(
              `Invalid value for key: "1key". Keys can only have alphanumeric characters and underscores, and they cannot start with a number.`,
            ),
          );
        });
      });

      describe("the user entering an empty value", async () => {
        beforeEach(async () => {
          mockFileManager.setupExistingKeystoreFile({ key: "oldValue" });
          mockRequestSecret = mockRequestSecretFn(
            dev ? [""] : [TEST_PASSWORD_PROD, ""],
          );

          await set(
            { key: "key", dev, force: true },
            keystoreLoader,
            mockRequestSecret,
            mockConsoleLog,
          );

          assert.equal(process.exitCode, 1);
          process.exitCode = undefined;
        });

        it("should display a message that a value cannot be empty", async () => {
          assertOutputIncludes(
            mockConsoleLog,
            chalk.red("The value cannot be empty."),
          );
        });

        it("should not save the keystore to file", async () => {
          assert.equal(
            mockFileManager.writeJsonFile.mock.calls.length,
            0,
            "keystore should not be saved",
          );
        });
      });

      describe("a `set` when the keystore file does not exist", () => {
        beforeEach(async () => {
          mockFileManager.setupNoKeystoreFile();
          mockRequestSecret = mockRequestSecretFn(
            dev
              ? ["myValue2"]
              : [
                  TEST_PASSWORD_PROD,
                  TEST_PASSWORD_PROD, // password passed twice because during the keystore creation, the password must be confirmed,
                  "myValue2",
                ],
          );

          await set(
            { key: "myKey", dev, force: false },
            keystoreLoader,
            mockRequestSecret,
            mockConsoleLog,
          );
        });

        it("should create a new keystore file with the appropriate value", async () => {
          const keystoreFile =
            await mockFileManager.readJsonFile(fakeKeystoreFilePath);

          assert.deepEqual(
            decryptSecret({
              masterKey: deriveMasterKeyFromKeystore({
                password: dev
                  ? // For dev: the password was automatically created by the task because the keystore did not exist,
                    // so we need to read it from the file
                    await readUtf8File(fakeKeystoreDevPasswordFilePath)
                  : TEST_PASSWORD_PROD,
                encryptedKeystore: keystoreFile,
              }),
              encryptedKeystore: keystoreFile,
              key: "myKey",
            }),
            "myValue2",
            "keystore should have been saved with update",
          );

          assert.deepEqual(
            Object.keys(keystoreFile.secrets),
            ["myKey"],
            "keystore should only have one key",
          );
        });
      });

      describe("when the password is wrong", { skip: dev }, () => {
        beforeEach(async () => {
          mockFileManager.setupExistingKeystoreFile({ key: "oldValue" });

          mockRequestSecret = mockRequestSecretFn([
            "wrong password",
            "myValue2",
          ]);

          await assertRejectsWithHardhatError(
            set(
              {
                key: "key",
                dev,
                force: true,
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

        it("should not save the updated keystore to file", async () => {
          const keystoreFile =
            await mockFileManager.readJsonFile(fakeKeystoreFilePath);

          assert.deepEqual(
            Object.keys(keystoreFile.secrets),
            ["key"],
            "keystore should only have one key",
          );

          assert.deepEqual(
            decryptSecret({
              masterKey: mockFileManager.masterKey,
              encryptedKeystore: keystoreFile,
              key: "key",
            }),
            "oldValue",
            "keystore should not have been saved with update",
          );
        });
      });
    });
  }
});
