import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { createHardhatRuntimeEnvironment } from "@nomicfoundation/hardhat-core";
import {
  ParameterType,
  globalFlag,
  globalParameter,
  task,
} from "@nomicfoundation/hardhat-core/config";
import {
  GlobalParameterMap,
  GlobalParameterMapEntry,
} from "@nomicfoundation/hardhat-core/types/global-parameters";
import { HardhatRuntimeEnvironment } from "@nomicfoundation/hardhat-core/types/hre";
import {
  NewTaskDefinition,
  NewTaskDefinitionBuilder,
} from "@nomicfoundation/hardhat-core/types/tasks";
import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { isCi } from "@nomicfoundation/hardhat-utils/ci";

import {
  parseGlobalArguments,
  parseHardhatSpecialArguments,
  parseTaskAndArguments,
} from "../../../src/internal/cli/main.js";

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

describe("main", function () {
  describe("parseHardhatSpecialArguments", function () {
    it("should set all the hardhat special parameters", async function () {
      // All the <value> and "task" should be ignored
      const command =
        "npx hardhat --help <value> --version --show-stack-traces task --config ./path-to-config <value>";

      const cliArguments = command.split(" ").slice(2);
      const usedCliArguments = new Array(cliArguments.length).fill(false);

      const { configPath, showStackTraces, help, version } =
        await parseHardhatSpecialArguments(cliArguments, usedCliArguments);

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
      assert.equal(configPath, "./path-to-config");
      assert.equal(showStackTraces, true);
      assert.equal(help, true);
      assert.equal(version, true);
    });

    it("should not set any hardhat special parameters", async function () {
      const command = "npx hardhat <value> --random-flag";

      const cliArguments = command.split(" ").slice(2);
      const usedCliArguments = new Array(cliArguments.length).fill(false);

      const { configPath, showStackTraces, help, version } =
        await parseHardhatSpecialArguments(cliArguments, usedCliArguments);

      assert.deepEqual(
        usedCliArguments,
        new Array(cliArguments.length).fill(false),
      );
      assert.equal(configPath, undefined);
      assert.equal(help, false);
      assert.equal(version, false);

      // In the GitHub CI this value is true, but in the local environment it is false
      const expected = isCi();
      assert.equal(showStackTraces, expected);
    });

    it("should throw an error because the config param is passed twice", async function () {
      const command = "npx hardhat --config ./path1 --config ./path2";

      const cliArguments = command.split(" ").slice(2);
      const usedCliArguments = new Array(cliArguments.length).fill(false);

      assert.rejects(
        async () =>
          parseHardhatSpecialArguments(cliArguments, usedCliArguments),
        new HardhatError(HardhatError.ERRORS.ARGUMENTS.DUPLICATED_NAME, {
          name: "--config",
        }),
      );
    });

    it("should throw an error because the config param is passed but there is no path after it", async function () {
      const command = "npx hardhat --config";

      const cliArguments = command.split(" ").slice(2);
      const usedCliArguments = new Array(cliArguments.length).fill(false);

      assert.rejects(
        async () =>
          parseHardhatSpecialArguments(cliArguments, usedCliArguments),
        new HardhatError(HardhatError.ERRORS.ARGUMENTS.MISSING_CONFIG_FILE),
      );
    });
  });

  describe("parseGlobalArguments", function () {
    // The function "parseGlobalArguments" uses the same function "parseDoubleDashArgs" that is used to parse named parameters.
    // Most of the tests to check the "parseDoubleDashArgs" logic are in the named parameter section of these tests.

    let globalParamsIndex: GlobalParameterMap;

    before(function () {
      const GLOBAL_PARAM = globalParameter({
        name: "param",
        parameterType: ParameterType.STRING,
        defaultValue: "default",
        description: "",
      });

      const GLOBAL_FLAG = globalFlag({
        name: "flag",
        description: "",
      });

      globalParamsIndex = new Map<string, GlobalParameterMapEntry>([
        ["param", { pluginId: "1", param: GLOBAL_PARAM }],
        ["flag", { pluginId: "1", param: GLOBAL_FLAG }],
      ]);
    });

    it("should get the global parameter with the values passed in the cli", async function () {
      const command = "npx hardhat task --param <value1> <value2> <value3>";

      const cliArguments = command.split(" ").slice(2);
      const usedCliArguments = new Array(cliArguments.length).fill(false);

      const globalArguments = await parseGlobalArguments(
        globalParamsIndex,
        cliArguments,
        usedCliArguments,
      );

      assert.deepEqual(usedCliArguments, [false, true, true, false, false]);
      assert.deepEqual(globalArguments, {
        param: "<value1>",
      });
    });

    it("should have a flag behavior (no bool value required after)", async function () {
      const command = "npx hardhat task --flag <value>";

      const cliArguments = command.split(" ").slice(2);
      const usedCliArguments = new Array(cliArguments.length).fill(false);

      const globalArguments = await parseGlobalArguments(
        globalParamsIndex,
        cliArguments,
        usedCliArguments,
      );

      assert.deepEqual(usedCliArguments, [false, true, false]);
      assert.deepEqual(globalArguments, {
        flag: true,
      });
    });

    it("should parse the bool value after the flag", async function () {
      const command = "npx hardhat task --flag true <value>";

      const cliArguments = command.split(" ").slice(2);
      const usedCliArguments = new Array(cliArguments.length).fill(false);

      const globalArguments = await parseGlobalArguments(
        globalParamsIndex,
        cliArguments,
        usedCliArguments,
      );

      assert.deepEqual(usedCliArguments, [false, true, true, false]);
      assert.deepEqual(globalArguments, {
        flag: true,
      });
    });

    it("should not fail when a global parameter is not recognized (it might be a task parameter)", async function () {
      const command = "npx hardhat task --taskFlag <value>";

      const cliArguments = command.split(" ").slice(2);
      const usedCliArguments = new Array(cliArguments.length).fill(false);

      const globalArguments = await parseGlobalArguments(
        globalParamsIndex,
        cliArguments,
        usedCliArguments,
      );

      assert.deepEqual(usedCliArguments, [false, false, false]);
      assert.deepEqual(globalArguments, {});
    });
  });

  describe("parseTaskAndArguments", function () {
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

      it("should get the tasks and the subtask and skip the global param", function () {
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

    describe("task and subtask with named parameters", function () {
      before(async function () {
        tasksBuilders = [
          task(["task0"]).addNamedParameter({
            name: "param",
          }),
          task(["task1"]).addNamedParameter({
            name: "flag",
            type: ParameterType.BOOLEAN,
            defaultValue: false, // flag behavior
          }),
          task(["task2"]).addNamedParameter({
            name: "param",
            type: ParameterType.BOOLEAN,
            defaultValue: true,
          }),
          task(["task3"]).addNamedParameter({
            name: "param",
            type: ParameterType.BOOLEAN,
          }),
          task(["task4"]).addNamedParameter({
            name: "camelCaseParam",
          }),
        ];

        subtasksBuilders = [
          task(["task0", "subtask0"]).addNamedParameter({
            name: "param",
          }),
        ];

        ({ hre, tasks, subtasks } = await getTasksAndHreEnvironment(
          tasksBuilders,
          subtasksBuilders,
        ));
      });

      it("should get the task and its parameter", function () {
        const command = "npx hardhat task0 --param <paramValue>";

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
          param: "<paramValue>",
        });
      });

      it("should get the subtask and its parameter", function () {
        const command = "npx hardhat task0 subtask0 --param <paramValue>";

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
          param: "<paramValue>",
        });
      });

      it("should get the task and its parameter as type boolean with value set to true (flag behavior)", function () {
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

      it("should get the task and its parameter as type boolean - even though it has a flag behavior, boolean values are still consumed", function () {
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
        const command = "npx hardhat task2 --param false";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        const res = parseTaskAndArguments(cliArguments, usedCliArguments, hre);

        assert.ok(!Array.isArray(res), "Result should be an array");
        assert.equal(res.task.id, tasks[2].id);
        assert.deepEqual(
          usedCliArguments,
          new Array(cliArguments.length).fill(true),
        );
        assert.deepEqual(res.taskArguments, { param: false });
      });

      it("should get the required bool value (the bool value must be specified, not a flag behavior because default is undefined)", function () {
        const command = "npx hardhat task3 --param true";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        const res = parseTaskAndArguments(cliArguments, usedCliArguments, hre);

        assert.ok(!Array.isArray(res), "Result should be an array");
        assert.equal(res.task.id, tasks[3].id);
        assert.deepEqual(
          usedCliArguments,
          new Array(cliArguments.length).fill(true),
        );
        assert.deepEqual(res.taskArguments, { param: true });
      });

      it("should convert on the fly the camelCase parameter to kebab-case", function () {
        const command = "npx hardhat task4 --camel-case-param <value>";

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
          camelCaseParam: "<value>",
        });
      });

      it("should throw because the parameter is not defined", function () {
        const command = "npx hardhat task0 --undefinedParam <value>";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        assert.throws(
          () => parseTaskAndArguments(cliArguments, usedCliArguments, hre),
          new HardhatError(
            HardhatError.ERRORS.ARGUMENTS.UNRECOGNIZED_NAMED_PARAM,
            {
              parameter: "--undefinedParam",
            },
          ),
        );
      });

      it("should throw because the task parameter is declared before the task name", function () {
        const command = "npx hardhat --param <paramValue> task0";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        assert.throws(
          () => parseTaskAndArguments(cliArguments, usedCliArguments, hre),
          new HardhatError(
            HardhatError.ERRORS.ARGUMENTS.UNRECOGNIZED_NAMED_PARAM,
            {
              parameter: "--param",
            },
          ),
        );
      });

      it("should throw because the task parameter is required but no value is associated to it", function () {
        const command = "npx hardhat task0 --param";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        assert.throws(
          () => parseTaskAndArguments(cliArguments, usedCliArguments, hre),
          new HardhatError(
            HardhatError.ERRORS.ARGUMENTS.MISSING_VALUE_FOR_PARAMETER,
            {
              paramName: "--param",
            },
          ),
        );
      });

      it("should throw because the task parameter is required but there is no value right after it to consume", function () {
        const command = "npx hardhat task0 --param --global-flag <value>";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = [false, false, true, false];

        assert.throws(
          () => parseTaskAndArguments(cliArguments, usedCliArguments, hre),
          new HardhatError(
            HardhatError.ERRORS.ARGUMENTS.MISSING_VALUE_FOR_PARAMETER,
            {
              paramName: "--param",
            },
          ),
        );
      });

      it("should throw because the task parameter is required but it is not provided", function () {
        const command = "npx hardhat task0";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = [false];

        assert.throws(
          () => parseTaskAndArguments(cliArguments, usedCliArguments, hre),
          new HardhatError(
            HardhatError.ERRORS.ARGUMENTS.MISSING_VALUE_FOR_PARAMETER,
            {
              paramName: "param",
            },
          ),
        );
      });
    });

    describe("task and subtask with positional parameters", function () {
      before(async function () {
        tasksBuilders = [
          task(["task0"]).addPositionalParameter({
            name: "param",
          }),
          task(["task1"])
            .addPositionalParameter({
              name: "param",
            })
            .addPositionalParameter({ name: "param2" }),
        ];

        subtasksBuilders = [
          task(["task0", "subtask0"]).addPositionalParameter({
            name: "param",
          }),
          task(["task1", "subtask1"])
            .addPositionalParameter({
              name: "param",
            })
            .addPositionalParameter({
              name: "param2",
              defaultValue: "default",
            }),
        ];

        ({ hre, tasks, subtasks } = await getTasksAndHreEnvironment(
          tasksBuilders,
          subtasksBuilders,
        ));
      });

      it("should get the tasks and its required parameter", function () {
        const command = "npx hardhat task0 <paramValue>";

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
          param: "<paramValue>",
        });
      });

      it("should get the subtask and its required parameter", function () {
        const command = "npx hardhat task1 subtask1 <paramValue>";

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
          param: "<paramValue>",
        });
      });

      it("should get the tasks and its required parameter that comes after the --", function () {
        // subtask is a param value in this scenario, not a subtask because it is preceded by "--"
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
          param: "subtask0",
        });
      });

      it("should get the tasks and its required parameter (the positional argument has the same value as a subtask name)", function () {
        // subtask1 is a param value in this scenario, not a subtask because it is preceded by a positional value
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
          param: "foo",
          param2: "subtask1",
        });
      });

      it("should get the subtasks and not complain about the missing optional parameter", function () {
        const command = "npx hardhat task1 subtask1 <paramValue>";

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
          param: "<paramValue>",
        });
      });

      it("should get the subtasks and its optional parameter passed in the cli", function () {
        const command =
          "npx hardhat task1 subtask1 <paramValue> <optParamValue>";

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
          param: "<paramValue>",
          param2: "<optParamValue>",
        });
      });

      it("should throw an error because the required parameter is not passed", function () {
        const command = "npx hardhat task0";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = [false];

        assert.throws(
          () => parseTaskAndArguments(cliArguments, usedCliArguments, hre),
          new HardhatError(
            HardhatError.ERRORS.ARGUMENTS.MISSING_VALUE_FOR_PARAMETER,
            {
              paramName: "param",
            },
          ),
        );
      });
    });

    describe("task and subtask with variadic parameters", function () {
      before(async function () {
        tasksBuilders = [
          task(["task0"]).addVariadicParameter({
            name: "param",
          }),
        ];

        subtasksBuilders = [
          task(["task0", "subtask0"]).addVariadicParameter({
            name: "param",
            defaultValue: ["default"],
          }),
        ];

        ({ hre, tasks, subtasks } = await getTasksAndHreEnvironment(
          tasksBuilders,
          subtasksBuilders,
        ));
      });

      it("should get the parameters", function () {
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
          param: ["<val1>", "<val2>", "<val3>"],
        });
      });

      it("should not throw when a parameters is not passed and there is a default value", function () {
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

      it("should throw when a parameter is not passed and there is no default value", function () {
        const command = "npx task task0";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = [false];

        assert.throws(
          () => parseTaskAndArguments(cliArguments, usedCliArguments, hre),
          new HardhatError(
            HardhatError.ERRORS.ARGUMENTS.MISSING_VALUE_FOR_PARAMETER,
            {
              paramName: "param",
            },
          ),
        );
      });
    });

    describe("formatting of parameters types", function () {
      const RANDOM_FILE_PATH = "random-path/sample-file.txt";

      describe("named parameters", function () {
        before(async function () {
          tasksBuilders = [
            task(["task0"])
              .addNamedParameter({ name: "param", type: ParameterType.BIGINT })
              .addNamedParameter({
                name: "param2",
                type: ParameterType.BOOLEAN,
              })
              .addNamedParameter({ name: "param3", type: ParameterType.FILE })
              .addNamedParameter({ name: "param4", type: ParameterType.FLOAT })
              .addNamedParameter({ name: "param5", type: ParameterType.INT })
              .addNamedParameter({
                name: "param6",
                type: ParameterType.STRING,
              }),
          ];

          ({ hre, tasks, subtasks } = await getTasksAndHreEnvironment(
            tasksBuilders,
            [],
          ));
        });

        it("should correctly format the parameters accordingly to their types", function () {
          const command = `npx hardhat task0 --param 1234 --param2 true --param3 ${RANDOM_FILE_PATH} --param4 12.34 --param5 1234 --param6 hello`;

          const cliArguments = command.split(" ").slice(2);
          const usedCliArguments = new Array(cliArguments.length).fill(false);

          const res = parseTaskAndArguments(
            command.split(" ").slice(2),
            usedCliArguments,
            hre,
          );

          assert.ok(!Array.isArray(res), "Result should be an array");
          assert.deepEqual(res.taskArguments, {
            param: 1234n,
            param2: true,
            param3: RANDOM_FILE_PATH,
            param4: 12.34,
            param5: 1234,
            param6: "hello",
          });
        });
      });

      describe("positional parameters", function () {
        before(async function () {
          tasksBuilders = [
            task(["task0"])
              .addPositionalParameter({
                name: "param",
                type: ParameterType.BIGINT,
              })
              .addPositionalParameter({
                name: "param2",
                type: ParameterType.BOOLEAN,
              })
              .addPositionalParameter({
                name: "param3",
                type: ParameterType.FILE,
              })
              .addPositionalParameter({
                name: "param4",
                type: ParameterType.FLOAT,
              })
              .addPositionalParameter({
                name: "param5",
                type: ParameterType.INT,
              })
              .addPositionalParameter({
                name: "param6",
                type: ParameterType.STRING,
              }),
          ];

          ({ hre, tasks, subtasks } = await getTasksAndHreEnvironment(
            tasksBuilders,
            [],
          ));
        });

        it("should correctly format the parameters accordingly to their types", function () {
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
            param: 1234n,
            param2: true,
            param3: RANDOM_FILE_PATH,
            param4: 12.34,
            param5: 1234,
            param6: "hello",
          });
        });
      });

      describe("variadic parameters", function () {
        const paramTypes = [
          ParameterType.BIGINT,
          ParameterType.BOOLEAN,
          ParameterType.FILE,
          ParameterType.FLOAT,
          ParameterType.INT,
          ParameterType.STRING,
        ];

        const paramValues = [
          "1234",
          "true",
          RANDOM_FILE_PATH,
          "12.34",
          "1234",
          "hello",
        ];
        const paramResults = [
          1234n,
          true,
          RANDOM_FILE_PATH,
          12.34,
          1234,
          "hello",
        ];

        it("should correctly format the parameters accordingly to their types", async function () {
          // Variadic parameters can only be of a single type at a time, so loop through all the types
          for (let i = 0; i < paramTypes.length; i++) {
            tasksBuilders = [
              task(["task0"]).addVariadicParameter({
                name: "param",
                type: paramTypes[i],
              }),
            ];

            ({ hre, tasks, subtasks } = await getTasksAndHreEnvironment(
              tasksBuilders,
              [],
            ));

            const command = `npx hardhat task0 ${paramValues[i]}`;

            const cliArguments = command.split(" ").slice(2);
            const usedCliArguments = new Array(cliArguments.length).fill(false);

            const res = parseTaskAndArguments(
              command.split(" ").slice(2),
              usedCliArguments,
              hre,
            );

            assert.ok(!Array.isArray(res), "Result should be an array");
            assert.deepEqual(res.taskArguments, {
              param: [paramResults[i]],
            });
          }
        });
      });
    });

    describe("combine all the parameters' types", function () {
      before(async function () {
        tasksBuilders = [
          task(["task0"])
            .addNamedParameter({
              name: "param",
              type: ParameterType.BOOLEAN,
              defaultValue: false,
            })
            .addPositionalParameter({ name: "posParam" }),
          task(["task1"])
            .addNamedParameter({ name: "param" })
            .addPositionalParameter({ name: "posParam" })
            .addPositionalParameter({
              name: "posParam2",
              defaultValue: "default",
            })
            .addVariadicParameter({
              name: "varParam",
              defaultValue: ["default"],
            }),
          task(["task2"])
            .addPositionalParameter({
              name: "posParam",
              defaultValue: "default",
            })
            .addPositionalParameter({
              name: "posParam2",
              defaultValue: "default2",
            })
            .addPositionalParameter({
              name: "posParam3",
              defaultValue: "default3",
            })
            .addVariadicParameter({
              name: "varParam",
              defaultValue: ["default"],
            }),
        ];

        subtasksBuilders = [task(["task0", "subtask0"])];

        ({ hre, tasks, subtasks } = await getTasksAndHreEnvironment(
          tasksBuilders,
          subtasksBuilders,
        ));
      });

      it("should not parse as a named parameter because everything after a standalone '--' should be considered a positional parameter", function () {
        const command = "npx hardhat task0 -- --param"; // '--param' should be considered a positional parameter

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        const res = parseTaskAndArguments(cliArguments, usedCliArguments, hre);

        assert.ok(!Array.isArray(res), "Result should be an array");
        assert.equal(res.task.id, tasks[0].id);
        assert.deepEqual(
          usedCliArguments,
          new Array(cliArguments.length).fill(true),
        );
        assert.deepEqual(res.taskArguments, { posParam: "--param" });
      });

      it("should get the task, its parameters passed in the cli and ignore global arguments", function () {
        const command =
          "npx hardhat task1 --param <value> --network localhost <posValue> <posValue2> --verbose <varValue1> <varValue2>";

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
          param: "<value>",
          posParam: "<posValue>",
          posParam2: "<posValue2>",
          varParam: ["<varValue1>", "<varValue2>"],
        });
      });

      it("should consume all the positional optional parameters and not get any variadic parameters", function () {
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
          posParam: "<posValue>",
          posParam2: "<posValue2>",
          posParam3: "<posValue3>",
        });
      });

      it("should throw because there is an unused argument", function () {
        const command = "npx hardhat task0 subtask0 <value>";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        // Throws because the flag parameter does not expect values, so the "false" argument will not be consumed
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
