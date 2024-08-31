import type { RawInterruptions } from "../../src/types.js";

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import chalk from "chalk";

import { list } from "../../src/tasks/list.js";
import { RawInterruptionsImpl } from "../../src/ui/raw-interruptions.js";
import { getFullOutput } from "../helpers/get-full-output.js";
import { MemoryKeystore } from "../helpers/memory-keystore.js";
import { MockConsoleWrapper } from "../helpers/mock-console-wrapper.js";
import { MockKeystoreLoader } from "../helpers/mock-keystore-loader.js";

const NO_KEYSTORE_SET = `No keystore found. Please set one up using ${chalk.blue.italic("npx hardhat keystore set {key}")} `;

describe("tasks - list", () => {
  let mockKeystore: MemoryKeystore;
  let mockConsoleWrapper: MockConsoleWrapper;
  let mockKeystoreLoader: MockKeystoreLoader;
  let mockInterruptions: RawInterruptions;

  beforeEach(() => {
    mockKeystore = new MemoryKeystore();
    mockConsoleWrapper = new MockConsoleWrapper();
    mockInterruptions = new RawInterruptionsImpl(mockConsoleWrapper);
    mockKeystoreLoader = new MockKeystoreLoader(mockKeystore);
  });

  it("should indicate that the keystore is not set", async () => {
    mockKeystoreLoader.setNoExistingKeystore();

    await list(mockKeystoreLoader, mockInterruptions);

    assert.equal(
      mockConsoleWrapper.info.mock.calls[0].arguments[0],
      NO_KEYSTORE_SET,
    );
  });

  it("should indicate that the keystore has no keys", async () => {
    await list(mockKeystoreLoader, mockInterruptions);

    assert.equal(
      mockConsoleWrapper.info.mock.calls[0].arguments[0],
      "The keystore does not contain any keys.",
    );
  });

  it("should list the keys", async () => {
    mockKeystore.addNewValue("key", "value");
    mockKeystore.addNewValue("key2", "value2");

    await list(mockKeystoreLoader, mockInterruptions);

    assert.equal(
      getFullOutput(mockConsoleWrapper.info, 3),
      `Keys:
key
key2`,
    );
  });
});
