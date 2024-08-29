import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";
import chalk from "chalk";

import { remove } from "../../src/tasks/delete.js";
import { set } from "../../src/tasks/set.js";
import { MockInterruptions } from "../helpers/MockInterruptions.js";
import { MockKeystoreLoader } from "../helpers/MockKeystoreLoader.js";

const NO_KEYSTORE_SET = `No keystore found. Please set one up using ${chalk.blue.italic("npx hardhat keystore set {key}")} `;

describe("tasks - delete", () => {
  let mockKeystoreLoader: MockKeystoreLoader;
  let mockInterruptions: MockInterruptions;

  beforeEach(() => {
    mockInterruptions = new MockInterruptions();
    mockKeystoreLoader = new MockKeystoreLoader();
  });

  it("should delete the key", async () => {
    mockInterruptions.requestSecretInput = async () => "myValue";

    await set(
      { key: "myKey", force: false },
      mockKeystoreLoader,
      mockInterruptions,
    );

    await remove(
      {
        key: "myKey",
      },
      mockKeystoreLoader,
      mockInterruptions,
    );

    assert.equal(
      mockInterruptions.info.mock.calls[1].arguments[0],
      `Key "myKey" removed`,
    );

    const keystore = await mockKeystoreLoader.loadOrInit();
    assert.deepEqual(await keystore.readValue("key"), undefined);
  });

  it("should throw because the key is not specified", async () => {
    await assertRejectsWithHardhatError(
      remove(
        {
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing the error case
          key: undefined as any,
        },
        mockKeystoreLoader,
        mockInterruptions,
      ),
      HardhatError.ERRORS.TASK_DEFINITIONS.MISSING_VALUE_FOR_TASK_ARGUMENT,
      {
        argument: "key",
        task: "keystore delete",
      },
    );
  });

  it("should indicate that the keystore is not set", async () => {
    mockKeystoreLoader.setNoExistingKeystore();

    await remove(
      {
        key: "key",
      },
      mockKeystoreLoader,
      mockInterruptions,
    );

    assert.equal(
      mockInterruptions.info.mock.calls[0].arguments[0],
      NO_KEYSTORE_SET,
    );
  });

  it("should indicate that the key is not found", async () => {
    await remove(
      {
        key: "unknown",
      },
      mockKeystoreLoader,
      mockInterruptions,
    );

    assert.equal(
      mockInterruptions.error.mock.calls[0].arguments[0],
      `Key "unknown" not found`,
    );
  });
});
