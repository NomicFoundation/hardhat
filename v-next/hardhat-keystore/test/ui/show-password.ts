import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import chalk from "chalk";

import { UserInteractions } from "../../src/internal/ui/user-interactions.js";
import { getFullOutput } from "../helpers/get-full-output.js";
import { MockUserInterruptionManager } from "../helpers/mock-user-interruption-manager.js";

const VALID_PASSWORD = "MyPassword123!";
const ANOTHER_VALID_PASSWORD = "MyOtherPassword123!";
const INVALID_PASSWORD = "password";

/**
 * TODO: These tests should be moved into the keystore file setup
 * tests once encryption is implemented. Currently the setup
 * password flow is not used.
 */
describe("user interactions - requesting a password from a user", () => {
  let mockUserInterruptionManager: MockUserInterruptionManager;
  let userInteractions: UserInteractions;
  let password: string;

  beforeEach(() => {
    mockUserInterruptionManager = new MockUserInterruptionManager();
    userInteractions = new UserInteractions(mockUserInterruptionManager);
  });

  describe("when the user enters a valid password", () => {
    beforeEach(async () => {
      mockUserInterruptionManager.requestSecretInput = async () =>
        VALID_PASSWORD;

      password = await userInteractions.setUpPassword();
    });

    it("should display the password setup message", async () => {
      assert.equal(
        getFullOutput(mockUserInterruptionManager.displayMessage, 4),
        `
👷🔐 Hardhat-Keystore 🔐👷

This is the first time you are using the keystore, please set a password.
The password must have at least 8 characters, one uppercase letter, one lowercase letter, and one special character.
`,
      );
    });

    it("should return the password entered by the user", async () => {
      assert.equal(password, VALID_PASSWORD);
    });
  });

  describe("when the user enters an invalid password then a valid password", () => {
    beforeEach(async () => {
      let count = 0;
      mockUserInterruptionManager.requestSecretInput = async () => {
        if (count === 0) {
          count++;
          return INVALID_PASSWORD;
        } else {
          return VALID_PASSWORD;
        }
      };

      password = await userInteractions.setUpPassword();
    });

    it("should display the invalid password message", async () => {
      assert.equal(
        mockUserInterruptionManager.displayMessage.mock.calls[4].arguments[1],
        chalk.red("Invalid password!"),
      );
    });
  });

  describe("when the user enters fails to repeat the password the same both times", () => {
    beforeEach(async () => {
      let count = 0;
      mockUserInterruptionManager.requestSecretInput = async () => {
        if (count === 0) {
          count++;
          return VALID_PASSWORD;
        } else if (count === 1) {
          count++;
          return ANOTHER_VALID_PASSWORD;
        } else {
          return VALID_PASSWORD;
        }
      };

      password = await userInteractions.setUpPassword();
    });

    it("should display the mismatched password message", async () => {
      assert.equal(
        mockUserInterruptionManager.displayMessage.mock.calls[4].arguments[1],
        chalk.red("Passwords do not match!"),
      );
    });
  });
});
