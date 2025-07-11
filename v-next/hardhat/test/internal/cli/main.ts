import type {
  GlobalOptionDefinitions,
  GlobalOptionDefinitionsEntry,
} from "../../../src/types/global-options.js";
import type { HardhatRuntimeEnvironment } from "../../../src/types/hre.js";
import type {
  NewTaskDefinitionBuilder,
  NewTaskDefinition,
  Task,
  TaskArguments,
} from "../../../src/types/tasks.js";

import assert from "node:assert/strict";
import { afterEach, before, describe, it, mock } from "node:test";
import { pathToFileURL } from "node:url";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertThrowsHardhatError,
  assertRejectsWithHardhatError,
  useFixtureProject,
} from "@nomicfoundation/hardhat-test-utils";
import { isCi } from "@nomicfoundation/hardhat-utils/ci";
import chalk from "chalk";
import debug from "debug";

import {
  main,
  parseGlobalOptions,
  parseBuiltinGlobalOptions,
  parseTask,
  parseTaskArguments,
  parseRawArguments,
} from "../../../src/internal/cli/main.js";
import {
  globalOption,
  globalFlag,
  task,
  globalLevel,
} from "../../../src/internal/core/config.js";
import { resetGlobalHardhatRuntimeEnvironment } from "../../../src/internal/global-hre-instance.js";
import { createHardhatRuntimeEnvironment } from "../../../src/internal/hre-initialization.js";
import { getHardhatVersion } from "../../../src/internal/utils/package.js";
import { ArgumentType } from "../../../src/types/arguments.js";

async function getTasksAndHreEnvironment(
  tasksBuilders: NewTaskDefinitionBuilder[],
  subtasksBuilders: NewTaskDefinitionBuilder[],
): Promise<{
  hre: HardhatRuntimeEnvironment;
  tasks: NewTaskDefinition[];
  subtasks: NewTaskDefinition[];
}> {
  const tasks: NewTaskDefinition[] = [];
  const subtasks: NewTaskDefinition[] = [];

  for (const t of tasksBuilders) {
    tasks.push(t.setAction(() => {}).build());
  }

  for (const s of subtasksBuilders) {
    subtasks.push(s.setAction(() => {}).build());
  }

  const hre = await createHardhatRuntimeEnvironment({
    tasks: tasks.concat(subtasks),
  });

  return {
    hre,
    tasks,
    subtasks,
  };
}

async function getTasksAndSubtaskResults(
  configFileName: string = "hardhat.config.ts",
) {
  /* To ensure that one or more tasks have been executed, each task will modify
   * an array of boolean values, initially set to false. This function imports
   * that array, allowing the tests to verify if the tasks have been executed.
   * If a boolean flag is true, it indicates that the corresponding task (or a
   * specific part of it) has been executed. The array is set in the
   * hardhat.config.ts file of the fixture project. */
  return (
    await import(pathToFileURL(`${process.cwd()}/${configFileName}`).toString())
  ).tasksResults;
}

async function runMain(command: string): Promise<string[]> {
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

describe("main", function () {
  describe("main", function () {
    afterEach(function () {
      resetGlobalHardhatRuntimeEnvironment();
    });

    describe("version", function () {
      useFixtureProject("cli/parsing/base-project");

      it("should print the version and instantly return", async function () {
        const command = "npx hardhat --version";
        const lines = await runMain(command);

        // Get the expected package version
        const expectedVersion = await getHardhatVersion();

        assert.equal(lines.length, 1);
        assert.equal(lines[0], expectedVersion);
        // Check that the process exits right after printing the version, the
        // remaining parsing logic should not be executed
        const tasksResults = await getTasksAndSubtaskResults();
        assert.equal(tasksResults.wasArg1Used, false);
      });
    });

    describe("different configuration file path", function () {
      useFixtureProject("cli/parsing/user-config");

      it("should load the hardhat configuration file from a custom path (--config)", async function () {
        const command =
          "npx hardhat --config ./user-hardhat.config.ts user-task";
        await runMain(command);

        const tasksResults = await getTasksAndSubtaskResults(
          "user-hardhat.config.ts",
        );
        assert.equal(tasksResults.wasArg1Used, true);
      });
    });

    describe("one of the hardhat default task with global flags and arguments", async function () {
      useFixtureProject("cli/parsing/base-project");

      it("should run one of the hardhat default task", async function () {
        const command = "npx hardhat --show-stack-traces clean";
        await runMain(command);
      });
    });

    describe("task with global flags and arguments", async function () {
      useFixtureProject("cli/parsing/tasks-and-subtasks");

      it("should run the task with global flags and arguments", async function () {
        const command =
          "npx hardhat --show-stack-traces task --arg1 <value1> <value2> <value3>";

        await runMain(command);

        const tasksResults = await getTasksAndSubtaskResults();
        assert.deepEqual(tasksResults.wasArg1Used, true);
        assert.deepEqual(tasksResults.wasArg2Used, true);
        assert.deepEqual(tasksResults.wasArg3Used, true);
      });

      it("should run the task with the default value", async function () {
        const command = "npx hardhat task-default --show-stack-traces";
        await runMain(command);

        const tasksResults = await getTasksAndSubtaskResults();
        assert.deepEqual(tasksResults.wasArg1Used, true);
        assert.deepEqual(tasksResults.wasArg2Used, false);
        assert.deepEqual(tasksResults.wasArg3Used, false);
      });

      it("should run the subtask with global flags and arguments", async function () {
        const command =
          "npx hardhat task subtask --arg1 <value1> --show-stack-traces <value2> <value3>";
        await runMain(command);

        const tasksResults = await getTasksAndSubtaskResults();
        assert.deepEqual(tasksResults.wasArg1Used, true);
        assert.deepEqual(tasksResults.wasArg2Used, true);
        assert.deepEqual(tasksResults.wasArg3Used, true);
      });

      it("should run the subtask with the default value", async function () {
        const command =
          "npx hardhat task-default --show-stack-traces subtask-default";
        await runMain(command);

        const tasksResults = await getTasksAndSubtaskResults();
        assert.deepEqual(tasksResults.wasArg1Used, true);
        assert.deepEqual(tasksResults.wasArg2Used, false);
        assert.deepEqual(tasksResults.wasArg3Used, false);
      });
    });

    describe("task with non existing subtask", function () {
      useFixtureProject("cli/parsing/tasks-and-subtasks");

      it("should throw because the subtask does not exist", async function () {
        const command = "npx hardhat task-default-3 nonExistingTask";

        await assertRejectsWithHardhatError(
          () => runMain(command),
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.UNRECOGNIZED_SUBTASK,
          {
            task: "task-default-3",
            invalidSubtask: "nonExistingTask",
          },
        );
      });
    });

    describe("global help", function () {
      useFixtureProject("cli/parsing/base-project");

      it("should print the global help", async function () {
        const command = "npx hardhat";
        const lines = await runMain(command);

        const expected = `Hardhat version ${await getHardhatVersion()}

Usage: hardhat [GLOBAL OPTIONS] <TASK> [SUBTASK] [TASK OPTIONS] [--] [TASK ARGUMENTS]

AVAILABLE TASKS:

  clean                    Clears the cache and deletes all artifacts
  compile                  Compiles your project
  console                  Opens a hardhat console
  flatten                  Flattens and prints contracts and their dependencies
  node                     Starts a JSON-RPC server on top of Hardhat Network
  run                      Runs a user-defined script after compiling the project
  task                     A task that uses arg1
  telemetry                Displays and modifies your telemetry settings
  test                     Runs all your tests

AVAILABLE SUBTASKS:

  test solidity            Run the Solidity tests

GLOBAL OPTIONS:

  --build-profile          The build profile to use
  --config                 A Hardhat config file.
  --coverage               Enables code coverage
  --help                   Shows this message, or a task's help if its name is provided.
  --init                   Initializes a Hardhat project.
  --network                The network to connect to
  --show-stack-traces      Show stack traces (always enabled on CI servers).
  --version                Shows hardhat's version.

To get help for a specific task run: npx hardhat <TASK> [SUBTASK] --help`;

        assert.equal(lines.join(""), expected);
      });
    });

    describe("subtask help", function () {
      describe("empty subtask", () => {
        useFixtureProject("cli/parsing/subtask-help");

        it("should print an help message for the task's subtask", async function () {
          const command = "npx hardhat empty-task --help";
          const lines = await runMain(command);

          const expected = `${chalk.bold("empty task description")}

Usage: hardhat [GLOBAL OPTIONS] empty-task <SUBTASK> [SUBTASK OPTIONS] [--] [SUBTASK POSITIONAL ARGUMENTS]
`;

          assert.equal(lines.join(""), expected);
        });
      });

      describe("subtask does not exist", () => {
        useFixtureProject("cli/parsing/tasks-and-subtasks");

        it("should throw because the help option cannot be used on a non-existent subtask", async function () {
          const command = "npx hardhat task-default-3 nonExistingTask --help";

          await assertRejectsWithHardhatError(
            () => runMain(command),
            HardhatError.ERRORS.CORE.TASK_DEFINITIONS.UNRECOGNIZED_SUBTASK,
            {
              task: "task-default-3",
              invalidSubtask: "nonExistingTask",
            },
          );
        });
      });

      describe("task with default values", () => {
        useFixtureProject("cli/parsing/default-values");

        it("should print the default values for the task's subtask", async function () {
          const command = "npx hardhat test-task --help";
          const lines = await runMain(command);

          const expected = `${chalk.bold("description")}

Usage: hardhat [GLOBAL OPTIONS] test-task [--opt <STRING>] [--] pos1 [pos2] [var1]

OPTIONS:

  --opt      opt description (default: opt default value)

POSITIONAL ARGUMENTS:

  pos1       pos1 description
  pos2       pos2 description (default: pos2 default value)
  var1       var1 description (default: var1 default value 1, var1 default value 2)

For global options help run: hardhat --help`;

          assert.equal(lines.join(""), expected);
        });
      });
    });

    describe("task help", function () {
      useFixtureProject("cli/parsing/base-project");

      it("should print an help message for the task", async function () {
        const command = "npx hardhat task --help";
        const lines = await runMain(command);

        const expected = `${chalk.bold("A task that uses arg1")}

Usage: hardhat [GLOBAL OPTIONS] task [--arg-1 <STRING>] [--arg-4] [--arg-5 <LEVEL>] [--] arg2 arg3

OPTIONS:

  --arg-1, -o       (default: <default-value1>)
  --arg-4, -f       (default: false)
  --arg-5, -l       (default: 0)

POSITIONAL ARGUMENTS:

  arg2
  arg3

For global options help run: hardhat --help`;

        assert.equal(lines.join(""), expected);
      });
    });
  });

  describe("parseBuiltinGlobalOptions", function () {
    it("should set all the builtin global options", async function () {
      // All the <value> and "task" should be ignored
      const command =
        "npx hardhat --help <value> --version --show-stack-traces task --config ./path-to-config <value>";

      const cliArguments = command.split(" ").slice(2);
      const usedCliArguments = new Array(cliArguments.length).fill(false);

      const builtinGlobalOptions = await parseBuiltinGlobalOptions(
        cliArguments,
        usedCliArguments,
      );

      assert.deepEqual(usedCliArguments, [
        true,
        false,
        true,
        true,
        false,
        true,
        true,
        false,
      ]);
      assert.deepEqual(builtinGlobalOptions, {
        init: false,
        configPath: "./path-to-config",
        showStackTraces: true,
        help: true,
        version: true,
      });
    });

    it("should not set any builtin global option", async function () {
      const command = "npx hardhat <value> --random-flag";

      const cliArguments = command.split(" ").slice(2);
      const usedCliArguments = new Array(cliArguments.length).fill(false);

      const builtinGlobalOptions = await parseBuiltinGlobalOptions(
        cliArguments,
        usedCliArguments,
      );

      assert.deepEqual(
        usedCliArguments,
        new Array(cliArguments.length).fill(false),
      );

      // In the GitHub CI this value is true, but in the local environment it is false
      const expected = isCi();

      assert.deepEqual(builtinGlobalOptions, {
        init: false,
        configPath: undefined,
        showStackTraces: expected,
        help: false,
        version: false,
      });
    });

    it("should recognize the init command", async function () {
      const command = "npx hardhat --init --show-stack-traces";

      const cliArguments = command.split(" ").slice(2);
      const usedCliArguments = new Array(cliArguments.length).fill(false);

      const builtinGlobalOptions = await parseBuiltinGlobalOptions(
        cliArguments,
        usedCliArguments,
      );

      assert.deepEqual(builtinGlobalOptions, {
        init: true,
        configPath: undefined,
        showStackTraces: true,
        help: false,
        version: false,
      });
    });

    it("should throw an error because the config arg cannot be used with the init command", async function () {
      const command = "npx hardhat --config ./path1 --init";

      const cliArguments = command.split(" ").slice(2);
      const usedCliArguments = new Array(cliArguments.length).fill(false);

      await assertRejectsWithHardhatError(
        async () => parseBuiltinGlobalOptions(cliArguments, usedCliArguments),
        HardhatError.ERRORS.CORE.ARGUMENTS.CANNOT_COMBINE_INIT_AND_CONFIG_PATH,
        {},
      );
    });

    it("should throw an error because the config arg is passed twice", async function () {
      const command = "npx hardhat --config ./path1 --config ./path2";

      const cliArguments = command.split(" ").slice(2);
      const usedCliArguments = new Array(cliArguments.length).fill(false);

      await assertRejectsWithHardhatError(
        async () => parseBuiltinGlobalOptions(cliArguments, usedCliArguments),
        HardhatError.ERRORS.CORE.ARGUMENTS.DUPLICATED_NAME,
        {
          name: "--config",
        },
      );
    });

    it("should throw an error because the config arg is passed but there is no path after it", async function () {
      const command = "npx hardhat --config";

      const cliArguments = command.split(" ").slice(2);
      const usedCliArguments = new Array(cliArguments.length).fill(false);

      await assertRejectsWithHardhatError(
        async () => parseBuiltinGlobalOptions(cliArguments, usedCliArguments),
        HardhatError.ERRORS.CORE.ARGUMENTS.MISSING_CONFIG_FILE,
        {},
      );
    });
  });

  describe("parseGlobalOptions", function () {
    /* The function "parseGlobalOptions" utilizes "parseOptions" for parsing,
     * similar to task options. Tests for "parseOptions" are primarily located
     * in the task option section. */

    const testCases = {
      "with long names": {
        arg: "--arg",
        flag: "--flag",
        taskFlag: "--taskFlag",
      },
      "with short names": {
        arg: "-a",
        flag: "-f",
        taskFlag: "-t",
      },
    };

    let globalOptionDefinitions: GlobalOptionDefinitions;

    before(function () {
      const GLOBAL_OPTION = globalOption({
        name: "arg",
        shortName: "a",
        type: ArgumentType.STRING,
        defaultValue: "default",
        description: "",
      });

      const GLOBAL_FLAG = globalFlag({
        name: "flag",
        shortName: "f",
        description: "",
      });

      const GLOBAL_LEVEL = globalLevel({
        name: "verbosity",
        shortName: "v",
        description: "",
      });

      globalOptionDefinitions = new Map<string, GlobalOptionDefinitionsEntry>([
        ["arg", { pluginId: "1", option: GLOBAL_OPTION }],
        ["flag", { pluginId: "1", option: GLOBAL_FLAG }],
        ["verbosity", { pluginId: "1", option: GLOBAL_LEVEL }],
      ]);
    });

    for (const [name, { arg, flag, taskFlag }] of Object.entries(testCases)) {
      describe(name, () => {
        it("should get the global option with the values passed in the cli", async function () {
          const command = `npx hardhat task ${arg} <value1> <value2> <value3>`;

          const cliArguments = command.split(" ").slice(2);
          const usedCliArguments = new Array(cliArguments.length).fill(false);

          const globalOptions = await parseGlobalOptions(
            globalOptionDefinitions,
            cliArguments,
            usedCliArguments,
          );

          assert.deepEqual(usedCliArguments, [false, true, true, false, false]);
          assert.deepEqual(globalOptions, {
            arg: "<value1>",
          });
        });

        it("should have a flag behavior (no bool value required after)", async function () {
          const command = `npx hardhat task ${flag} <value>`;

          const cliArguments = command.split(" ").slice(2);
          const usedCliArguments = new Array(cliArguments.length).fill(false);

          const globalOptions = await parseGlobalOptions(
            globalOptionDefinitions,
            cliArguments,
            usedCliArguments,
          );

          assert.deepEqual(usedCliArguments, [false, true, false]);
          assert.deepEqual(globalOptions, {
            flag: true,
          });
        });

        it("should not parse the bool value after the flag", async function () {
          const command = `npx hardhat task ${flag} true <value>`;

          const cliArguments = command.split(" ").slice(2);
          const usedCliArguments = new Array(cliArguments.length).fill(false);

          const globalOptions = await parseGlobalOptions(
            globalOptionDefinitions,
            cliArguments,
            usedCliArguments,
          );

          assert.deepEqual(usedCliArguments, [false, true, false, false]);
          assert.deepEqual(globalOptions, {
            flag: true,
          });
        });

        it("should not fail when a global option is not recognized (it might be a task option)", async function () {
          const command = `npx hardhat task ${taskFlag} <value>`;

          const cliArguments = command.split(" ").slice(2);
          const usedCliArguments = new Array(cliArguments.length).fill(false);

          const globalOptions = await parseGlobalOptions(
            globalOptionDefinitions,
            cliArguments,
            usedCliArguments,
          );

          assert.deepEqual(usedCliArguments, [false, false, false]);
          assert.deepEqual(globalOptions, {});
        });
      });
    }

    it("should have a long name level behaviour (value is required)", async function () {
      const command = "npx hardhat task --verbosity 4";

      const cliArguments = command.split(" ").slice(2);
      const usedCliArguments = new Array(cliArguments.length).fill(false);

      const globalOptions = await parseGlobalOptions(
        globalOptionDefinitions,
        cliArguments,
        usedCliArguments,
      );

      assert.deepEqual(usedCliArguments, [false, true, true]);
      assert.deepEqual(globalOptions, {
        verbosity: 4,
      });
    });

    it("should have a short name level behaviour (grouped repetition is allowed)", async function () {
      const command = "npx hardhat task -vvvv";

      const cliArguments = command.split(" ").slice(2);
      const usedCliArguments = new Array(cliArguments.length).fill(false);

      const globalOptions = await parseGlobalOptions(
        globalOptionDefinitions,
        cliArguments,
        usedCliArguments,
      );

      assert.deepEqual(usedCliArguments, [false, true]);
      assert.deepEqual(globalOptions, {
        verbosity: 4,
      });
    });
  });

  describe("parseTaskAndArguments", function () {
    // This is not an ideal way to test these two functions now that they're split apart,
    // but I don't think it's worth the time to refactor all of these tests right now since the logic is the same.
    function parseTaskAndArguments(
      cliArguments: string[],
      usedCliArguments: boolean[],
      hreLocal: HardhatRuntimeEnvironment,
    ):
      | {
          task: Task;
          taskArguments: TaskArguments;
        }
      | string[] {
      const parsedTask = parseTask(cliArguments, usedCliArguments, hreLocal);
      if (Array.isArray(parsedTask)) {
        return parsedTask;
      }

      return {
        task: parsedTask,
        taskArguments: parseTaskArguments(
          cliArguments,
          usedCliArguments,
          parsedTask,
        ),
      };
    }

    let hre: HardhatRuntimeEnvironment;
    let tasks: NewTaskDefinition[];
    let subtasks: NewTaskDefinition[];

    // Define your tasks and subtasks here.
    // tasksBuilders and subtasksBuilders are defined in the "before()" hooks before every "functionality test groups".
    let tasksBuilders: NewTaskDefinitionBuilder[] = [];
    let subtasksBuilders: NewTaskDefinitionBuilder[] = [];

    describe("only task and subtask", function () {
      before(async function () {
        tasksBuilders = [task(["task0"])];

        subtasksBuilders = [task(["task0", "subtask0"])];

        ({ hre, tasks, subtasks } = await getTasksAndHreEnvironment(
          tasksBuilders,
          subtasksBuilders,
        ));
      });

      it("should get the tasks and the subtask and skip the global option", function () {
        const command = "npx hardhat task0 --network localhost subtask0";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = [false, true, true, false];

        const res = parseTaskAndArguments(cliArguments, usedCliArguments, hre);

        assert.ok(!Array.isArray(res), "Result should be an array");
        assert.equal(res.task.id, subtasks[0].id);
        assert.deepEqual(usedCliArguments, [true, true, true, true]);
        assert.deepEqual(res.taskArguments, {});
      });
    });

    describe("task and subtask with options", function () {
      const testCases = {
        "with long names": {
          arg: "--arg",
          flag: "--flag",
          undefinedArg: "--undefinedArg",
        },
        "with short names": {
          arg: "-a",
          flag: "-f",
          undefinedArg: "-u",
        },
      };

      before(async function () {
        tasksBuilders = [
          task(["task0"]).addOption({
            name: "arg",
            shortName: "a",
            defaultValue: "default",
          }),
          task(["task1"]).addFlag({
            name: "flag",
            shortName: "f",
          }),
          task(["task2"]).addOption({
            name: "arg",
            shortName: "a",
            type: ArgumentType.BOOLEAN,
            defaultValue: true,
          }),
          task(["task3"]).addOption({
            name: "camelCaseArg",
            defaultValue: "default",
          }),
          task(["task4"]).addLevel({
            name: "verbosity",
            shortName: "v",
          }),
        ];

        subtasksBuilders = [
          task(["task0", "subtask0"]).addOption({
            name: "arg",
            shortName: "a",
            defaultValue: "default",
          }),
        ];

        ({ hre, tasks, subtasks } = await getTasksAndHreEnvironment(
          tasksBuilders,
          subtasksBuilders,
        ));
      });

      for (const [name, { arg, flag, undefinedArg }] of Object.entries(
        testCases,
      )) {
        describe(name, () => {
          it("should get the task and its argument", function () {
            const command = `npx hardhat task0 ${arg} <argValue>`;

            const cliArguments = command.split(" ").slice(2);
            const usedCliArguments = new Array(cliArguments.length).fill(false);

            const res = parseTaskAndArguments(
              cliArguments,
              usedCliArguments,
              hre,
            );

            assert.ok(!Array.isArray(res), "Result should be an array");
            assert.equal(res.task.id, tasks[0].id);
            assert.deepEqual(
              usedCliArguments,
              new Array(cliArguments.length).fill(true),
            );
            assert.deepEqual(res.taskArguments, {
              arg: "<argValue>",
            });
          });

          it("should get the subtask and its argument", function () {
            const command = `npx hardhat task0 subtask0 ${arg} <argValue>`;

            const cliArguments = command.split(" ").slice(2);
            const usedCliArguments = new Array(cliArguments.length).fill(false);

            const res = parseTaskAndArguments(
              cliArguments,
              usedCliArguments,
              hre,
            );

            assert.ok(!Array.isArray(res), "Result should be an array");
            assert.equal(res.task.id, subtasks[0].id);
            assert.deepEqual(
              usedCliArguments,
              new Array(cliArguments.length).fill(true),
            );
            assert.deepEqual(res.taskArguments, {
              arg: "<argValue>",
            });
          });

          it("should get the task and its argument as type flag with value set to true (flag behavior)", function () {
            const command = `npx hardhat task1 ${flag}`;

            const cliArguments = command.split(" ").slice(2);
            const usedCliArguments = new Array(cliArguments.length).fill(false);

            const res = parseTaskAndArguments(
              cliArguments,
              usedCliArguments,
              hre,
            );

            assert.ok(!Array.isArray(res), "Result should be an array");
            assert.equal(res.task.id, tasks[1].id);
            assert.deepEqual(
              usedCliArguments,
              new Array(cliArguments.length).fill(true),
            );
            assert.deepEqual(res.taskArguments, { flag: true });
          });

          it("should not get the task and its argument as type flag - flag values are not consumed", function () {
            const command = `npx hardhat task1 ${flag} false`;

            const cliArguments = command.split(" ").slice(2);
            const usedCliArguments = new Array(cliArguments.length).fill(false);

            assertThrowsHardhatError(
              () => parseTaskAndArguments(cliArguments, usedCliArguments, hre),
              HardhatError.ERRORS.CORE.ARGUMENTS.UNUSED_ARGUMENT,
              {
                value: "false",
              },
            );
          });

          it("should get the required bool value (the bool value must be specified, not a flag behavior)", function () {
            const command = `npx hardhat task2 ${arg} false`;

            const cliArguments = command.split(" ").slice(2);
            const usedCliArguments = new Array(cliArguments.length).fill(false);

            const res = parseTaskAndArguments(
              cliArguments,
              usedCliArguments,
              hre,
            );

            assert.ok(!Array.isArray(res), "Result should be an array");
            assert.equal(res.task.id, tasks[2].id);
            assert.deepEqual(
              usedCliArguments,
              new Array(cliArguments.length).fill(true),
            );
            assert.deepEqual(res.taskArguments, { arg: false });
          });

          it("should throw because the argument is not defined", function () {
            const command = `npx hardhat task0 ${undefinedArg} <value>`;

            const cliArguments = command.split(" ").slice(2);
            const usedCliArguments = new Array(cliArguments.length).fill(false);

            assertThrowsHardhatError(
              () => parseTaskAndArguments(cliArguments, usedCliArguments, hre),
              HardhatError.ERRORS.CORE.ARGUMENTS.UNRECOGNIZED_OPTION,
              {
                option: undefinedArg,
              },
            );
          });

          it("should throw because the task argument is declared before the task name", function () {
            const command = `npx hardhat ${arg} <argValue> task0`;

            const cliArguments = command.split(" ").slice(2);
            const usedCliArguments = new Array(cliArguments.length).fill(false);

            assertThrowsHardhatError(
              () => parseTaskAndArguments(cliArguments, usedCliArguments, hre),
              HardhatError.ERRORS.CORE.ARGUMENTS.UNRECOGNIZED_OPTION,
              {
                option: arg,
              },
            );
          });

          it("should throw because the task argument is required but no value is associated to it", function () {
            const command = `npx hardhat task0 ${arg}`;

            const cliArguments = command.split(" ").slice(2);
            const usedCliArguments = new Array(cliArguments.length).fill(false);

            assertThrowsHardhatError(
              () => parseTaskAndArguments(cliArguments, usedCliArguments, hre),
              HardhatError.ERRORS.CORE.ARGUMENTS.MISSING_VALUE_FOR_ARGUMENT,
              {
                argument: arg,
              },
            );
          });

          it("should throw because the task argument is required but there is no value right after it to consume", function () {
            const command = `npx hardhat task0 ${arg} --global-flag <value>`;

            const cliArguments = command.split(" ").slice(2);
            const usedCliArguments = [false, false, true, false];

            assertThrowsHardhatError(
              () => parseTaskAndArguments(cliArguments, usedCliArguments, hre),
              HardhatError.ERRORS.CORE.ARGUMENTS.MISSING_VALUE_FOR_ARGUMENT,
              {
                argument: arg,
              },
            );
          });

          it("should throw because the task argument is repeated", () => {
            const command = `npx hardhat task0 ${arg} <value1> ${arg} <value2>`;

            const cliArguments = command.split(" ").slice(2);
            const usedCliArguments = new Array(cliArguments.length).fill(false);

            assertThrowsHardhatError(
              () => parseTaskAndArguments(cliArguments, usedCliArguments, hre),
              HardhatError.ERRORS.CORE.ARGUMENTS.CANNOT_REPEAT_OPTIONS,
              {
                option: arg,
                type: ArgumentType.STRING,
              },
            );
          });

          it("should throw because the task flag is repeated", () => {
            const command = `npx hardhat task1 ${flag} ${flag}`;

            const cliArguments = command.split(" ").slice(2);
            const usedCliArguments = new Array(cliArguments.length).fill(false);

            assertThrowsHardhatError(
              () => parseTaskAndArguments(cliArguments, usedCliArguments, hre),
              HardhatError.ERRORS.CORE.ARGUMENTS.CANNOT_REPEAT_OPTIONS,
              {
                option: flag,
                type: ArgumentType.FLAG,
              },
            );
          });
        });
      }

      it("should get the task and its level argument when provided by long name", function () {
        const command = "npx hardhat task4 --verbosity 4";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        const res = parseTaskAndArguments(cliArguments, usedCliArguments, hre);

        assert.ok(!Array.isArray(res), "Result should be an array");
        assert.equal(res.task.id, tasks[4].id);
        assert.deepEqual(
          usedCliArguments,
          new Array(cliArguments.length).fill(true),
        );
        assert.deepEqual(res.taskArguments, { verbosity: 4 });
      });

      it("should throw when level is provided by long name and not followed by a value", function () {
        const command = "npx hardhat task4 --verbosity";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        assertThrowsHardhatError(
          () => parseTaskAndArguments(cliArguments, usedCliArguments, hre),
          HardhatError.ERRORS.CORE.ARGUMENTS.MISSING_VALUE_FOR_ARGUMENT,
          {
            argument: "--verbosity",
          },
        );
      });

      it("should get the task and its level argument when provided by short name", function () {
        const command = "npx hardhat task4 -vvvv";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        const res = parseTaskAndArguments(cliArguments, usedCliArguments, hre);

        assert.ok(!Array.isArray(res), "Result should be an array");
        assert.equal(res.task.id, tasks[4].id);
        assert.deepEqual(
          usedCliArguments,
          new Array(cliArguments.length).fill(true),
        );
        assert.deepEqual(res.taskArguments, { verbosity: 4 });
      });

      it("should throw when level is provided by short name and followed by a value", function () {
        const command = "npx hardhat task4 -v 4";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        assertThrowsHardhatError(
          () => parseTaskAndArguments(cliArguments, usedCliArguments, hre),
          HardhatError.ERRORS.CORE.ARGUMENTS.UNUSED_ARGUMENT,
          {
            value: "4",
          },
        );
      });

      it("should convert on the fly the camelCase argument to kebab-case", function () {
        const command = `npx hardhat task3 --camel-case-arg <value>`;

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        const res = parseTaskAndArguments(cliArguments, usedCliArguments, hre);

        assert.ok(!Array.isArray(res), "Result should be an array");
        assert.equal(res.task.id, tasks[3].id);
        assert.deepEqual(
          usedCliArguments,
          new Array(cliArguments.length).fill(true),
        );
        assert.deepEqual(res.taskArguments, {
          camelCaseArg: "<value>",
        });
      });

      it("should return the task id if not found", function () {
        const command = "npx hardhat undefined-task";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = [false];

        const res = parseTaskAndArguments(cliArguments, usedCliArguments, hre);

        assert.deepEqual(res, ["undefined-task"]);
      });

      it("should throw when short arguments are grouped", () => {
        const command = "npx hardhat task0 -abc";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        assertThrowsHardhatError(
          () => parseTaskAndArguments(cliArguments, usedCliArguments, hre),
          HardhatError.ERRORS.CORE.ARGUMENTS.CANNOT_GROUP_OPTIONS,
          {
            option: "-abc",
          },
        );
      });

      it("should throw when short arguments are grouped and repeated", () => {
        const command = "npx hardhat task1 -ff";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        assertThrowsHardhatError(
          () => parseTaskAndArguments(cliArguments, usedCliArguments, hre),
          HardhatError.ERRORS.CORE.ARGUMENTS.CANNOT_REPEAT_OPTIONS,
          {
            option: "-ff",
            type: ArgumentType.FLAG,
          },
        );
      });
    });

    describe("task and subtask with positional arguments", function () {
      before(async function () {
        tasksBuilders = [
          task(["task0"]).addPositionalArgument({
            name: "arg",
          }),
          task(["task1"])
            .addPositionalArgument({
              name: "arg",
            })
            .addPositionalArgument({ name: "arg2" }),
        ];

        subtasksBuilders = [
          task(["task0", "subtask0"]).addPositionalArgument({
            name: "arg",
          }),
          task(["task1", "subtask1"])
            .addPositionalArgument({
              name: "arg",
            })
            .addPositionalArgument({
              name: "arg2",
              defaultValue: "default",
            }),
        ];

        ({ hre, tasks, subtasks } = await getTasksAndHreEnvironment(
          tasksBuilders,
          subtasksBuilders,
        ));
      });

      it("should get the tasks and its required argument", function () {
        const command = "npx hardhat task0 <argValue>";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        const res = parseTaskAndArguments(cliArguments, usedCliArguments, hre);

        assert.ok(!Array.isArray(res), "Result should be an array");
        assert.equal(res.task.id, tasks[0].id);
        assert.deepEqual(
          usedCliArguments,
          new Array(cliArguments.length).fill(true),
        );
        assert.deepEqual(res.taskArguments, {
          arg: "<argValue>",
        });
      });

      it("should get the subtask and its required argument", function () {
        const command = "npx hardhat task1 subtask1 <argValue>";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        const res = parseTaskAndArguments(cliArguments, usedCliArguments, hre);

        assert.ok(!Array.isArray(res), "Result should be an array");
        assert.equal(res.task.id, subtasks[1].id);
        assert.deepEqual(
          usedCliArguments,
          new Array(cliArguments.length).fill(true),
        );
        assert.deepEqual(res.taskArguments, {
          arg: "<argValue>",
        });
      });

      it("should get the tasks and its required argument that comes after the --", function () {
        // subtask is a arg value in this scenario, not a subtask because it is preceded by "--"
        const command = "npx hardhat task0 -- subtask0";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        const res = parseTaskAndArguments(cliArguments, usedCliArguments, hre);

        assert.ok(!Array.isArray(res), "Result should be an array");
        assert.equal(res.task.id, tasks[0].id);
        assert.deepEqual(
          usedCliArguments,
          new Array(cliArguments.length).fill(true),
        );
        assert.deepEqual(res.taskArguments, {
          arg: "subtask0",
        });
      });

      it("should get the tasks and its required argument (the positional argument has the same value as a subtask name)", function () {
        // subtask1 is a arg value in this scenario, not a subtask because it is preceded by a positional value
        const command = "npx hardhat task1 foo subtask1";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        const res = parseTaskAndArguments(cliArguments, usedCliArguments, hre);

        assert.ok(!Array.isArray(res), "Result should be an array");
        assert.equal(res.task.id, tasks[1].id);
        assert.deepEqual(
          usedCliArguments,
          new Array(cliArguments.length).fill(true),
        );
        assert.deepEqual(res.taskArguments, {
          arg: "foo",
          arg2: "subtask1",
        });
      });

      it("should get the subtasks and not complain about the missing optional argument", function () {
        const command = "npx hardhat task1 subtask1 <argValue>";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        const res = parseTaskAndArguments(cliArguments, usedCliArguments, hre);

        assert.ok(!Array.isArray(res), "Result should be an array");
        assert.equal(res.task.id, subtasks[1].id);
        assert.deepEqual(
          usedCliArguments,
          new Array(cliArguments.length).fill(true),
        );
        assert.deepEqual(res.taskArguments, {
          arg: "<argValue>",
        });
      });

      it("should get the subtasks and its optional argument passed in the cli", function () {
        const command = "npx hardhat task1 subtask1 <argValue> <optArgValue>";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        const res = parseTaskAndArguments(cliArguments, usedCliArguments, hre);

        assert.ok(!Array.isArray(res), "Result should be an array");
        assert.equal(res.task.id, subtasks[1].id);
        assert.deepEqual(
          usedCliArguments,
          new Array(cliArguments.length).fill(true),
        );
        assert.deepEqual(res.taskArguments, {
          arg: "<argValue>",
          arg2: "<optArgValue>",
        });
      });

      it("should throw an error because the required argument is not passed", function () {
        const command = "npx hardhat task0";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = [false];

        assertThrowsHardhatError(
          () => parseTaskAndArguments(cliArguments, usedCliArguments, hre),
          HardhatError.ERRORS.CORE.ARGUMENTS.MISSING_VALUE_FOR_ARGUMENT,
          {
            argument: "arg",
          },
        );
      });
    });

    describe("task and subtask with variadic arguments", function () {
      before(async function () {
        tasksBuilders = [
          task(["task0"]).addVariadicArgument({
            name: "arg",
          }),
        ];

        subtasksBuilders = [
          task(["task0", "subtask0"]).addVariadicArgument({
            name: "arg",
            defaultValue: ["default"],
          }),
        ];

        ({ hre, tasks, subtasks } = await getTasksAndHreEnvironment(
          tasksBuilders,
          subtasksBuilders,
        ));
      });

      it("should get the arguments", function () {
        const command = "npx hardhat task0 <val1> <val2> <val3>";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        const res = parseTaskAndArguments(cliArguments, usedCliArguments, hre);

        assert.ok(!Array.isArray(res), "Result should be an array");
        assert.equal(res.task.id, tasks[0].id);
        assert.deepEqual(
          usedCliArguments,
          new Array(cliArguments.length).fill(true),
        );
        assert.deepEqual(res.taskArguments, {
          arg: ["<val1>", "<val2>", "<val3>"],
        });
      });

      it("should not throw when a arguments is not passed and there is a default value", function () {
        const command = "npx hardhat task0 subtask0";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        const res = parseTaskAndArguments(cliArguments, usedCliArguments, hre);

        assert.ok(!Array.isArray(res), "Result should be an array");
        assert.equal(res.task.id, subtasks[0].id);
        assert.deepEqual(
          usedCliArguments,
          new Array(cliArguments.length).fill(true),
        );
        assert.deepEqual(res.taskArguments, {});
      });

      it("should throw when a argument is not passed and there is no default value", function () {
        const command = "npx task task0";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = [false];

        assertThrowsHardhatError(
          () => parseTaskAndArguments(cliArguments, usedCliArguments, hre),
          HardhatError.ERRORS.CORE.ARGUMENTS.MISSING_VALUE_FOR_ARGUMENT,
          {
            argument: "arg",
          },
        );
      });
    });

    describe("formatting of arguments types", function () {
      const RANDOM_FILE_PATH = "random-path/sample-file.txt";

      describe("options", function () {
        before(async function () {
          tasksBuilders = [
            task(["task0"])
              .addOption({
                name: "arg",
                type: ArgumentType.BIGINT,
                defaultValue: 1n,
              })
              .addOption({
                name: "arg2",
                type: ArgumentType.BOOLEAN,
                defaultValue: true,
              })
              .addOption({
                name: "arg3",
                type: ArgumentType.FILE,
                defaultValue: "default",
              })
              .addOption({
                name: "arg4",
                type: ArgumentType.FLOAT,
                defaultValue: 1.1,
              })
              .addOption({
                name: "arg5",
                type: ArgumentType.INT,
                defaultValue: 1,
              })
              .addOption({
                name: "arg6",
                type: ArgumentType.STRING,
                defaultValue: "default",
              }),
          ];

          ({ hre, tasks, subtasks } = await getTasksAndHreEnvironment(
            tasksBuilders,
            [],
          ));
        });

        it("should correctly format the arguments accordingly to their types", function () {
          const command = `npx hardhat task0 --arg 1234 --arg2 true --arg3 ${RANDOM_FILE_PATH} --arg4 12.34 --arg5 1234 --arg6 hello`;

          const cliArguments = command.split(" ").slice(2);
          const usedCliArguments = new Array(cliArguments.length).fill(false);

          const res = parseTaskAndArguments(
            command.split(" ").slice(2),
            usedCliArguments,
            hre,
          );

          assert.ok(!Array.isArray(res), "Result should be an array");
          assert.deepEqual(res.taskArguments, {
            arg: 1234n,
            arg2: true,
            arg3: RANDOM_FILE_PATH,
            arg4: 12.34,
            arg5: 1234,
            arg6: "hello",
          });
        });
      });

      describe("positional arguments", function () {
        before(async function () {
          tasksBuilders = [
            task(["task0"])
              .addPositionalArgument({
                name: "arg",
                type: ArgumentType.BIGINT,
              })
              .addPositionalArgument({
                name: "arg2",
                type: ArgumentType.BOOLEAN,
              })
              .addPositionalArgument({
                name: "arg3",
                type: ArgumentType.FILE,
              })
              .addPositionalArgument({
                name: "arg4",
                type: ArgumentType.FLOAT,
              })
              .addPositionalArgument({
                name: "arg5",
                type: ArgumentType.INT,
              })
              .addPositionalArgument({
                name: "arg6",
                type: ArgumentType.STRING,
              }),
          ];

          ({ hre, tasks, subtasks } = await getTasksAndHreEnvironment(
            tasksBuilders,
            [],
          ));
        });

        it("should correctly format the arguments accordingly to their types", function () {
          const command = `npx hardhat task0 1234 true ${RANDOM_FILE_PATH} 12.34 1234 hello`;

          const cliArguments = command.split(" ").slice(2);
          const usedCliArguments = new Array(cliArguments.length).fill(false);

          const res = parseTaskAndArguments(
            command.split(" ").slice(2),
            usedCliArguments,
            hre,
          );

          assert.ok(!Array.isArray(res), "Result should be an array");
          assert.deepEqual(res.taskArguments, {
            arg: 1234n,
            arg2: true,
            arg3: RANDOM_FILE_PATH,
            arg4: 12.34,
            arg5: 1234,
            arg6: "hello",
          });
        });
      });

      describe("variadic arguments", function () {
        const argTypes = [
          ArgumentType.BIGINT,
          ArgumentType.BOOLEAN,
          ArgumentType.FILE,
          ArgumentType.FLOAT,
          ArgumentType.INT,
          ArgumentType.STRING,
        ];

        const argValues = [
          "1234",
          "true",
          RANDOM_FILE_PATH,
          "12.34",
          "1234",
          "hello",
        ];
        const argResults = [
          1234n,
          true,
          RANDOM_FILE_PATH,
          12.34,
          1234,
          "hello",
        ];

        it("should correctly format the arguments accordingly to their types", async function () {
          // Variadic arguments can only be of a single type at a time, so loop through all the types
          for (let i = 0; i < argTypes.length; i++) {
            tasksBuilders = [
              task(["task0"]).addVariadicArgument({
                name: "arg",
                type: argTypes[i],
              }),
            ];

            ({ hre, tasks, subtasks } = await getTasksAndHreEnvironment(
              tasksBuilders,
              [],
            ));

            const command = `npx hardhat task0 ${argValues[i]}`;

            const cliArguments = command.split(" ").slice(2);
            const usedCliArguments = new Array(cliArguments.length).fill(false);

            const res = parseTaskAndArguments(
              command.split(" ").slice(2),
              usedCliArguments,
              hre,
            );

            assert.ok(!Array.isArray(res), "Result should be an array");
            assert.deepEqual(res.taskArguments, {
              arg: [argResults[i]],
            });
          }
        });
      });
    });

    describe("combine all the arguments' types", function () {
      before(async function () {
        tasksBuilders = [
          task(["task0"])
            .addOption({
              name: "arg",
              type: ArgumentType.BOOLEAN,
              defaultValue: false,
            })
            .addPositionalArgument({ name: "posArg" }),
          task(["task1"])
            .addOption({ name: "arg", defaultValue: "default" })
            .addPositionalArgument({ name: "posArg" })
            .addPositionalArgument({
              name: "posArg2",
              defaultValue: "default",
            })
            .addVariadicArgument({
              name: "varArg",
              defaultValue: ["default"],
            }),
          task(["task2"])
            .addPositionalArgument({
              name: "posArg",
              defaultValue: "default",
            })
            .addPositionalArgument({
              name: "posArg2",
              defaultValue: "default2",
            })
            .addPositionalArgument({
              name: "posArg3",
              defaultValue: "default3",
            })
            .addVariadicArgument({
              name: "varArg",
              defaultValue: ["default"],
            }),
        ];

        subtasksBuilders = [task(["task0", "subtask0"])];

        ({ hre, tasks, subtasks } = await getTasksAndHreEnvironment(
          tasksBuilders,
          subtasksBuilders,
        ));
      });

      it("should not parse as an option because everything after a standalone '--' should be considered a positional argument", function () {
        const command = "npx hardhat task0 -- --arg"; // '--arg' should be considered a positional argument

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        const res = parseTaskAndArguments(cliArguments, usedCliArguments, hre);

        assert.ok(!Array.isArray(res), "Result should be an array");
        assert.equal(res.task.id, tasks[0].id);
        assert.deepEqual(
          usedCliArguments,
          new Array(cliArguments.length).fill(true),
        );
        assert.deepEqual(res.taskArguments, { posArg: "--arg" });
      });

      it("should get the task, its arguments passed in the cli and ignore global option", function () {
        const command =
          "npx hardhat task1 --arg <value> --network localhost <posValue> <posValue2> <varValue1> <varValue2>";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = [
          false,
          false,
          false,
          true,
          true,
          false,
          false,
          false,
          false,
        ];

        const res = parseTaskAndArguments(cliArguments, usedCliArguments, hre);

        assert.ok(!Array.isArray(res), "Result should be an array");
        assert.equal(res.task.id, tasks[1].id);
        assert.deepEqual(
          usedCliArguments,
          new Array(cliArguments.length).fill(true),
        );
        assert.deepEqual(res.taskArguments, {
          arg: "<value>",
          posArg: "<posValue>",
          posArg2: "<posValue2>",
          varArg: ["<varValue1>", "<varValue2>"],
        });
      });

      it("should consume all the positional optional arguments and not get any variadic arguments", function () {
        const command = "npx hardhat task2 <posValue> <posValue2> <posValue3>";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        const res = parseTaskAndArguments(cliArguments, usedCliArguments, hre);

        assert.ok(!Array.isArray(res), "Result should be an array");
        assert.equal(res.task.id, tasks[2].id);
        assert.deepEqual(
          usedCliArguments,
          new Array(cliArguments.length).fill(true),
        );
        assert.deepEqual(res.taskArguments, {
          posArg: "<posValue>",
          posArg2: "<posValue2>",
          posArg3: "<posValue3>",
        });
      });

      it("should throw because there is an unused argument", function () {
        const command = "npx hardhat task0 subtask0 <value>";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        // Throws because the flag argument does not expect values, so the "false" argument will not be consumed
        assertThrowsHardhatError(
          () => parseTaskAndArguments(cliArguments, usedCliArguments, hre),
          HardhatError.ERRORS.CORE.ARGUMENTS.UNUSED_ARGUMENT,
          {
            value: "<value>",
          },
        );
      });
    });
  });

  describe("parseRawArguments", function () {
    it("should parse arguments with = and multiple =", function () {
      const command =
        "npx hardhat task --arg1=value1 --arg2=value2=value3 --arg3 value4 variadic1 variadic2";

      const cliArguments = command.split(" ").slice(2);

      const parsedArgs = parseRawArguments(cliArguments);

      assert.deepEqual(parsedArgs, [
        "task",
        "--arg1",
        "value1",
        "--arg2",
        "value2=value3",
        "--arg3",
        "value4",
        "variadic1",
        "variadic2",
      ]);
    });

    it("should not parse short arguments with =", () => {
      const command = "npx hardhat task -a=value1";

      const cliArguments = command.split(" ").slice(2);

      const parsedArgs = parseRawArguments(cliArguments);

      assert.deepEqual(parsedArgs, ["task", "-a=value1"]);
    });
  });
});
