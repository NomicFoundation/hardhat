import type { KeystoreLoader } from "../../src/internal/types.js";
import type { Mock } from "node:test";

import assert from "node:assert/strict";
import { beforeEach, describe, it, mock } from "node:test";

import chalk from "chalk";

import { KeystoreFileLoader } from "../../src/internal/loaders/keystore-file-loader.js";
import { set } from "../../src/internal/tasks/set.js";
import { assertOutputIncludes } from "../helpers/assert-output-includes.js";
import { MockFileManager } from "../helpers/mock-file-manager.js";

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
      mockRequestSecret = mock.fn(async () => "myValue2");

      await set(
        {
          key: "myKey",
          force: false,
        },
        keystoreLoader,
        mockConsoleLog,
        mockRequestSecret,
      );
    });

    it("should display a message that the key was set", async () => {
      assertOutputIncludes(mockConsoleLog, `Key "myKey" set`);
    });

    it("should save the updated keystore to file", async () => {
      const keystoreFile =
        await mockFileManager.readJsonFile(fakeKeystoreFilePath);

      assert.deepEqual(
        keystoreFile.keys,
        { myKey: "myValue2" },
        "keystore should have been saved with update",
      );
    });
  });

  describe("an unforced `set` on an existing key", async () => {
    beforeEach(async () => {
      mockFileManager.setupExistingKeystoreFile({ key: "oldValue" });

      mockRequestSecret = mock.fn(async () => "newValue");

      await set(
        { key: "key", force: false },
        keystoreLoader,
        mockConsoleLog,
        mockRequestSecret,
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
        keystoreFile.keys,
        { key: "oldValue" },
        "keystore should not have been updated with the new value",
      );
    });
  });

  describe("a forced `set` with a new value", async () => {
    beforeEach(async () => {
      mockFileManager.setupExistingKeystoreFile({ key: "oldValue" });
      mockRequestSecret = mock.fn(async () => "newValue");

      await set(
        { key: "key", force: true },
        keystoreLoader,
        mockConsoleLog,
        mockRequestSecret,
      );
    });

    it("should display a message that the key was updated", async () => {
      assertOutputIncludes(mockConsoleLog, 'Key "key" set');
    });

    it("should modify an existing value because the flag --force is passed", async () => {
      const keystoreFile =
        await mockFileManager.readJsonFile(fakeKeystoreFilePath);

      assert.deepEqual(
        keystoreFile.keys,
        { key: "newValue" },
        "keystore should have been updated with the new value",
      );
    });
  });

  describe("`set` with an invalid key", async () => {
    beforeEach(async () => {
      mockFileManager.setupExistingKeystoreFile({ key: "value" });
      mockRequestSecret = mock.fn(async () => "value");

      await set(
        { key: "1key", force: false },
        keystoreLoader,
        mockConsoleLog,
        mockRequestSecret,
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

      mockRequestSecret = mock.fn(async () => "");

      await set(
        { key: "key", force: true },
        keystoreLoader,
        mockConsoleLog,
        mockRequestSecret,
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
      mockRequestSecret = mock.fn(async () => "myValue2");

      await set(
        { key: "myKey", force: false },
        keystoreLoader,
        mockConsoleLog,
        mockRequestSecret,
      );
    });

    it("should create a new keystore file with the appropriate value", async () => {
      const keystoreFile =
        await mockFileManager.readJsonFile(fakeKeystoreFilePath);

      assert.deepEqual(
        keystoreFile.keys,
        { myKey: "myValue2" },
        "keystore should have been saved with update",
      );
    });
  });
});
