import type {
  GlobalOptionDefinitions,
  GlobalOptionDefinitionsEntry,
} from "@ignored/hardhat-vnext-core/types/global-options";
import type { HardhatRuntimeEnvironment } from "@ignored/hardhat-vnext-core/types/hre";
import type {
  NewTaskDefinition,
  NewTaskDefinitionBuilder,
  Task,
  TaskArguments,
} from "@ignored/hardhat-vnext-core/types/tasks";

import assert from "node:assert/strict";
import { afterEach, before, describe, it } from "node:test";
import { pathToFileURL } from "node:url";

import {
  ArgumentType,
  globalFlag,
  globalOption,
  task,
} from "@ignored/hardhat-vnext-core/config";
import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { isCi } from "@ignored/hardhat-vnext-utils/ci";
import chalk from "chalk";

import { createHardhatRuntimeEnvironment } from "../../../src/hre.js";
import {
  main,
  parseGlobalOptions,
  parseBuiltinGlobalOptions,
  parseTask,
  parseTaskArguments,
} from "../../../src/internal/cli/main.js";
import { resetGlobalHardhatRuntimeEnvironment } from "../../../src/internal/global-hre-instance.js";
import { getHardhatVersion } from "../../../src/internal/utils/package.js";
import { useFixtureProject } from "../../helpers/project.js";

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

describe("main", function () {
  describe("main", function () {
    afterEach(function () {
      resetGlobalHardhatRuntimeEnvironment();
    });

    describe("version", function () {
      useFixtureProject("cli/parsing/base-project");

      it("should print the version and instantly return", async function () {
        const lines: string[] = [];

        const command = "npx hardhat --version";
        const cliArguments = command.split(" ").slice(2);

        await main(cliArguments, (msg) => {
          lines.push(msg);
        });

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
        const cliArguments = command.split(" ").slice(2);

        await main(cliArguments);

        const tasksResults = await getTasksAndSubtaskResults(
          "user-hardhat.config.ts",
        );
        assert.equal(tasksResults.wasArg1Used, true);
      });
    });

    describe("one of the hardhat default task with global flags and arguments", async function () {
      useFixtureProject("cli/parsing/base-project");

      // TODO: update with a real task as soon as they are implemented
      it.todo("should run one of the hardhat default task", async function () {
        const lines: string[] = [];

        const command = "npx hardhat --show-stack-traces example";
        const cliArguments = command.split(" ").slice(2);

        await main(cliArguments, (msg) => {
          lines.push(msg);
        });
      });
    });

    describe("task with global flags and arguments", async function () {
      useFixtureProject("cli/parsing/tasks-and-subtasks");

      it("should run the task with global flags and arguments", async function () {
        const command =
          "npx hardhat --show-stack-traces task --arg1 <value1> <value2> <value3>";
        const cliArguments = command.split(" ").slice(2);

        await main(cliArguments);

        const tasksResults = await getTasksAndSubtaskResults();
        assert.deepEqual(tasksResults.wasArg1Used, true);
        assert.deepEqual(tasksResults.wasArg2Used, true);
        assert.deepEqual(tasksResults.wasArg3Used, true);
      });

      it("should run the task with the default value", async function () {
        const command = "npx hardhat task-default --show-stack-traces";
        const cliArguments = command.split(" ").slice(2);

        await main(cliArguments);

        const tasksResults = await getTasksAndSubtaskResults();
        assert.deepEqual(tasksResults.wasArg1Used, true);
        assert.deepEqual(tasksResults.wasArg2Used, false);
        assert.deepEqual(tasksResults.wasArg3Used, false);
      });

      it("should run the subtask with global flags and arguments", async function () {
        const command =
          "npx hardhat task subtask --arg1 <value1> --show-stack-traces <value2> <value3>";
        const cliArguments = command.split(" ").slice(2);

        await main(cliArguments);

        const tasksResults = await getTasksAndSubtaskResults();
        assert.deepEqual(tasksResults.wasArg1Used, true);
        assert.deepEqual(tasksResults.wasArg2Used, true);
        assert.deepEqual(tasksResults.wasArg3Used, true);
      });

      it("should run the subtask with the default value", async function () {
        const command =
          "npx hardhat task-default --show-stack-traces subtask-default";
        const cliArguments = command.split(" ").slice(2);

        await main(cliArguments);

        const tasksResults = await getTasksAndSubtaskResults();
        assert.deepEqual(tasksResults.wasArg1Used, true);
        assert.deepEqual(tasksResults.wasArg2Used, false);
        assert.deepEqual(tasksResults.wasArg3Used, false);
      });
    });

    describe("global help", function () {
      useFixtureProject("cli/parsing/base-project");

      it("should print the global help", async function () {
        let lines: string = "";

        const command = "npx hardhat";
        const cliArguments = command.split(" ").slice(2);

        await main(cliArguments, (msg) => {
          lines = msg;
        });

        const expected = `Hardhat version ${await getHardhatVersion()}

Usage: hardhat [GLOBAL OPTIONS] <TASK> [SUBTASK] [TASK OPTIONS] [--] [TASK ARGUMENTS]

AVAILABLE TASKS:

  example                  Example task
  run                      Runs a user-defined script after compiling the project
  task                     A task that uses arg1

GLOBAL OPTIONS:

  --config                 A Hardhat config file.
  --help                   Shows this message, or a task's help if its name is provided.
  --show-stack-traces      Show stack traces (always enabled on CI servers).
  --version                Shows hardhat's version.
  --foo-plugin-flag        A flag

To get help for a specific task run: npx hardhat <TASK> [SUBTASK] --help`;

        assert.equal(lines, expected);
      });
    });

    describe("subtask help", function () {
      useFixtureProject("cli/parsing/subtask-help");

      it("should print an help message for the task's subtask", async function () {
        let lines: string = "";

        const command = "npx hardhat empty-task --help";
        const cliArguments = command.split(" ").slice(2);

        await main(cliArguments, (msg) => {
          lines = msg;
        });

        const expected = `${chalk.bold("empty task description")}

Usage: hardhat [GLOBAL OPTIONS] empty-task <SUBTASK> [SUBTASK OPTIONS] [--] [SUBTASK POSITIONAL ARGUMENTS]
`;

        assert.equal(lines, expected);
      });
    });

    describe("task help", function () {
      useFixtureProject("cli/parsing/base-project");

      it("should print an help message for the task", async function () {
        let lines: string = "";

        const command = "npx hardhat task --help";
        const cliArguments = command.split(" ").slice(2);

        await main(cliArguments, (msg) => {
          lines = msg;
        });

        const expected = `${chalk.bold("A task that uses arg1")}

Usage: hardhat [GLOBAL OPTIONS] task

For global options help run: hardhat --help`;

        assert.equal(lines, expected);
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

      assert.rejects(
        async () => parseBuiltinGlobalOptions(cliArguments, usedCliArguments),
        new HardhatError(
          HardhatError.ERRORS.ARGUMENTS.CANNOT_COMBINE_INIT_AND_CONFIG_PATH,
        ),
      );
    });

    it("should throw an error because the config arg is passed twice", async function () {
      const command = "npx hardhat --config ./path1 --config ./path2";

      const cliArguments = command.split(" ").slice(2);
      const usedCliArguments = new Array(cliArguments.length).fill(false);

      assert.rejects(
        async () => parseBuiltinGlobalOptions(cliArguments, usedCliArguments),
        new HardhatError(HardhatError.ERRORS.ARGUMENTS.DUPLICATED_NAME, {
          name: "--config",
        }),
      );
    });

    it("should throw an error because the config arg is passed but there is no path after it", async function () {
      const command = "npx hardhat --config";

      const cliArguments = command.split(" ").slice(2);
      const usedCliArguments = new Array(cliArguments.length).fill(false);

      assert.rejects(
        async () => parseBuiltinGlobalOptions(cliArguments, usedCliArguments),
        new HardhatError(HardhatError.ERRORS.ARGUMENTS.MISSING_CONFIG_FILE),
      );
    });
  });

  describe("parseGlobalOptions", function () {
    /* The function "parseGlobalOptions" utilizes "parseOptions" for parsing,
     * similar to task options. Tests for "parseOptions" are primarily located
     * in the task option section. */

    let globalOptionDefinitions: GlobalOptionDefinitions;

    before(function () {
      const GLOBAL_OPTION = globalOption({
        name: "arg",
        type: ArgumentType.STRING,
        defaultValue: "default",
        description: "",
      });

      const GLOBAL_FLAG = globalFlag({
        name: "flag",
        description: "",
      });

      globalOptionDefinitions = new Map<string, GlobalOptionDefinitionsEntry>([
        ["arg", { pluginId: "1", option: GLOBAL_OPTION }],
        ["flag", { pluginId: "1", option: GLOBAL_FLAG }],
      ]);
    });

    it("should get the global option with the values passed in the cli", async function () {
      const command = "npx hardhat task --arg <value1> <value2> <value3>";

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
      const command = "npx hardhat task --flag <value>";

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

    it("should parse the bool value after the flag", async function () {
      const command = "npx hardhat task --flag true <value>";

      const cliArguments = command.split(" ").slice(2);
      const usedCliArguments = new Array(cliArguments.length).fill(false);

      const globalOptions = await parseGlobalOptions(
        globalOptionDefinitions,
        cliArguments,
        usedCliArguments,
      );

      assert.deepEqual(usedCliArguments, [false, true, true, false]);
      assert.deepEqual(globalOptions, {
        flag: true,
      });
    });

    it("should not fail when a global option is not recognized (it might be a task option)", async function () {
      const command = "npx hardhat task --taskFlag <value>";

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
      before(async function () {
        tasksBuilders = [
          task(["task0"]).addOption({
            name: "arg",
          }),
          task(["task1"]).addOption({
            name: "flag",
            type: ArgumentType.BOOLEAN,
            defaultValue: false, // flag behavior
          }),
          task(["task2"]).addOption({
            name: "arg",
            type: ArgumentType.BOOLEAN,
            defaultValue: true,
          }),
          task(["task3"]).addOption({
            name: "arg",
            type: ArgumentType.BOOLEAN,
          }),
          task(["task4"]).addOption({
            name: "camelCaseArg",
          }),
        ];

        subtasksBuilders = [
          task(["task0", "subtask0"]).addOption({
            name: "arg",
          }),
        ];

        ({ hre, tasks, subtasks } = await getTasksAndHreEnvironment(
          tasksBuilders,
          subtasksBuilders,
        ));
      });

      it("should get the task and its argument", function () {
        const command = "npx hardhat task0 --arg <argValue>";

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

      it("should get the subtask and its argument", function () {
        const command = "npx hardhat task0 subtask0 --arg <argValue>";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        const res = parseTaskAndArguments(cliArguments, usedCliArguments, hre);

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

      it("should get the task and its argument as type boolean with value set to true (flag behavior)", function () {
        const command = "npx hardhat task1 --flag";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        const res = parseTaskAndArguments(cliArguments, usedCliArguments, hre);

        assert.ok(!Array.isArray(res), "Result should be an array");
        assert.equal(res.task.id, tasks[1].id);
        assert.deepEqual(
          usedCliArguments,
          new Array(cliArguments.length).fill(true),
        );
        assert.deepEqual(res.taskArguments, { flag: true });
      });

      it("should get the task and its argument as type boolean - even though it has a flag behavior, boolean values are still consumed", function () {
        const command = "npx hardhat task1 --flag false";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        const res = parseTaskAndArguments(cliArguments, usedCliArguments, hre);

        assert.ok(!Array.isArray(res), "Result should be an array");
        assert.equal(res.task.id, tasks[1].id);
        assert.deepEqual(
          usedCliArguments,
          new Array(cliArguments.length).fill(true),
        );
        assert.deepEqual(res.taskArguments, { flag: false });
      });

      it("should get the required bool value (the bool value must be specified, not a flag behavior because default is true)", function () {
        const command = "npx hardhat task2 --arg false";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        const res = parseTaskAndArguments(cliArguments, usedCliArguments, hre);

        assert.ok(!Array.isArray(res), "Result should be an array");
        assert.equal(res.task.id, tasks[2].id);
        assert.deepEqual(
          usedCliArguments,
          new Array(cliArguments.length).fill(true),
        );
        assert.deepEqual(res.taskArguments, { arg: false });
      });

      it("should get the required bool value (the bool value must be specified, not a flag behavior because default is undefined)", function () {
        const command = "npx hardhat task3 --arg true";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        const res = parseTaskAndArguments(cliArguments, usedCliArguments, hre);

        assert.ok(!Array.isArray(res), "Result should be an array");
        assert.equal(res.task.id, tasks[3].id);
        assert.deepEqual(
          usedCliArguments,
          new Array(cliArguments.length).fill(true),
        );
        assert.deepEqual(res.taskArguments, { arg: true });
      });

      it("should convert on the fly the camelCase argument to kebab-case", function () {
        const command = "npx hardhat task4 --camel-case-arg <value>";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        const res = parseTaskAndArguments(cliArguments, usedCliArguments, hre);

        assert.ok(!Array.isArray(res), "Result should be an array");
        assert.equal(res.task.id, tasks[4].id);
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

      it("should throw because the argument is not defined", function () {
        const command = "npx hardhat task0 --undefinedArg <value>";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        assert.throws(
          () => parseTaskAndArguments(cliArguments, usedCliArguments, hre),
          new HardhatError(HardhatError.ERRORS.ARGUMENTS.UNRECOGNIZED_OPTION, {
            option: "--undefinedArg",
          }),
        );
      });

      it("should throw because the task argument is declared before the task name", function () {
        const command = "npx hardhat --arg <argValue> task0";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        assert.throws(
          () => parseTaskAndArguments(cliArguments, usedCliArguments, hre),
          new HardhatError(HardhatError.ERRORS.ARGUMENTS.UNRECOGNIZED_OPTION, {
            option: "--arg",
          }),
        );
      });

      it("should throw because the task argument is required but no value is associated to it", function () {
        const command = "npx hardhat task0 --arg";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        assert.throws(
          () => parseTaskAndArguments(cliArguments, usedCliArguments, hre),
          new HardhatError(
            HardhatError.ERRORS.ARGUMENTS.MISSING_VALUE_FOR_ARGUMENT,
            {
              argument: "--arg",
            },
          ),
        );
      });

      it("should throw because the task argument is required but there is no value right after it to consume", function () {
        const command = "npx hardhat task0 --arg --global-flag <value>";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = [false, false, true, false];

        assert.throws(
          () => parseTaskAndArguments(cliArguments, usedCliArguments, hre),
          new HardhatError(
            HardhatError.ERRORS.ARGUMENTS.MISSING_VALUE_FOR_ARGUMENT,
            {
              argument: "--arg",
            },
          ),
        );
      });

      it("should throw because the task argument is required but it is not provided", function () {
        const command = "npx hardhat task0";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = [false];

        assert.throws(
          () => parseTaskAndArguments(cliArguments, usedCliArguments, hre),
          new HardhatError(
            HardhatError.ERRORS.ARGUMENTS.MISSING_VALUE_FOR_ARGUMENT,
            {
              argument: "arg",
            },
          ),
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

        assert.throws(
          () => parseTaskAndArguments(cliArguments, usedCliArguments, hre),
          new HardhatError(
            HardhatError.ERRORS.ARGUMENTS.MISSING_VALUE_FOR_ARGUMENT,
            {
              argument: "arg",
            },
          ),
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

        assert.throws(
          () => parseTaskAndArguments(cliArguments, usedCliArguments, hre),
          new HardhatError(
            HardhatError.ERRORS.ARGUMENTS.MISSING_VALUE_FOR_ARGUMENT,
            {
              argument: "arg",
            },
          ),
        );
      });
    });

    describe("formatting of arguments types", function () {
      const RANDOM_FILE_PATH = "random-path/sample-file.txt";

      describe("options", function () {
        before(async function () {
          tasksBuilders = [
            task(["task0"])
              .addOption({ name: "arg", type: ArgumentType.BIGINT })
              .addOption({
                name: "arg2",
                type: ArgumentType.BOOLEAN,
              })
              .addOption({ name: "arg3", type: ArgumentType.FILE })
              .addOption({ name: "arg4", type: ArgumentType.FLOAT })
              .addOption({ name: "arg5", type: ArgumentType.INT })
              .addOption({
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
            .addOption({ name: "arg" })
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
          "npx hardhat task1 --arg <value> --network localhost <posValue> <posValue2> --verbose <varValue1> <varValue2>";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = [
          false,
          false,
          false,
          true,
          true,
          false,
          false,
          true,
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
        assert.throws(
          () => parseTaskAndArguments(cliArguments, usedCliArguments, hre),
          new HardhatError(HardhatError.ERRORS.ARGUMENTS.UNUSED_ARGUMENT, {
            value: "<value>",
          }),
        );
      });
    });
  });
});
