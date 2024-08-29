import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { UnencryptedKeystoreLoader } from "../../src/keystores/unencrypted-keystore-loader.js";
import { MockInterruptions } from "../helpers/MockInterruptions.js";
import { getFullOutput } from "../helpers/get-full-output.js";

const TEST_PASSWORD = "TEST-PASSWORD";

describe("unencrypted keystore loader", () => {
  let unencryptedKeystoreLoader: UnencryptedKeystoreLoader;
  let mockInterruptions: MockInterruptions;

  beforeEach(() => {
    mockInterruptions = new MockInterruptions();
    unencryptedKeystoreLoader = new UnencryptedKeystoreLoader(
      mockInterruptions,
    );
  });

  it.skip("should successfully show the right configuration message when configuring the keystore on the first usage", async () => {
    mockInterruptions.requestSecretInput = async () => TEST_PASSWORD;

    await unencryptedKeystoreLoader.loadOrInit();

    assert.equal(
      getFullOutput(mockInterruptions.info.mock, 4),
      `
    👷🔐 Hardhat-Keystore 🔐👷
    This is the first time you are using the keystore, please set a password.
    The password must have at least 8 characters, one uppercase letter, one lowercase letter, and one special character.
    `,
    );
  });

  it.skip("should successfully configure the keystore on the first usage but also show password warnings", async () => {
    // Simulate a scenario where a password does not meet the criteria, and another where passwords do not match.
    // The user will eventually correct the password values.
    // The following mock simulate the user's inputs for the password.
    let count = 0;
    mockInterruptions.requestSecretInput = async () => {
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
    };

    await unencryptedKeystoreLoader.loadOrInit();

    // Be sure that the error messages are displayed to the user
    assert.equal(
      mockInterruptions.error.mock.calls[0].arguments[0],
      "Invalid password!",
    );
    assert.equal(
      mockInterruptions.error.mock.calls[1].arguments[0],
      "Passwords do not match!",
    );

    // TODO: bring back check or refocus this test on setting passwords
    // assert.equal(await exists(await getKeystoreFilePath()), true);
  });
});
