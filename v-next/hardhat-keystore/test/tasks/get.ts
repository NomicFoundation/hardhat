import type { KeystoreLoader } from "../../src/internal/types.js";
import type { Mock } from "node:test";

import assert from "node:assert/strict";
import path from "node:path";
import { after, beforeEach, describe, it, mock } from "node:test";
import { fileURLToPath } from "node:url";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { remove } from "@nomicfoundation/hardhat-utils/fs";
import chalk from "chalk";

import { KeystoreFileLoader } from "../../src/internal/loaders/keystore-file-loader.js";
import { get } from "../../src/internal/tasks/get.js";
import { getKeystoreType } from "../../src/internal/utils/get-keystore-type.js";
import { assertOutputIncludes } from "../helpers/assert-output-includes.js";
import { MockFileManager } from "../helpers/mock-file-manager.js";
import { mockRequestSecretFn } from "../helpers/mock-request-secret.js";
import { TEST_PASSWORD_PROD } from "../helpers/test-password.js";

const fakeKeystoreProdFilePath = "./fake-keystore-path.json";
const fakeKeystoreDevFilePath = "./fake-keystore-path.json";
const fakeKeystoreDevPasswordFilePath = path.join(
  fileURLToPath(import.meta.url),
  "..",
  "..",
  "fixture-projects",
  "keystore",
  "fake-keystore-hardhat.checksum-path-get",
);

describe("tasks - get", () => {
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

      describe("a successful `get` with a known key", () => {
        beforeEach(async () => {
          mockFileManager.setupExistingKeystoreFile({
            myKey: "myValue",
          });
          mockRequestSecret = mockRequestSecretFn(
            dev ? [] : [TEST_PASSWORD_PROD],
          );

          await get(
            {
              dev,
              key: "myKey",
            },
            keystoreLoader,
            mockRequestSecret,
            mockConsoleLog,
          );
        });

        it("should display the gotten value", async () => {
          assertOutputIncludes(mockConsoleLog, "myValue");
        });

        it("should not save the keystore to file", async () => {
          assert.equal(
            mockFileManager.writeJsonFile.mock.calls.length,
            0,
            "keystore should not have been saved",
          );
        });
      });

      describe("a `get` when the keystore file does not exist", () => {
        beforeEach(async () => {
          mockFileManager.setupNoKeystoreFile();
          mockRequestSecret = mockRequestSecretFn(
            dev ? [] : [TEST_PASSWORD_PROD],
          );

          await get(
            {
              dev,
              key: "key",
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
          assert.equal(
            mockFileManager.writeJsonFile.mock.calls.length,
            0,
            "keystore should not have been saved",
          );
        });
      });

      describe("a `get` with a key that is not in the keystore", () => {
        beforeEach(async () => {
          mockFileManager.setupExistingKeystoreFile({
            known: "value",
          });
          mockRequestSecret = mockRequestSecretFn(
            dev ? [] : [TEST_PASSWORD_PROD],
          );

          await get(
            {
              dev,
              key: "unknown",
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
            `Key "unknown" not found in the ${getKeystoreType(dev)} keystore`,
          );
        });

        it("should not attempt to save the keystore", async () => {
          assert.equal(
            mockFileManager.writeJsonFile.mock.calls.length,
            0,
            "keystore should not have been saved",
          );
        });
      });

      describe("a `get` with the wrong password", { skip: dev }, () => {
        it("should throw an error", async () => {
          mockFileManager.setupExistingKeystoreFile({
            myKey: "myValue",
          });
          mockRequestSecret = mockRequestSecretFn(["wrong password"]);

          await assertRejectsWithHardhatError(
            get(
              {
                dev,
                key: "myKey",
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
      });
    });
  }
});
