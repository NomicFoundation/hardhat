import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { styleText } from "node:util";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertRejectsWithHardhatError,
  assertThrowsHardhatError,
} from "@nomicfoundation/hardhat-test-utils";
import { isCi } from "@nomicfoundation/hardhat-utils/ci";

import { main, parseHhuGlobalOptions } from "../../../src/internal/cli/hhu.js";
import { createHardhatRuntimeEnvironment } from "../../../src/internal/hre-initialization.js";
import { getHardhatVersion } from "../../../src/internal/utils/package.js";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

async function runHhu(command: string): Promise<string[]> {
  const lines: string[] = [];

  const cliArguments = command.split(" ").slice(2);

  await main(cliArguments, {
    print: (message) => {
      lines.push(message);
    },
    rethrowErrors: true,
  });

  return lines;
}

describe("hhu", () => {
  describe("main", () => {
    describe("--version", () => {
      it("should print the version and instantly return", async () => {
        const lines = await runHhu("npx hhu --version");

        assert.deepEqual(lines, [await getHardhatVersion()]);
      });
    });

    describe("global help", () => {
      it("should print the hhu global help with un-prefixed tasks", async () => {
        const help = (await runHhu("npx hhu")).join("");

        const expected = `Hardhat version ${await getHardhatVersion()}

Usage: hhu [GLOBAL OPTIONS] <TASK> [SUBTASK] [TASK OPTIONS] [--] [TASK ARGUMENTS]

AVAILABLE SUBTASKS:

  constants zeroAddress      Print the zero address
  convert pad                Pad a hex string to a given byte length

GLOBAL OPTIONS:

  --help, -h                 Show this message, or a task's help if its name is provided
  --show-stack-traces        Show stack traces (always enabled on CI servers)
  --version                  Show the version of hhu

To get help for a specific task run: npx hhu <TASK> [SUBTASK] --help`;

        assert.equal(help, expected);
      });
    });

    describe("task help", () => {
      it("should print the help for an empty task (namespace)", async () => {
        const help = (await runHhu("npx hhu constants --help")).join("");

        const expected = `${styleText("bold", "Commonly used Ethereum constants")}

Usage: hhu [GLOBAL OPTIONS] constants <SUBTASK> [SUBTASK OPTIONS] [--] [SUBTASK POSITIONAL ARGUMENTS]

AVAILABLE SUBTASKS:

  constants zeroAddress      Print the zero address

GLOBAL OPTIONS:

  --help, -h                 Show this message, or a task's help if its name is provided
  --show-stack-traces        Show stack traces (always enabled on CI servers)
  --version                  Show the version of hhu

To get help for a specific task run: npx hhu constants <SUBTASK> --help`;

        assert.equal(help, expected);
      });

      it("should print the help for a task with an action", async () => {
        const help = (
          await runHhu("npx hhu constants zeroAddress --help")
        ).join("");

        const expected = `${styleText("bold", "Print the zero address")}

Usage: hhu [GLOBAL OPTIONS] constants zeroAddress

GLOBAL OPTIONS:

  --help, -h               Show this message, or a task's help if its name is provided
  --show-stack-traces      Show stack traces (always enabled on CI servers)
  --version                Show the version of hhu
`;

        assert.equal(help, expected);
      });
    });

    describe("errors", () => {
      it("should throw when the task does not exist", async () => {
        await assertRejectsWithHardhatError(
          () => runHhu("npx hhu nonExistentTask"),
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.TASK_NOT_FOUND,
          { task: "nonExistentTask" },
        );
      });

      it("should throw when the subtask does not exist", async () => {
        await assertRejectsWithHardhatError(
          () => runHhu("npx hhu constants nonExistentSubtask"),
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.UNRECOGNIZED_SUBTASK,
          { task: "constants", invalidSubtask: "nonExistentSubtask" },
        );
      });
    });
  });

  describe("parseHhuGlobalOptions", () => {
    it("should set hhu's global options", async () => {
      const command = "npx hhu --help --version --show-stack-traces";
      const cliArguments = command.split(" ").slice(2);
      const usedCliArguments = new Array(cliArguments.length).fill(false);

      const hhuGlobalOptions = await parseHhuGlobalOptions(
        cliArguments,
        usedCliArguments,
      );

      assert.deepEqual(usedCliArguments, [true, true, true]);
      assert.deepEqual(hhuGlobalOptions, {
        help: true,
        showStackTraces: true,
        version: true,
      });
    });

    it("should not set any of hhu's global options", async () => {
      const hhuGlobalOptions = await parseHhuGlobalOptions([], []);

      assert.deepEqual(hhuGlobalOptions, {
        help: false,
        showStackTraces: isCi(),
        version: false,
      });
    });
  });

  describe("utils prefix", () => {
    it("should not be used by hhu, while Hardhat does not expose the un-prefixed tasks", async () => {
      // hhu must NOT understand the Hardhat-style `utils` prefix.
      await assertRejectsWithHardhatError(
        () => runHhu("npx hhu utils constants zeroAddress"),
        HardhatError.ERRORS.CORE.TASK_DEFINITIONS.TASK_NOT_FOUND,
        { task: "utils" },
      );

      // Hardhat must NOT understand the hhu-style un-prefixed task.
      const hre = await createHardhatRuntimeEnvironment({}, {}, process.cwd());
      assertThrowsHardhatError(
        () => hre.tasks.getTask(["constants", "zeroAddress"]),
        HardhatError.ERRORS.CORE.TASK_DEFINITIONS.TASK_NOT_FOUND,
        { task: "constants" },
      );
    });
  });

  describe("smoke tests", () => {
    let logs: string[] = [];
    const originalLog = console.log;

    beforeEach(() => {
      logs = [];
      console.log = (...args: unknown[]) => {
        logs.push(args.join(" "));
      };
    });

    afterEach(() => {
      console.log = originalLog;
    });

    it("`constants zeroAddress` should print the zero address", async () => {
      await runHhu("npx hhu constants zeroAddress");

      assert.deepEqual(logs, [ZERO_ADDRESS]);
    });

    it("`convert pad` should pad to the left by default", async () => {
      await runHhu("npx hhu convert pad --length 8 ff");

      assert.deepEqual(logs, ["0x00000000000000ff"]);
    });

    it("`convert pad --right` should pad to the right", async () => {
      await runHhu("npx hhu convert pad --length 4 --right 0xff");

      assert.deepEqual(logs, ["0xff000000"]);
    });
  });
});
