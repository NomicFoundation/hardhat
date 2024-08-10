import type { HardhatRuntimeEnvironment } from "@ignored/hardhat-vnext-core/types/hre";
import type repl from "node:repl";

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PassThrough } from "node:stream";
import { afterEach, before, beforeEach, describe, it } from "node:test";

import { ensureError } from "@ignored/hardhat-vnext-utils/error";

import { createHardhatRuntimeEnvironment } from "../../../../src/hre.js";
import consoleAction from "../../../../src/internal/builtin-plugins/console/task-action.js";
import { useFixtureProject } from "../../../helpers/project.js";

describe("console/task-action", function () {
  let hre: HardhatRuntimeEnvironment;
  let options: repl.ReplOptions;

  before(async function () {
    hre = await createHardhatRuntimeEnvironment({});
  });

  beforeEach(function () {
    const input = new PassThrough();
    const output = new PassThrough();
    output.pipe(process.stdout);
    options = {
      input,
      output,
    };
  });

  describe("javascript", function () {
    useFixtureProject("run-js-script");

    it("should throw inside the console if script does not exist", async function () {
      const replServer = await consoleAction(
        {
          commands: ['await import("./scripts/non-existent.js");', ".exit"],
          history: "",
          noCompile: false,
          options,
        },
        hre,
      );
      ensureError(replServer.lastError);
    });

    it("should run a script inside the console successfully", async function () {
      const replServer = await consoleAction(
        {
          commands: [".help", 'await import("./scripts/success.js");', ".exit"],
          history: "",
          noCompile: false,
          options,
        },
        hre,
      );
      assert.equal(replServer.lastError, undefined);
    });

    it("should throw inside the console if the script throws", async function () {
      const replServer = await consoleAction(
        {
          commands: ['await import("./scripts/throws.js");', ".exit"],
          history: "",
          noCompile: false,
          options,
        },
        hre,
      );
      ensureError(replServer.lastError);
    });
  });

  describe("typescript", function () {
    useFixtureProject("run-ts-script");

    it("should throw inside the console if script does not exist", async function () {
      const replServer = await consoleAction(
        {
          commands: ['await import("./scripts/non-existent.ts");', ".exit"],
          history: "",
          noCompile: false,
          options,
        },
        hre,
      );
      ensureError(replServer.lastError);
    });

    it("should run a script inside the console successfully", async function () {
      const replServer = await consoleAction(
        {
          commands: ['await import("./scripts/success.ts");', ".exit"],
          history: "",
          noCompile: false,
          options,
        },
        hre,
      );
      assert.equal(replServer.lastError, undefined);
    });

    it("should throw inside the console if the script throws", async function () {
      const replServer = await consoleAction(
        {
          commands: ['await import("./scripts/throws.ts");', ".exit"],
          history: "",
          noCompile: false,
          options,
        },
        hre,
      );
      ensureError(replServer.lastError);
    });
  });

  describe("context", function () {
    it("should expose the Hardhat Runtime Environment", async function () {
      const replServer = await consoleAction(
        {
          commands: ["console.log(hre);", ".exit"],
          history: "",
          noCompile: false,
          options,
        },
        hre,
      );
      assert.equal(replServer.lastError, undefined);
    });
  });

  describe("history", function () {
    let cacheDir: string;
    let history: string;

    beforeEach(function () {
      cacheDir = fs.mkdtempSync(
        path.resolve(os.tmpdir(), "console-action-test-"),
      );
      history = path.resolve(cacheDir, "console-history.txt");
    });

    afterEach(function () {
      fs.rmSync(cacheDir, { recursive: true, force: true });
    });

    it("should create a history file", async function () {
      assert.ok(
        !fs.existsSync(history),
        "History file exists before running the console",
      );
      const replServer = await consoleAction(
        {
          commands: [".help", ".exit"],
          history,
          noCompile: false,
          options,
        },
        hre,
      );
      assert.equal(replServer.lastError, undefined);
      assert.ok(
        fs.existsSync(history),
        "History file does not exist after running the console",
      );
    });
  });
});
