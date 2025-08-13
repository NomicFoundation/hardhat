import type { KeystoreLoader } from "../../src/internal/types.js";
import type { Mock } from "node:test";

import assert from "node:assert/strict";
import path from "node:path";
import { after, beforeEach, describe, it, mock } from "node:test";
import { fileURLToPath } from "node:url";

import { remove } from "@nomicfoundation/hardhat-utils/fs";
import chalk from "chalk";

import { KeystoreFileLoader } from "../../src/internal/loaders/keystore-file-loader.js";
import { list } from "../../src/internal/tasks/list.js";
import { getKeystoreType } from "../../src/internal/utils/get-keystore-type.js";
import { assertOutputIncludes } from "../helpers/assert-output-includes.js";
import { MockFileManager } from "../helpers/mock-file-manager.js";

const fakeKeystoreProdFilePath = "./fake-keystore-path.json";
const fakeKeystoreDevFilePath = "./fake-keystore-dev-path.json";
const fakeKeystoreDevPasswordFilePath = path.join(
  fileURLToPath(import.meta.url),
  "..",
  "..",
  "fixture-projects",
  "keystore",
  "fake-keystore-hardhat.checksum-path-list",
);

describe("tasks - list", () => {
  let mockFileManager: MockFileManager;
  let mockConsoleLog: Mock<(text: string) => void>;

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

      describe("a successful `list`", () => {
        beforeEach(async () => {
          mockFileManager.setupExistingKeystoreFile({
            key: "value",
            key2: "value2",
          });

          await list({ dev }, keystoreLoader, mockConsoleLog);
        });

        it("should display the keys as a message", async () => {
          assertOutputIncludes(
            mockConsoleLog,
            `Keys in the ${getKeystoreType(dev)} keystore:
key
key2
`,
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

      describe("a `list` when the keystore file does not exist", () => {
        beforeEach(async () => {
          mockFileManager.setupNoKeystoreFile();

          await list({ dev }, keystoreLoader, mockConsoleLog);

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

      describe("a `list` when the keystore has no keys", () => {
        beforeEach(async () => {
          mockFileManager.setupExistingKeystoreFile({});

          await list({ dev }, keystoreLoader, mockConsoleLog);
        });

        it("should display a message that the keystore has no keys", async () => {
          assertOutputIncludes(
            mockConsoleLog,
            `The ${getKeystoreType(dev)} keystore does not contain any keys.`,
          );
        });
      });
    });
  }
});
