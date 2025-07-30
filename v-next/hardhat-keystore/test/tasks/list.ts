import type { KeystoreLoader } from "../../src/internal/types.js";
import type { Mock } from "node:test";

import assert from "node:assert/strict";
import { beforeEach, describe, it, mock } from "node:test";

import chalk from "chalk";

import { KeystoreFileLoader } from "../../src/internal/loaders/keystore-file-loader.js";
import { list } from "../../src/internal/tasks/list.js";
import { assertOutputIncludes } from "../helpers/assert-output-includes.js";
import { MockFileManager } from "../helpers/mock-file-manager.js";

const fakeKeystoreFilePath = "./fake-keystore-path.json";
const fakeKeystoreDevPasswordFilePath = "./fake-keystore-dev-password-path.txt";

describe("tasks - list", () => {
  let mockFileManager: MockFileManager;
  let mockConsoleLog: Mock<(text: string) => void>;

  let keystoreLoader: KeystoreLoader;

  beforeEach(() => {
    mockFileManager = new MockFileManager();
    mockConsoleLog = mock.fn();

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

      await list(keystoreLoader, mockConsoleLog);
    });

    it("should display the keys as a message", async () => {
      assertOutputIncludes(
        mockConsoleLog,
        `Keys:
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

      await list(keystoreLoader, mockConsoleLog);

      assert.equal(process.exitCode, 1);
      process.exitCode = undefined;
    });

    it("should display a message that the keystore is not set", async () => {
      assertOutputIncludes(
        mockConsoleLog,
        `No keystore found. Please set one up using ${chalk.blue.italic("npx hardhat keystore set {key}")}`,
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

      await list(keystoreLoader, mockConsoleLog);
    });

    it("should display a message that the keystore has no keys", async () => {
      assertOutputIncludes(
        mockConsoleLog,
        "The keystore does not contain any keys.",
      );
    });
  });
});
