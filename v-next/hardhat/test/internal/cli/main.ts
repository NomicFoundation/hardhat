import assert from "node:assert/strict";
import path from "node:path";
import { before, describe, it } from "node:test";

import { createHardhatRuntimeEnvironment } from "@nomicfoundation/hardhat-core";
import { ParameterType, task } from "@nomicfoundation/hardhat-core/config";
import { HardhatRuntimeEnvironment } from "@nomicfoundation/hardhat-core/types/hre";
import {
  NewTaskDefinition,
  NewTaskDefinitionBuilder,
} from "@nomicfoundation/hardhat-core/types/tasks";
import { HardhatError } from "@nomicfoundation/hardhat-errors";

import { parseTaskAndArguments } from "../../../src/internal/cli/main.js";

const FIXTURE_RELATIVE_FILE_PATH =
  "./test/fixture-projects/cli/type-validation/test.txt";

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
  let hre: HardhatRuntimeEnvironment;
  let tasks: NewTaskDefinition[];
  let subtasks: NewTaskDefinition[];

  // Define your tasks and subtasks here.
  // tasksBuilders and subtasksBuilders are defined in the "before()" hooks before every "functionality test groups".
  let tasksBuilders: NewTaskDefinitionBuilder[] = [];
  let subtasksBuilders: NewTaskDefinitionBuilder[] = [];

  describe("parseTaskAndArguments", function () {
    describe("only task and subtask", function () {
      before(async function () {
        tasksBuilders = [task(["task0"])];

        subtasksBuilders = [task(["task0", "subtask0"])];

        ({ hre, tasks, subtasks } = await getTasksAndHreEnvironment(
          tasksBuilders,
          subtasksBuilders,
        ));
      });

      it("should get the tasks and the subtask and skip the global param", async function () {
        const command = "npx hardhat task0 --network localhost subtask0";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = [false, true, true, false];

        const res = await parseTaskAndArguments(
          cliArguments,
          usedCliArguments,
          hre,
        );

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

      it("should get the task and its parameter", async function () {
        const command = "npx hardhat task0 --param <paramValue>";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        const res = await parseTaskAndArguments(
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
          param: "<paramValue>",
        });
      });

      it("should get the subtask and its parameter", async function () {
        const command = "npx hardhat task0 subtask0 --param <paramValue>";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        const res = await parseTaskAndArguments(
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
          param: "<paramValue>",
        });
      });

      it("should get the task and its parameter as type boolean with value set to true (flag behavior)", async function () {
        const command = "npx hardhat task1 --flag";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        const res = await parseTaskAndArguments(
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

      it("should get the required bool value (the bool value must be specified, not a flag behavior because default is true)", async function () {
        const command = "npx hardhat task2 --param false";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        const res = await parseTaskAndArguments(
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
        assert.deepEqual(res.taskArguments, { param: false });
      });

      it("should get the required bool value (the bool value must be specified, not a flag behavior because default is undefined)", async function () {
        const command = "npx hardhat task3 --param true";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        const res = await parseTaskAndArguments(
          cliArguments,
          usedCliArguments,
          hre,
        );

        assert.ok(!Array.isArray(res), "Result should be an array");
        assert.equal(res.task.id, tasks[3].id);
        assert.deepEqual(
          usedCliArguments,
          new Array(cliArguments.length).fill(true),
        );
        assert.deepEqual(res.taskArguments, { param: true });
      });

      it("should convert on the fly the camelCase parameter to kebab-case", async function () {
        const command = "npx hardhat task4 --camel-case-param <value>";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        const res = await parseTaskAndArguments(
          cliArguments,
          usedCliArguments,
          hre,
        );

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

      it("should throw because the parameter is not defined", async function () {
        const command = "npx hardhat task0 --undefinedParam <value>";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        assert.rejects(
          async () =>
            parseTaskAndArguments(cliArguments, usedCliArguments, hre),
          new HardhatError(
            HardhatError.ERRORS.ARGUMENTS.UNRECOGNIZED_NAMED_PARAM,
            {
              parameter: "--undefinedParam",
            },
          ),
        );
      });

      it("should throw because the task parameter is declared before the task name", async function () {
        const command = "npx hardhat --param <paramValue> task0";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        assert.rejects(
          async () =>
            parseTaskAndArguments(cliArguments, usedCliArguments, hre),
          new HardhatError(
            HardhatError.ERRORS.ARGUMENTS.UNRECOGNIZED_NAMED_PARAM,
            {
              parameter: "--param",
            },
          ),
        );
      });

      it("should throw because the task parameter is required but no value is associated to it", async function () {
        const command = "npx hardhat task0 --param";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        assert.rejects(
          async () =>
            parseTaskAndArguments(cliArguments, usedCliArguments, hre),
          new HardhatError(
            HardhatError.ERRORS.ARGUMENTS.MISSING_VALUE_FOR_PARAMETER,
            {
              paramName: "--param",
            },
          ),
        );
      });

      it("should throw because the task parameter is required but there is no value right after it to consume", async function () {
        const command = "npx hardhat task0 --param --global-flag <value>";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = [false, false, true, false];

        assert.rejects(
          async () =>
            parseTaskAndArguments(cliArguments, usedCliArguments, hre),
          new HardhatError(
            HardhatError.ERRORS.ARGUMENTS.MISSING_VALUE_FOR_PARAMETER,
            {
              paramName: "--param",
            },
          ),
        );
      });

      it("should throw because the task parameter is required but it is not provided", async function () {
        const command = "npx hardhat task0";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = [false];

        assert.rejects(
          async () =>
            parseTaskAndArguments(cliArguments, usedCliArguments, hre),
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

      it("should get the tasks and its required parameter", async function () {
        const command = "npx hardhat task0 <paramValue>";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        const res = await parseTaskAndArguments(
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
          param: "<paramValue>",
        });
      });

      it("should get the subtask and its required parameter", async function () {
        const command = "npx hardhat task1 subtask1 <paramValue>";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        const res = await parseTaskAndArguments(
          cliArguments,
          usedCliArguments,
          hre,
        );

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

      it("should get the tasks and its required parameter that comes after the --", async function () {
        // subtask is a param value in this scenario, not a subtask because it is preceded by "--"
        const command = "npx hardhat task0 -- subtask0";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        const res = await parseTaskAndArguments(
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
          param: "subtask0",
        });
      });

      it("should get the tasks and its required parameter (the positional argument has the same value as a subtask name)", async function () {
        // subtask1 is a param value in this scenario, not a subtask because it is preceded by a positional value
        const command = "npx hardhat task1 foo subtask1";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        const res = await parseTaskAndArguments(
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
        assert.deepEqual(res.taskArguments, {
          param: "foo",
          param2: "subtask1",
        });
      });

      it("should get the subtasks and not complain about the missing optional parameter", async function () {
        const command = "npx hardhat task1 subtask1 <paramValue>";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        const res = await parseTaskAndArguments(
          cliArguments,
          usedCliArguments,
          hre,
        );

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

      it("should get the subtasks and its optional parameter passed in the cli", async function () {
        const command =
          "npx hardhat task1 subtask1 <paramValue> <optParamValue>";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        const res = await parseTaskAndArguments(
          cliArguments,
          usedCliArguments,
          hre,
        );

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

      it("should throw an error because the required parameter is not passed", async function () {
        const command = "npx hardhat task0";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = [false];

        assert.rejects(
          async () =>
            parseTaskAndArguments(cliArguments, usedCliArguments, hre),
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

      it("should get the parameters", async function () {
        const command = "npx hardhat task0 <val1> <val2> <val3>";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        const res = await parseTaskAndArguments(
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
          param: ["<val1>", "<val2>", "<val3>"],
        });
      });

      it("should not throw when a parameters is not passed and there is a default value", async function () {
        const command = "npx hardhat task0 subtask0";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        const res = await parseTaskAndArguments(
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
        assert.deepEqual(res.taskArguments, {});
      });

      it("should throw when a parameter is not passed and there is no default value", async function () {
        const command = "npx task task0";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = [false];

        assert.rejects(
          async () =>
            parseTaskAndArguments(cliArguments, usedCliArguments, hre),
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

        it("should correctly format the parameters accordingly to their types", async function () {
          const command = `npx hardhat task0 --param 1234 --param2 true --param3 ${FIXTURE_RELATIVE_FILE_PATH} --param4 12.34 --param5 1234 --param6 hello`;

          const cliArguments = command.split(" ").slice(2);
          const usedCliArguments = new Array(cliArguments.length).fill(false);

          const res = await parseTaskAndArguments(
            command.split(" ").slice(2),
            usedCliArguments,
            hre,
          );

          assert.ok(!Array.isArray(res), "Result should be an array");
          assert.deepEqual(res.taskArguments, {
            param: 1234n,
            param2: true,
            param3: path.join(process.cwd(), FIXTURE_RELATIVE_FILE_PATH),
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

        it("should correctly format the parameters accordingly to their types", async function () {
          const command = `npx hardhat task0 1234 true ${FIXTURE_RELATIVE_FILE_PATH} 12.34 1234 hello`;

          const cliArguments = command.split(" ").slice(2);
          const usedCliArguments = new Array(cliArguments.length).fill(false);

          const res = await parseTaskAndArguments(
            command.split(" ").slice(2),
            usedCliArguments,
            hre,
          );

          assert.ok(!Array.isArray(res), "Result should be an array");
          assert.deepEqual(res.taskArguments, {
            param: 1234n,
            param2: true,
            param3: path.join(process.cwd(), FIXTURE_RELATIVE_FILE_PATH),
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
          FIXTURE_RELATIVE_FILE_PATH,
          "12.34",
          "1234",
          "hello",
        ];
        const paramResults = [
          1234n,
          true,
          path.join(process.cwd(), FIXTURE_RELATIVE_FILE_PATH),
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

            const res = await parseTaskAndArguments(
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

      it("should not parse as a named parameter because everything after a standalone '--' should be considered a positional parameter", async function () {
        const command = "npx hardhat task0 -- --param"; // '--param' should be considered a positional parameter

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        const res = await parseTaskAndArguments(
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
        assert.deepEqual(res.taskArguments, { posParam: "--param" });
      });

      it("should get the task, its parameters passed in the cli and ignore global arguments", async function () {
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

        const res = await parseTaskAndArguments(
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
        assert.deepEqual(res.taskArguments, {
          param: "<value>",
          posParam: "<posValue>",
          posParam2: "<posValue2>",
          varParam: ["<varValue1>", "<varValue2>"],
        });
      });

      it("should consume all the positional optional parameters and not get any variadic parameters", async function () {
        const command = "npx hardhat task2 <posValue> <posValue2> <posValue3>";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        const res = await parseTaskAndArguments(
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
        assert.deepEqual(res.taskArguments, {
          posParam: "<posValue>",
          posParam2: "<posValue2>",
          posParam3: "<posValue3>",
        });
      });

      it("should throw because there is an unused argument", async function () {
        const command = "npx hardhat task0 subtask0 <value>";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = new Array(cliArguments.length).fill(false);

        // Throws because the flag parameter does not expect values, so the "false" argument will not be consumed
        assert.rejects(
          async () =>
            parseTaskAndArguments(cliArguments, usedCliArguments, hre),
          new HardhatError(HardhatError.ERRORS.ARGUMENTS.UNUSED_ARGUMENT, {
            value: "<value>",
          }),
        );
      });
    });
  });
});
