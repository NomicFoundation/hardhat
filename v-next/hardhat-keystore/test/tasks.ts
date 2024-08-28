import type { KeystoreFile } from "../src/types.js";
import type { HardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/types/hre";
import type { Task } from "@ignored/hardhat-vnext/types/tasks";
import type { Mock } from "node:test";

import assert from "node:assert/strict";
import { afterEach, before, beforeEach, describe, it, mock } from "node:test";

import { createHardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/hre";
import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { exists, readJsonFile } from "@ignored/hardhat-vnext-utils/fs";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";
import chalk from "chalk";

import hardhatKeystorePlugin from "../src/index.js";
import { io } from "../src/io.js";
import { setKeystoreCache } from "../src/keystores/unencrypted-keystore-loader.js";

import {
  createKeyStore,
  deleteKeystore,
  getKeystoreFilePath,
} from "./helpers.js";

const NO_KEYSTORE_SET = `No keystore found. Please set one up using ${chalk.blue.italic("npx hardhat keystore set {key}")} `;

const TEST_PASSWORD = "Password!";

function getFullOutput(mockF: Mock<any>, totCalls: number): string {
  const list = [];
  for (let i = 0; i < totCalls; i++) {
    list.push(mockF.mock.calls[i].arguments[0]);
  }

  return list.join("\n");
}

describe("tasks", () => {
  let hre: HardhatRuntimeEnvironment;
  let task: Task;
  let mockInfo: Mock<any>;
  let mockWarn: Mock<any>;
  let mockError: Mock<any>;
  let mockRequestSecretInput: Mock<any>;

  before(async () => {
    hre = await createHardhatRuntimeEnvironment({
      plugins: [hardhatKeystorePlugin],
    });

    mockInfo = mock.method(io, "info", (_msg: string) => {});
    mockWarn = mock.method(io, "warn", (_msg: string) => {});
    mockError = mock.method(io, "error", (_msg: string) => {});
    // This function is mocked differently in each test where it is used.
    // This is just a placeholder.
    mockRequestSecretInput = mock.method(
      io,
      "requestSecretInput",
      (_msg: string) => {},
    );
  });

  beforeEach(async () => {
    // Simulate a new use of the plugin every time a test is run
    setKeystoreCache(undefined);
    await deleteKeystore();
  });

  afterEach(async () => {
    mockInfo.mock.resetCalls();
    mockWarn.mock.resetCalls();
    mockError.mock.resetCalls();

    mockRequestSecretInput.mock.resetCalls();

    await deleteKeystore();
  });

  describe("set", () => {
    before(() => {
      task = hre.tasks.getTask(["keystore", "set"]);
    });

    it("should throw because the key is not specified", async () => {
      assertRejectsWithHardhatError(
        task.run({}),
        HardhatError.ERRORS.TASK_DEFINITIONS.MISSING_VALUE_FOR_TASK_ARGUMENT,
        {
          argument: "key",
          task: "keystore set",
        },
      );
    });

    it("should successfully configure the keystore on the first usage", async () => {
      mockRequestSecretInput = mock.method(
        io,
        "requestSecretInput",
        (_msg: string) => TEST_PASSWORD,
      );

      await task.run({ key: "key" });

      assert.equal(await exists(await getKeystoreFilePath()), true);
    });

    it("should successfully show the right configuration message when configuring the keystore on the first usage", async () => {
      mockRequestSecretInput = mock.method(
        io,
        "requestSecretInput",
        (_msg: string) => TEST_PASSWORD,
      );

      await task.run({ key: "key" });

      assert.equal(
        getFullOutput(mockInfo, 4),
        `
👷🔐 Hardhat-Keystore 🔐👷

This is the first time you are using the keystore, please set a password.
The password must have at least 8 characters, one uppercase letter, one lowercase letter, and one special character.
`,
      );
    });

    it("should successfully configure the keystore on the first usage but also show password warnings", async () => {
      // Simulate a scenario where a password does not meet the criteria, and another where passwords do not match.
      // The user will eventually correct the password values.
      // The following mock simulate the user's inputs for the password.
      let count = 0;
      mockRequestSecretInput = mock.method(
        io,
        "requestSecretInput",
        (_msg: string) => {
          let msg = "";

          if (count === 0) {
            // Step 1: invalid password
            msg = "invalid";
          } else if (count === 1) {
            // Step 2: valid password
            msg = TEST_PASSWORD;
          } else if (count === 2) {
            // Step 3: passwords do not match
            msg = "not-matching-password";
          } else {
            // Step 4: passwords match
            msg = TEST_PASSWORD;
          }

          count++;
          return msg;
        },
      );

      await task.run({ key: "key" });

      // Be sure that the error messages are displayed to the user
      assert.equal(mockError.mock.calls[0].arguments[0], "Invalid password!");
      assert.equal(
        mockError.mock.calls[1].arguments[0],
        "Passwords do not match!",
      );

      assert.equal(await exists(await getKeystoreFilePath()), true);
    });

    it("should indicate that the key is not valid", async () => {
      await createKeyStore([["key", "value"]]);

      await task.run({ key: "1key" });

      assert.equal(
        mockError.mock.calls[0].arguments[0],
        `Invalid value for key: "1key". Keys can only have alphanumeric characters and underscores, and they cannot start with a number.`,
      );
    });

    it("should add a new key", async () => {
      await createKeyStore([["key", "value"]]);

      mockRequestSecretInput = mock.method(
        io,
        "requestSecretInput",
        (_msg: string) => "value2",
      );

      await task.run({ key: "key2" });

      assert.equal(mockInfo.mock.calls[0].arguments[0], `Key "key2" set`);
      assert.deepEqual(await getKeystore(), {
        version: "",
        keys: {
          key: "value",
          key2: "value2",
        },
      });
    });

    it("should warn that the key already exists", async () => {
      await createKeyStore([["key", "value"]]);

      mockRequestSecretInput = mock.method(
        io,
        "requestSecretInput",
        (_msg: string) => "newValue",
      );

      await task.run({ key: "key" });

      assert.equal(
        mockWarn.mock.calls[0].arguments[0],
        `The key "key" already exists. Use the ${chalk.blue.italic("--force")} flag to overwrite it.`,
      );
      // It should NOT modify the keystore
      assert.deepEqual(await getKeystore(), {
        version: "",
        keys: {
          key: "value",
        },
      });
    });

    it("should modify an existing value because the flag --force is passed", async () => {
      await createKeyStore([["key", "value"]]);

      mockRequestSecretInput = mock.method(
        io,
        "requestSecretInput",
        (_msg: string) => "newValue",
      );

      await task.run({ key: "key", force: true });

      assert.equal(mockInfo.mock.calls[0].arguments[0], `Key "key" set`);
      assert.deepEqual(await getKeystore(), {
        version: "",
        keys: {
          key: "newValue",
        },
      });
    });

    it("should indicate that a value cannot be empty", async () => {
      await createKeyStore([["key", "value"]]);

      mockRequestSecretInput = mock.method(
        io,
        "requestSecretInput",
        (_msg: string) => "",
      );

      await task.run({ key: "key2" });

      assert.equal(
        mockError.mock.calls[0].arguments[0],
        "The secret cannot be empty.",
      );
      // It should NOT modify the keystore
      assert.deepEqual(await getKeystore(), {
        version: "",
        keys: {
          key: "value",
        },
      });
    });
  });

  describe("get", () => {
    before(() => {
      task = hre.tasks.getTask(["keystore", "get"]);
    });

    it("should throw because the key is not specified", async () => {
      assertRejectsWithHardhatError(
        task.run({}),
        HardhatError.ERRORS.TASK_DEFINITIONS.MISSING_VALUE_FOR_TASK_ARGUMENT,
        {
          argument: "key",
          task: "keystore get",
        },
      );
    });

    it("should indicate that the keystore is not set", async () => {
      await task.run({ key: "key" });

      assert.equal(mockInfo.mock.calls[0].arguments[0], NO_KEYSTORE_SET);
    });

    it("should indicate that the key is not found", async () => {
      await createKeyStore([]);

      await task.run({ key: "key" });

      assert.equal(mockError.mock.calls[0].arguments[0], `Key "key" not found`);
    });

    it("should get the secret", async () => {
      await createKeyStore([["key", "value"]]);

      await task.run({ key: "key" });

      assert.equal(mockInfo.mock.calls[0].arguments[0], "value");
    });
  });

  describe("list", () => {
    before(() => {
      task = hre.tasks.getTask(["keystore", "list"]);
    });

    it("should indicate that the keystore is not set", async () => {
      await task.run({});

      assert.equal(mockInfo.mock.calls[0].arguments[0], NO_KEYSTORE_SET);
    });

    it("should indicate that the keystore has no keys", async () => {
      await createKeyStore([]);

      await task.run({});

      assert.equal(
        mockInfo.mock.calls[0].arguments[0],
        "The keystore does not contain any keys.",
      );
    });

    it("should list the keys", async () => {
      await createKeyStore([
        ["key", "value"],
        ["key2", "value2"],
      ]);

      await task.run({});

      assert.equal(
        getFullOutput(mockInfo, 3),
        `Keys:
key
key2`,
      );
    });
  });

  describe("delete", () => {
    before(() => {
      task = hre.tasks.getTask(["keystore", "delete"]);
    });

    it("should throw because the key is not specified", async () => {
      assertRejectsWithHardhatError(
        task.run({}),
        HardhatError.ERRORS.TASK_DEFINITIONS.MISSING_VALUE_FOR_TASK_ARGUMENT,
        {
          argument: "key",
          task: "keystore delete",
        },
      );
    });

    it("should indicate that the keystore is not set", async () => {
      await task.run({ key: "key" });

      assert.equal(mockInfo.mock.calls[0].arguments[0], NO_KEYSTORE_SET);
    });

    it("should indicate that the key is not found", async () => {
      await createKeyStore([]);

      await task.run({ key: "key" });

      assert.equal(mockError.mock.calls[0].arguments[0], `Key "key" not found`);
    });

    it("should delete the key", async () => {
      await createKeyStore([["key", "value"]]);

      await task.run({ key: "key" });

      assert.equal(mockInfo.mock.calls[0].arguments[0], `Key "key" removed`);
      assert.deepEqual(await getKeystore(), { version: "", keys: {} });
    });
  });
});

async function getKeystore(): Promise<KeystoreFile | undefined> {
  const keystoreFilePath = await getKeystoreFilePath();

  const fileExists = await exists(keystoreFilePath);
  if (fileExists === false) {
    return undefined;
  }

  const keystore: KeystoreFile = await readJsonFile(keystoreFilePath);

  return keystore;
}
