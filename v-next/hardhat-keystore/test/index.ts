import type { Keystore } from "../src/types.js";
import type { ConfigurationVariable } from "@ignored/hardhat-vnext/types/config";
import type { HardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/types/hre";
import type { Task } from "@ignored/hardhat-vnext/types/tasks";
import type { Mock } from "node:test";

import assert from "node:assert/strict";
import path from "node:path";
import { afterEach, before, beforeEach, describe, it, mock } from "node:test";

import { createHardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/hre";
import { HardhatError } from "@ignored/hardhat-vnext-errors";
import {
  ensureDir,
  readJsonFile,
  remove,
  writeJsonFile,
} from "@ignored/hardhat-vnext-utils/fs";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";
import chalk from "chalk";
import envPaths from "env-paths";

import hardhatKeystorePlugin from "../src/index.js";
import { io } from "../src/io.js";
import { setKeystoreCache } from "../src/utils.js";

const NO_KEYSTORE_SET = `No keystore found. Please set one up using ${chalk.blue.italic("npx hardhat keystore set {key}")} `;

const TEST_PASSWORD = "Password!";
const CONFIG_VAR_KEY = "configVarKey";

async function createKeyStore(pairs: Array<[string, string]>) {
  const keystore: Keystore = {
    version: "",
    keys: {},
  };

  for (const [key, value] of pairs) {
    keystore.keys[key] = value;
  }

  await writeJsonFile(await getKeystoreFilePath(), keystore);
}

async function getKeystore(): Promise<Keystore> {
  return readJsonFile(await getKeystoreFilePath());
}

async function deleteKeystore() {
  return remove(await getKeystoreFilePath());
}

async function getKeystoreFilePath(): Promise<string> {
  const configDirPath = await getConfigDir();
  return path.join(configDirPath, "keystore.json");
}

async function getConfigDir(): Promise<string> {
  const { config } = envPaths("hardhat");
  await ensureDir(config);
  return config;
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
  });

  describe("hook", () => {
    it("should invoke the keystore and return the value from it", async () => {
      await createKeyStore([[CONFIG_VAR_KEY, "value"]]);
      const configVar: ConfigurationVariable = {
        _type: "ConfigurationVariable",
        name: CONFIG_VAR_KEY,
      };

      const resultValue = await hre.hooks.runHandlerChain(
        "configurationVariables",
        "fetchValue",
        [configVar],
        async (_context, _configVar) => {
          return "";
        },
      );

      assert.equal(resultValue, "value");
    });

    it("should invoke the next function because no keystore is found", async () => {
      const configVar: ConfigurationVariable = {
        _type: "ConfigurationVariable",
        name: CONFIG_VAR_KEY,
      };

      const resultValue = await hre.hooks.runHandlerChain(
        "configurationVariables",
        "fetchValue",
        [configVar],
        async (_context, _configVar) => {
          return "value-from-hardhat-package";
        },
      );

      assert.equal(resultValue, "value-from-hardhat-package");
    });

    it("should invoke the next function because the keystore is found but the key is not present", async () => {
      await createKeyStore([["key", "value"]]);
      const configVar: ConfigurationVariable = {
        _type: "ConfigurationVariable",
        name: "missing-key",
      };

      const resultValue = await hre.hooks.runHandlerChain(
        "configurationVariables",
        "fetchValue",
        [configVar],
        async (_context, _configVar) => {
          return "value-from-hardhat-package";
        },
      );

      assert.equal(resultValue, "value-from-hardhat-package");
    });
  });

  describe("tasks", () => {
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

      it("should successfully set the keystore on the first usage", async () => {
        mockRequestSecretInput = mock.method(
          io,
          "requestSecretInput",
          (_msg: string) => TEST_PASSWORD,
        );

        await task.run({ key: "key" });

        assert.equal(mockRequestSecretInput.mock.calls.length, 3);
        // Although 5 messages are asserted, only 4 are checked because a new key is set during the process.
        // We ignore this for now and will test it in the next test.
        assert.equal(mockInfo.mock.calls.length, 5);
        assert.equal(
          mockInfo.mock.calls[0].arguments[0],
          "\n👷🔐 Hardhat-Keystore 🔐👷\n",
        );
        assert.equal(
          mockInfo.mock.calls[1].arguments[0],
          "This is the first time you are using the keystore, please set a password.",
        );
        assert.equal(
          mockInfo.mock.calls[2].arguments[0],
          "The password must have at least 8 characters, one uppercase letter, one lowercase letter, and one special character.",
        );
        assert.equal(mockInfo.mock.calls[3].arguments[0], "");
      });

      it("should successfully set the keystore on the first usage but show password warnings", async () => {
        // Simulate a scenario where a password does not meet the criteria, and another where passwords do not match.
        // The user will eventually correct the password values.
        let count = 0;
        mockRequestSecretInput = mock.method(
          io,
          "requestSecretInput",
          (_msg: string) => {
            let msg = "";

            if (count === 0) {
              // Invalid password
              msg = "invalid";
            } else if (count === 1) {
              // Valid password
              msg = TEST_PASSWORD;
            } else if (count === 2) {
              // Passwords do not match
              msg = "not-matching-password";
            } else {
              // Passwords match
              msg = TEST_PASSWORD;
            }

            count++;
            return msg;
          },
        );

        await task.run({ key: "key" });

        assert.equal(mockRequestSecretInput.mock.calls.length, 5);
        assert.equal(mockInfo.mock.calls.length, 5);
        assert.equal(mockError.mock.calls.length, 2);
        assert.equal(
          mockInfo.mock.calls[0].arguments[0],
          "\n👷🔐 Hardhat-Keystore 🔐👷\n",
        );
        assert.equal(
          mockInfo.mock.calls[1].arguments[0],
          "This is the first time you are using the keystore, please set a password.",
        );
        assert.equal(
          mockInfo.mock.calls[2].arguments[0],
          "The password must have at least 8 characters, one uppercase letter, one lowercase letter, and one special character.",
        );
        assert.equal(mockInfo.mock.calls[3].arguments[0], "");
        assert.equal(mockError.mock.calls[0].arguments[0], "Invalid password!");
        assert.equal(
          mockError.mock.calls[1].arguments[0],
          "Passwords do not match!",
        );
      });

      it("should indicate that the key is not valid", async () => {
        await createKeyStore([["key", "value"]]);

        await task.run({ key: "1key" });

        assert.equal(mockError.mock.calls.length, 1);
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

        assert.equal(mockInfo.mock.calls.length, 1);
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

        assert.equal(mockWarn.mock.calls.length, 1);
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

        assert.equal(mockInfo.mock.calls.length, 1);
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

        assert.equal(mockError.mock.calls.length, 1);
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

        assert.equal(mockInfo.mock.calls.length, 1);
        assert.equal(mockInfo.mock.calls[0].arguments[0], NO_KEYSTORE_SET);
      });

      it("should indicate that the key is not found", async () => {
        await createKeyStore([]);

        await task.run({ key: "key" });

        assert.equal(mockError.mock.calls.length, 1);
        assert.equal(
          mockError.mock.calls[0].arguments[0],
          `Key "key" not found`,
        );
      });

      it("should get the secret", async () => {
        await createKeyStore([["key", "value"]]);

        await task.run({ key: "key" });

        assert.equal(mockInfo.mock.calls.length, 1);
        assert.equal(mockInfo.mock.calls[0].arguments[0], "value");
      });
    });

    describe("list", () => {
      before(() => {
        task = hre.tasks.getTask(["keystore", "list"]);
      });

      it("should indicate that the keystore is not set", async () => {
        await task.run({});

        assert.equal(mockInfo.mock.calls.length, 1);
        assert.equal(mockInfo.mock.calls[0].arguments[0], NO_KEYSTORE_SET);
      });

      it("should indicate that the keystore has no keys", async () => {
        await createKeyStore([]);

        await task.run({});

        assert.equal(mockInfo.mock.calls.length, 1);
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

        assert.equal(mockInfo.mock.calls.length, 3);
        assert.equal(mockInfo.mock.calls[0].arguments[0], "Keys:");
        assert.equal(mockInfo.mock.calls[1].arguments[0], "key");
        assert.equal(mockInfo.mock.calls[2].arguments[0], "key2");
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

        assert.equal(mockInfo.mock.calls.length, 1);
        assert.equal(mockInfo.mock.calls[0].arguments[0], NO_KEYSTORE_SET);
      });

      it("should indicate that the key is not found", async () => {
        await createKeyStore([]);

        await task.run({ key: "key" });

        assert.equal(mockError.mock.calls.length, 1);
        assert.equal(
          mockError.mock.calls[0].arguments[0],
          `Key "key" not found`,
        );
      });

      it("should delete the key", async () => {
        await createKeyStore([["key", "value"]]);

        await task.run({ key: "key" });

        assert.equal(mockInfo.mock.calls.length, 1);
        assert.equal(mockInfo.mock.calls[0].arguments[0], `Key "key" removed`);
        assert.deepEqual(await getKeystore(), { version: "", keys: {} });
      });
    });
  });
});
