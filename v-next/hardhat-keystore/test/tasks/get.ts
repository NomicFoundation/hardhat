import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";
import chalk from "chalk";

import { get } from "../../src/tasks/get.js";
import { MemoryKeystore } from "../helpers/MemoryKeystore.js";
import { MockInterruptions } from "../helpers/MockInterruptions.js";
import { MockKeystoreLoader } from "../helpers/MockKeystoreLoader.js";

const NO_KEYSTORE_SET = `No keystore found. Please set one up using ${chalk.blue.italic("npx hardhat keystore set {key}")} `;

describe("tasks - get", () => {
  let mockKeystore: MemoryKeystore;
  let mockKeystoreLoader: MockKeystoreLoader;
  let mockInterruptions: MockInterruptions;

  beforeEach(() => {
    mockKeystore = new MemoryKeystore();
    mockInterruptions = new MockInterruptions();
    mockKeystoreLoader = new MockKeystoreLoader(mockKeystore);
  });

  it("should get the secret", async () => {
    mockKeystore.addNewSecret("myKey", "myValue");

    await get(
      {
        key: "myKey",
      },
      mockKeystoreLoader,
      mockInterruptions,
    );

    assert.equal(mockInterruptions.info.mock.calls[0].arguments[0], "myValue");
  });

  it("should throw because the key is not specified", async () => {
    await assertRejectsWithHardhatError(
      get(
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
        task: "keystore get",
      },
    );
  });

  it("should indicate that the keystore is not set", async () => {
    mockKeystoreLoader.setNoExistingKeystore();

    await get(
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
    await get(
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
