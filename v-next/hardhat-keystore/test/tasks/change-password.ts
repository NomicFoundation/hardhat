import type { EncryptedKeystore } from "../../src/internal/keystores/encryption.js";
import type { KeystoreLoader } from "../../src/internal/types.js";
import type { Mock } from "node:test";

import assert from "node:assert/strict";
import path from "node:path";
import { beforeEach, describe, it, mock } from "node:test";
import { fileURLToPath } from "node:url";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { writeJsonFile } from "@nomicfoundation/hardhat-utils/fs";
import chalk from "chalk";

import { KeystoreFileLoader } from "../../src/internal/loaders/keystore-file-loader.js";
import { changePassword } from "../../src/internal/tasks/change-password.js";
import { assertOutputIncludes } from "../helpers/assert-output-includes.js";
import { MockFileManager } from "../helpers/mock-file-manager.js";
import { mockRequestSecretFn } from "../helpers/mock-request-secret.js";
import { TEST_PASSWORD } from "../helpers/test-password.js";

const oldKeystoreFilePath = path.join(
  fileURLToPath(import.meta.url),
  "..",
  "..",
  "fixture-projects",
  "keystore",
  "keystore-change-password.json",
);
const newKeystoreFilePath = `${oldKeystoreFilePath}.tmp`;

describe("tasks - change-password", () => {
  let mockFileManager: MockFileManager;
  let mockConsoleLog: Mock<(text: string) => void>;
  let mockRequestSecret: Mock<(text: string) => Promise<string>>;

  let keystoreLoader: KeystoreLoader;
  let keystoreLoaderTmp: KeystoreLoader;

  beforeEach(() => {
    mockFileManager = new MockFileManager();
    mockConsoleLog = mock.fn();

    // Mock this function because the `change-password` task renames the keystore file
    // from its temporary name back to the original, so the file must exist on disk.
    mockFileManager.writeJsonFile = mock.fn(
      async (
        _absolutePathToFile: string,
        _keystoreFile: EncryptedKeystore,
      ): Promise<void> => {
        await writeJsonFile(newKeystoreFilePath, {});
      },
    );

    keystoreLoader = new KeystoreFileLoader(
      oldKeystoreFilePath,
      mockFileManager,
    );

    keystoreLoaderTmp = new KeystoreFileLoader(
      newKeystoreFilePath,
      mockFileManager,
    );
  });

  describe("a successful `change-password`", () => {
    beforeEach(async () => {
      mockFileManager.setupExistingKeystoreFile({
        myKey: "myValue",
      });
      mockRequestSecret = mockRequestSecretFn([
        TEST_PASSWORD,
        "newPassword",
        "newPassword",
      ]);

      await changePassword(
        keystoreLoader,
        keystoreLoaderTmp,
        mockRequestSecret,
        mockConsoleLog,
      );
    });

    it("should display messages of the `password-change` process, ending with a confirmation that the password was successfully changed", async () => {
      assertOutputIncludes(
        mockConsoleLog,
        "Unlock the keystore using your current password before proceeding with the password change.",
      );
      assertOutputIncludes(mockConsoleLog, "Change your password.");
      assertOutputIncludes(mockConsoleLog, "Password changed successfully!");
    });
  });

  describe("a `change-password` when the keystore file does not exist", () => {
    beforeEach(async () => {
      mockFileManager.setupNoKeystoreFile();
      mockRequestSecret = mockRequestSecretFn([]);

      await changePassword(
        keystoreLoader,
        keystoreLoaderTmp,
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
  });

  describe("a `change-password` with the wrong `old` password", () => {
    it("should throw an error", async () => {
      mockFileManager.setupExistingKeystoreFile({
        myKey: "myValue",
      });
      mockRequestSecret = mockRequestSecretFn(["wrong password"]);

      await assertRejectsWithHardhatError(
        changePassword(
          keystoreLoader,
          keystoreLoaderTmp,
          mockRequestSecret,
          mockConsoleLog,
        ),
        HardhatError.ERRORS.HARDHAT_KEYSTORE.GENERAL
          .INVALID_PASSWORD_OR_CORRUPTED_KEYSTORE,
        {},
      );
    });
  });
});
