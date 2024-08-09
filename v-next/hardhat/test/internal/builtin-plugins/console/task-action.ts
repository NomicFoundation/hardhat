import type { HardhatRuntimeEnvironment } from "@ignored/hardhat-vnext-core/types/hre";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { ensureError } from "@ignored/hardhat-vnext-utils/error";

import { createHardhatRuntimeEnvironment } from "../../../../src/hre.js";
import consoleAction from "../../../../src/internal/builtin-plugins/console/task-action.js";
import { useFixtureProject } from "../../../helpers/project.js";

describe("console/task-action", function () {
  let hre: HardhatRuntimeEnvironment;

  before(async function () {
    hre = await createHardhatRuntimeEnvironment({});
  });

  describe("javascript", function () {
    useFixtureProject("run-js-script");

    it("should throw inside the console if script does not exist", async function () {
      const replServer = await consoleAction(
        { commands: ['await import("./scripts/non-existent.js");', ".exit"] },
        hre,
      );
      ensureError(replServer.lastError);
    });

    it("should run a script inside the console successfully", async function () {
      const replServer = await consoleAction(
        { commands: ['await import("./scripts/success.js");', ".exit"] },
        hre,
      );
      assert.equal(replServer.lastError, undefined);
    });

    it("should throw inside the console if the script throws", async function () {
      const replServer = await consoleAction(
        { commands: ['await import("./scripts/throws.js");', ".exit"] },
        hre,
      );
      ensureError(replServer.lastError);
    });
  });

  describe("typescript", function () {
    useFixtureProject("run-ts-script");

    it("should throw inside the console if script does not exist", async function () {
      const replServer = await consoleAction(
        { commands: ['await import("./scripts/non-existent.ts");', ".exit"] },
        hre,
      );
      ensureError(replServer.lastError);
    });

    it("should run a script inside the console successfully", async function () {
      const replServer = await consoleAction(
        { commands: ['await import("./scripts/success.ts");', ".exit"] },
        hre,
      );
      assert.equal(replServer.lastError, undefined);
    });

    it("should throw inside the console if the script throws", async function () {
      const replServer = await consoleAction(
        { commands: ['await import("./scripts/throws.ts");', ".exit"] },
        hre,
      );
      ensureError(replServer.lastError);
    });
  });
});
