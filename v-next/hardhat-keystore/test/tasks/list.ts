import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import chalk from "chalk";

import { list } from "../../src/tasks/list.js";
import { UserInteractions } from "../../src/ui/user-interactions.js";
import { getFullOutput } from "../helpers/get-full-output.js";
import { MemoryKeystore } from "../helpers/memory-keystore.js";
import { MockConsoleWrapper } from "../helpers/mock-console-wrapper.js";
import { MockKeystoreLoader } from "../helpers/mock-keystore-loader.js";

describe("tasks - list", () => {
  let mockKeystore: MemoryKeystore;
  let mockConsoleWrapper: MockConsoleWrapper;
  let mockKeystoreLoader: MockKeystoreLoader;
  let userInteractions: UserInteractions;

  beforeEach(() => {
    mockKeystore = new MemoryKeystore();
    mockConsoleWrapper = new MockConsoleWrapper();
    userInteractions = new UserInteractions(mockConsoleWrapper);
    mockKeystoreLoader = new MockKeystoreLoader(mockKeystore);
  });

  it("should indicate that the keystore is not set", async () => {
    mockKeystoreLoader.setNoExistingKeystore();

    await list(mockKeystoreLoader, userInteractions);

    assert.equal(
      mockConsoleWrapper.displayMessage.mock.calls[0].arguments[1],
      `No keystore found. Please set one up using ${chalk.blue.italic("npx hardhat keystore set {key}")} `,
    );
  });

  it("should indicate that the keystore has no keys", async () => {
    await list(mockKeystoreLoader, userInteractions);

    assert.equal(
      mockConsoleWrapper.displayMessage.mock.calls[0].arguments[1],
      "The keystore does not contain any keys.",
    );
  });

  it("should list the keys", async () => {
    mockKeystore.addNewValue("key", "value");
    mockKeystore.addNewValue("key2", "value2");

    await list(mockKeystoreLoader, userInteractions);

    assert.equal(
      getFullOutput(mockConsoleWrapper.displayMessage, 3),
      `Keys:
key
key2`,
    );
  });
});
