import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import chalk from "chalk";

import { list } from "../../src/tasks/list.js";
import { set } from "../../src/tasks/set.js";
import { MockInterruptions } from "../helpers/MockInterruptions.js";
import { MockKeystoreLoader } from "../helpers/MockKeystoreLoader.js";
import { getFullOutput } from "../helpers/get-full-output.js";

const NO_KEYSTORE_SET = `No keystore found. Please set one up using ${chalk.blue.italic("npx hardhat keystore set {key}")} `;

describe("tasks - list", () => {
  let mockKeystoreLoader: MockKeystoreLoader;
  let mockInterruptions: MockInterruptions;

  beforeEach(() => {
    mockInterruptions = new MockInterruptions();
    mockKeystoreLoader = new MockKeystoreLoader();
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
    mockInterruptions.requestSecretInput = async () => "value";

    await set(
      { key: "key", force: false },
      mockKeystoreLoader,
      mockInterruptions,
    );

    mockInterruptions.requestSecretInput = async () => "value2";

    await set(
      { key: "key2", force: false },
      mockKeystoreLoader,
      mockInterruptions,
    );

    mockInterruptions.info.mock.resetCalls();

    await list(mockKeystoreLoader, mockInterruptions);

    assert.equal(
      getFullOutput(mockInterruptions.info, 3),
      `Keys:
key
key2`,
    );
  });
});
