import type { KeystoreLoader } from "../../src/internal/types.js";
import type { Mock } from "node:test";

import assert from "node:assert/strict";
import { beforeEach, describe, it, mock } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";
import chalk from "chalk";

import { decryptSecret } from "../../src/internal/keystores/encryption.js";
import { KeystoreFileLoader } from "../../src/internal/loaders/keystore-file-loader.js";
import { remove } from "../../src/internal/tasks/delete.js";
import { assertOutputIncludes } from "../helpers/assert-output-includes.js";
import { MockFileManager } from "../helpers/mock-file-manager.js";
import { mockRequestSecretFn } from "../helpers/mock-request-secret.js";
import { TEST_PASSWORD } from "../helpers/test-password.js";

const fakeKeystoreFilePath = "./fake-keystore-path.json";

describe("tasks - delete", () => {
  let mockFileManager: MockFileManager;
  let mockConsoleLog: Mock<(text: string) => void>;
  let mockRequestSecret: Mock<(text: string) => Promise<string>>;

  let keystoreLoader: KeystoreLoader;

  beforeEach(() => {
    mockFileManager = new MockFileManager();
    mockConsoleLog = mock.fn();

    keystoreLoader = new KeystoreFileLoader(
      "./fake-keystore-path.json",
      mockFileManager,
    );
  });

  describe("a successful `delete` with a known key", () => {
    beforeEach(async () => {
      mockFileManager.setupExistingKeystoreFile({
        myKey: "myValue",
        myOtherKey: "myOtherValue",
      });
      mockRequestSecret = mockRequestSecretFn([TEST_PASSWORD]);

      await remove(
        {
          key: "myKey",
          force: false,
        },
        keystoreLoader,
        mockRequestSecret,
        mockConsoleLog,
      );
    });

    it("should display the key deleted message", async () => {
      assertOutputIncludes(mockConsoleLog, `Key "myKey" deleted`);
    });

    it("should save the updated keystore with the deleted key to file", async () => {
      const keystoreFile =
        await mockFileManager.readJsonFile(fakeKeystoreFilePath);

      assert.deepEqual(
        Object.keys(keystoreFile.secrets),
        ["myOtherKey"],
        "keystore should have been saved with update",
      );
    });
  });

  describe("a `delete` when the keystore file does not exist", () => {
    beforeEach(async () => {
      mockFileManager.setupNoKeystoreFile();
      mockRequestSecret = mockRequestSecretFn([TEST_PASSWORD]);

      await remove(
        {
          key: "key",
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
        `No keystore found. Please set one up using ${chalk.blue.italic("npx hardhat keystore set {key}")} `,
      );
    });

    it("should not attempt to save the keystore", async () => {
      assert.ok(
        !(await mockFileManager.fileExists(fakeKeystoreFilePath)),
        "keystore should not have been saved",
      );
    });
  });

  describe("a `delete` with a key that is not in the keystore and the force flag is not set", () => {
    beforeEach(async () => {
      mockFileManager.setupExistingKeystoreFile({ key: "value" });
      mockRequestSecret = mockRequestSecretFn([TEST_PASSWORD]);

      await remove(
        {
          key: "unknown",
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
        chalk.red(`Key "unknown" not found`),
      );
    });

    it("should not attempt to save the keystore", async () => {
      const keystoreFile =
        await mockFileManager.readJsonFile(fakeKeystoreFilePath);

      assert.deepEqual(
        Object.keys(keystoreFile.secrets),
        ["key"],
        "keystore should not have been saved",
      );
    });
  });

  describe("a `delete` with a key that is not in the keystore and the force flag is set", () => {
    beforeEach(async () => {
      mockFileManager.setupExistingKeystoreFile({ key: "value" });
      mockRequestSecret = mockRequestSecretFn([TEST_PASSWORD]);

      await remove(
        {
          key: "unknown",
          force: true,
        },
        keystoreLoader,
        mockRequestSecret,
        mockConsoleLog,
      );
    });

    it("should not display a message that the key is not found", async () => {
      const output = mockConsoleLog.mock.calls
        .map((call) => call.arguments[0])
        .join("\n");

      assert.ok(
        !output.includes(`Key "unknown" not found`),
        "should not display a message that the key is not found",
      );
    });

    it("should not attempt to save the keystore", async () => {
      const keystoreFile =
        await mockFileManager.readJsonFile(fakeKeystoreFilePath);

      assert.deepEqual(
        Object.keys(keystoreFile.secrets),
        ["key"],
        "keystore should not have been saved",
      );
    });
  });

  describe("a `delete` with the wrong password", () => {
    beforeEach(async () => {
      mockFileManager.setupExistingKeystoreFile({
        myKey: "myValue",
        myOtherKey: "myOtherValue",
      });
      mockRequestSecret = mockRequestSecretFn(["wrong password"]);

      await assertRejectsWithHardhatError(
        remove(
          {
            key: "myKey",
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

    it("should not have deleted the key", async () => {
      const keystoreFile =
        await mockFileManager.readJsonFile(fakeKeystoreFilePath);

      assert.deepEqual(
        Object.keys(keystoreFile.secrets),
        ["myKey", "myOtherKey"],
        "keystore should not have been saved with update",
      );

      // Check that the keys have not being changed or corrupted
      assert.deepEqual(
        decryptSecret({
          masterKey: mockFileManager.masterKey,
          encryptedKeystore: keystoreFile,
          key: "myKey",
        }),
        "myValue",
        "keystore should not have been saved with update",
      );
      assert.deepEqual(
        decryptSecret({
          masterKey: mockFileManager.masterKey,
          encryptedKeystore: keystoreFile,
          key: "myOtherKey",
        }),
        "myOtherValue",
        "keystore should not have been saved with update",
      );
    });
  });
});
