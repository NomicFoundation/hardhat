import type { KeystoreLoader } from "../../src/internal/types.js";
import type { Mock } from "node:test";

import assert from "node:assert/strict";
import { beforeEach, describe, it, mock } from "node:test";

import { assertRejects } from "@nomicfoundation/hardhat-test-utils";
import chalk from "chalk";

import {
  decryptSecret,
  deriveMasterKeyFromKeystore,
} from "../../src/internal/keystores/encryption.js";
import { KeystoreFileLoader } from "../../src/internal/loaders/keystore-file-loader.js";
import { set } from "../../src/internal/tasks/set.js";
import { assertOutputIncludes } from "../helpers/assert-output-includes.js";
import { MockFileManager } from "../helpers/mock-file-manager.js";
import { mockRequestSecretFn } from "../helpers/mock-request-secret.js";
import { TEST_PASSWORD } from "../helpers/test-password.js";

const fakeKeystoreFilePath = "./fake-keystore-path.json";

describe("tasks - set", () => {
  let mockFileManager: MockFileManager;
  let mockConsoleLog: Mock<(text: string) => void>;
  let mockRequestSecret: Mock<(text: string) => Promise<string>>;

  let keystoreLoader: KeystoreLoader;

  beforeEach(() => {
    mockFileManager = new MockFileManager();
    mockConsoleLog = mock.fn();

    keystoreLoader = new KeystoreFileLoader(
      fakeKeystoreFilePath,
      mockFileManager,
    );
  });

  describe("a successful `set`", () => {
    beforeEach(async () => {
      mockFileManager.setupExistingKeystoreFile({ key: "oldValue" });
      mockRequestSecret = mockRequestSecretFn([TEST_PASSWORD, "myValue2"]);

      await set(
        {
          key: "myKey",
          force: false,
        },
        keystoreLoader,
        mockRequestSecret,
        mockConsoleLog,
      );
    });

    it("should display a message that the key was set", async () => {
      assertOutputIncludes(mockConsoleLog, `Key "myKey" set`);
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

      mockRequestSecret = mockRequestSecretFn([TEST_PASSWORD, "newValue"]);

      await set(
        { key: "key", force: false },
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
          `The key "key" already exists. Use the ${chalk.blue.italic("--force")} flag to overwrite it.`,
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
      mockRequestSecret = mockRequestSecretFn([TEST_PASSWORD, "newValue"]);

      await set(
        { key: "key", force: true },
        keystoreLoader,
        mockRequestSecret,
        mockConsoleLog,
      );
    });

    it("should display a message that the key was updated", async () => {
      assertOutputIncludes(mockConsoleLog, 'Key "key" set');
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
      mockRequestSecret = mockRequestSecretFn([TEST_PASSWORD, "value"]);

      await set(
        { key: "1key", force: false },
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
      mockRequestSecret = mockRequestSecretFn([TEST_PASSWORD, ""]);

      await set(
        { key: "key", force: true },
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
      mockRequestSecret = mockRequestSecretFn([
        TEST_PASSWORD,
        TEST_PASSWORD, // password passed twice because during the keystore creation, the password must be confirmed,
        "myValue2",
      ]);

      await set(
        { key: "myKey", force: false },
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
            password: TEST_PASSWORD,
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

  describe("when the password is wrong", () => {
    beforeEach(async () => {
      mockFileManager.setupExistingKeystoreFile({ key: "oldValue" });

      mockRequestSecret = mockRequestSecretFn(["wrong password", "myValue2"]);

      await assertRejects(
        set(
          {
            key: "key",
            force: true,
          },
          keystoreLoader,
          mockRequestSecret,
          mockConsoleLog,
        ),
        (err) =>
          err.message ===
          "Invalid hmac key: make sure you are using the right password/key and that your encrypted data isn't corrupted",
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
