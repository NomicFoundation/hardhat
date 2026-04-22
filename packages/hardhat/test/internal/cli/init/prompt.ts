import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import {
  promptForForce,
  promptForInstall,
  promptForTemplate,
  promptForWorkspace,
} from "../../../../src/internal/cli/init/prompt.js";

describe("promptForWorkspace", () => {
  it("should fail if the user is not in an interactive shell", async () => {
    if (!process.stdout.isTTY) {
      await assertRejectsWithHardhatError(
        async () => await promptForWorkspace(),
        HardhatError.ERRORS.CORE.GENERAL.NOT_IN_INTERACTIVE_SHELL,
        {},
      );
    }
  });
});

describe("promptForTemplate", () => {
  it("should fail if the user is not in an interactive shell", async () => {
    if (!process.stdout.isTTY) {
      await assertRejectsWithHardhatError(
        async () => await promptForTemplate([]),
        HardhatError.ERRORS.CORE.GENERAL.NOT_IN_INTERACTIVE_SHELL,
        {},
      );
    }
  });
});

describe("promptForForce", () => {
  it("should fail if the user is not in an interactive shell", async () => {
    if (!process.stdout.isTTY) {
      await assertRejectsWithHardhatError(
        async () => await promptForForce([]),
        HardhatError.ERRORS.CORE.GENERAL.NOT_IN_INTERACTIVE_SHELL,
        {},
      );
    }
  });
});

describe("promptForInstall", () => {
  it("should fail if the user is not in an interactive shell", async () => {
    if (!process.stdout.isTTY) {
      await assertRejectsWithHardhatError(
        async () => await promptForInstall("foo"),
        HardhatError.ERRORS.CORE.GENERAL.NOT_IN_INTERACTIVE_SHELL,
        {},
      );
    }
  });
});
