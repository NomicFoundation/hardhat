import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import chalk from "chalk";

import { list } from "../../src/tasks/list.js";
import { MemoryKeystore } from "../helpers/MemoryKeystore.js";
import { MockInterruptions } from "../helpers/MockInterruptions.js";
import { MockKeystoreLoader } from "../helpers/MockKeystoreLoader.js";
import { getFullOutput } from "../helpers/get-full-output.js";

const NO_KEYSTORE_SET = `No keystore found. Please set one up using ${chalk.blue.italic("npx hardhat keystore set {key}")} `;

describe("tasks - list", () => {
  let mockKeystore: MemoryKeystore;
  let mockKeystoreLoader: MockKeystoreLoader;
  let mockInterruptions: MockInterruptions;

  beforeEach(() => {
    mockKeystore = new MemoryKeystore();
    mockInterruptions = new MockInterruptions();
    mockKeystoreLoader = new MockKeystoreLoader(mockKeystore);
  });

  it("should indicate that the keystore is not set", async () => {
    mockKeystoreLoader.setNoExistingKeystore();

    await list(mockKeystoreLoader, mockInterruptions);

    assert.equal(
      mockInterruptions.info.mock.calls[0].arguments[0],
      NO_KEYSTORE_SET,
    );
  });

  it("should indicate that the keystore has no keys", async () => {
    await list(mockKeystoreLoader, mockInterruptions);

    assert.equal(
      mockInterruptions.info.mock.calls[0].arguments[0],
      "The keystore does not contain any keys.",
    );
  });

  it("should list the keys", async () => {
    mockKeystore.addNewSecret("key", "value");
    mockKeystore.addNewSecret("key2", "value2");

    await list(mockKeystoreLoader, mockInterruptions);

    assert.equal(
      getFullOutput(mockInterruptions.info, 3),
      `Keys:
key
key2`,
    );
  });
});
