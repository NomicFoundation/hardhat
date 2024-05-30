import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { createHardhatRuntimeEnvironment } from "@nomicfoundation/hardhat-core";
import { ParameterType, task } from "@nomicfoundation/hardhat-core/config";
import { HardhatRuntimeEnvironment } from "@nomicfoundation/hardhat-core/types/hre";
import { NewTaskDefinition } from "@nomicfoundation/hardhat-core/types/tasks";
import { HardhatError } from "@nomicfoundation/hardhat-errors";

import { parseTaskAndArguments } from "../../../src/internal/cli/main.js";

describe("main", function () {
  let hre: HardhatRuntimeEnvironment;

  // newTaskDefinitionS and newSubtaskDefinitionS are defined in the "before()" hooks before every "functionality test groups".
  let newTaskDefinition: NewTaskDefinition;
  let newSubtaskDefinition: NewTaskDefinition;

  describe("parseTaskAndArguments", function () {
    describe("only task and subtask", function () {
      before(async function () {
        newTaskDefinition = task(["task"])
          .setAction(() => {})
          .build();

        newSubtaskDefinition = task(["task", "subtask"])
          .setAction(() => {})
          .build();

        hre = await createHardhatRuntimeEnvironment({
          tasks: [newTaskDefinition, newSubtaskDefinition],
        });
      });

      it("should get the tasks and the subtask and skip the global param", function () {
        const command = "npx hardhat task --network localhost subtask";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = [false, true, true, false];

        const res = parseTaskAndArguments(cliArguments, usedCliArguments, hre);

        assert.ok(!Array.isArray(res), "Result should be an array");
        assert.equal(res.task.id, newSubtaskDefinition.id);
        assert.deepEqual(usedCliArguments, [true, true, true, true]);
        assert.deepEqual(res.taskArguments, {});
      });
    });

    describe("task and subtask with named parameters", function () {
      before(async function () {
        newTaskDefinition = task(["task"])
          .addNamedParameter({ name: "param" })
          .addNamedParameter({
            name: "flag",
            type: ParameterType.BOOLEAN,
          })
          .addNamedParameter({
            name: "optionFlag",
          })
          .setAction(() => {})
          .build();

        newSubtaskDefinition = task(["task", "subtask"])
          .addNamedParameter({ name: "param" })
          .setAction(() => {})
          .build();

        hre = await createHardhatRuntimeEnvironment({
          tasks: [newTaskDefinition, newSubtaskDefinition],
        });
      });

      it("should get the tasks and its parameter", function () {
        const command = "npx hardhat task --param <paramValue>";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = [false, false, false];

        const res = parseTaskAndArguments(cliArguments, usedCliArguments, hre);

        assert.ok(!Array.isArray(res), "Result should be an array");
        assert.equal(res.task.id, newTaskDefinition.id);
        assert.deepEqual(usedCliArguments, [true, true, true]);
        assert.deepEqual(res.taskArguments, {
          param: "<paramValue>",
        });
      });

      it("should get the subtask and its parameter", async function () {
        const command = "npx hardhat task subtask --param <paramValue>";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = [false, false, false, false];

        const res = parseTaskAndArguments(cliArguments, usedCliArguments, hre);

        assert.ok(!Array.isArray(res), "Result should be an array");

        assert.equal(res.task.id, newSubtaskDefinition.id);
        assert.deepEqual(usedCliArguments, [true, true, true, true]);
        assert.deepEqual(res.taskArguments, {
          param: "<paramValue>",
        });
      });

      it("should get the tasks and its parameter as type boolean with value set to true", function () {
        const command = "npx hardhat task --flag";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = [false, false];

        const res = parseTaskAndArguments(cliArguments, usedCliArguments, hre);

        assert.ok(!Array.isArray(res), "Result should be an array");

        assert.equal(res.task.id, newTaskDefinition.id);
        assert.deepEqual(usedCliArguments, [true, true]);
        assert.deepEqual(res.taskArguments, { flag: true });
      });

      it("should read the (optional )bool value after the parameter", function () {
        const command = "npx hardhat task --flag false";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = [false, false, false];

        const res = parseTaskAndArguments(cliArguments, usedCliArguments, hre);

        assert.ok(!Array.isArray(res), "Result should be an array");
        assert.equal(res.task.id, newTaskDefinition.id);
        assert.deepEqual(usedCliArguments, [true, true, true]);
        assert.deepEqual(res.taskArguments, { flag: false });
      });

      it("should convert on the fly the camelCase parameter to kebab-case", function () {
        // Parameter with name "optionFlag" should be converted on the fly to "--option-flag"
        const command = "npx hardhat task --option-flag <value>";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = [false, false, false];

        const res = parseTaskAndArguments(cliArguments, usedCliArguments, hre);

        assert.ok(!Array.isArray(res), "Result should be an array");
        assert.equal(res.task.id, newTaskDefinition.id);
        assert.deepEqual(usedCliArguments, [true, true, true]);
        assert.deepEqual(res.taskArguments, { optionFlag: "<value>" });
      });

      it("should throw because the parameter is not defined", async function () {
        const command = "npx hardhat task --undefinedParam <value>";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = [false, false, false];

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

      it("should throw because the task parameter is declared before the task name", async function () {
        const command = "npx hardhat --param <paramValue> task";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = [false, false, false];

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

      it("should throw because the task parameter is declared but no value is associated to it", async function () {
        const command = "npx hardhat task --param";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = [false, false];

        assert.throws(
          () => parseTaskAndArguments(cliArguments, usedCliArguments, hre),
          new HardhatError(
            HardhatError.ERRORS.ARGUMENTS.MISSING_VALUE_FOR_NAMED_PARAMETER,
            {
              paramName: "--param",
            },
          ),
        );
      });
    });

    describe("task and subtask with positional parameters", function () {
      before(async function () {
        newTaskDefinition = task(["task"])
          .addPositionalParameter({ name: "param" })
          .addPositionalParameter({
            name: "param2",
            defaultValue: "defaultValue",
          })
          .setAction(() => {})
          .build();

        newSubtaskDefinition = task(["task", "subtask"])
          .addPositionalParameter({ name: "param" })
          .addPositionalParameter({
            name: "param2",
            defaultValue: "defaultValue",
          })
          .setAction(() => {})
          .build();

        hre = await createHardhatRuntimeEnvironment({
          tasks: [newTaskDefinition, newSubtaskDefinition],
        });
      });

      it("should get the tasks and its required parameter", function () {
        const command = "npx hardhat task <paramValue>";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = [false, false];

        const res = parseTaskAndArguments(cliArguments, usedCliArguments, hre);

        assert.ok(!Array.isArray(res), "Result should be an array");
        assert.equal(res.task.id, newTaskDefinition.id);
        assert.deepEqual(usedCliArguments, [true, true]);
        assert.deepEqual(res.taskArguments, {
          param: "<paramValue>",
        });
      });

      it("should get the tasks and its required parameter that comes after the --", function () {
        // subtask is a param value in this scenario, not a subtask because it is preceded by "--"
        const command = "npx hardhat task -- subtask";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = [false, false, false];

        const res = parseTaskAndArguments(cliArguments, usedCliArguments, hre);

        assert.ok(!Array.isArray(res), "Result should be an array");
        assert.equal(res.task.id, newTaskDefinition.id);
        assert.deepEqual(usedCliArguments, [true, true, true]);
        assert.deepEqual(res.taskArguments, {
          param: "subtask",
        });
      });

      it("should get the tasks and its required parameter (the positional argument has the same value as a subtask name)", function () {
        // The subtask is a param value in this scenario, not a subtask because it is preceded by a positional value
        const command = "npx hardhat task foo subtask";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = [false, false, false];

        const res = parseTaskAndArguments(cliArguments, usedCliArguments, hre);

        assert.ok(!Array.isArray(res), "Result should be an array");
        assert.equal(res.task.id, newTaskDefinition.id);
        assert.deepEqual(usedCliArguments, [true, true, true]);
        assert.deepEqual(res.taskArguments, {
          param: "foo",
          param2: "subtask",
        });
      });

      it("should get the subtasks and not complain about the missing optional parameter", function () {
        const command = "npx hardhat task subtask <paramValue>";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = [false, false, false];

        const res = parseTaskAndArguments(cliArguments, usedCliArguments, hre);

        assert.ok(!Array.isArray(res), "Result should be an array");
        assert.equal(res.task.id, newSubtaskDefinition.id);
        assert.deepEqual(usedCliArguments, [true, true, true]);
        assert.deepEqual(res.taskArguments, {
          param: "<paramValue>",
        });
      });

      it("should get the subtasks and its optional parameter passed in the cli", function () {
        const command = "npx hardhat task subtask <paramValue> <optParamValue>";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = [false, false, false, false];

        const res = parseTaskAndArguments(cliArguments, usedCliArguments, hre);

        assert.ok(!Array.isArray(res), "Result should be an array");
        assert.equal(res.task.id, newSubtaskDefinition.id);
        assert.deepEqual(usedCliArguments, [true, true, true, true]);
        assert.deepEqual(res.taskArguments, {
          param: "<paramValue>",
          param2: "<optParamValue>",
        });
      });
    });

    describe("task and subtask with variadic parameters", function () {
      before(async function () {
        newTaskDefinition = task(["task"])
          .addVariadicParameter({ name: "param" })
          .setAction(() => {})
          .build();

        hre = await createHardhatRuntimeEnvironment({
          tasks: [newTaskDefinition, newSubtaskDefinition],
        });
      });

      it("should get the parameters", function () {
        const command = "npx hardhat task <val1> <val2> <val3>";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = [false, false, false, false];

        const res = parseTaskAndArguments(cliArguments, usedCliArguments, hre);

        assert.ok(!Array.isArray(res), "Result should be an array");
        assert.equal(res.task.id, newTaskDefinition.id);
        assert.deepEqual(usedCliArguments, [true, true, true, true]);
        assert.deepEqual(res.taskArguments, {
          param: ["<val1>", "<val2>", "<val3>"],
        });
      });

      it("should not throw when the parameters are not passed", function () {
        const command = "npx hardhat task";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = [false];

        const res = parseTaskAndArguments(cliArguments, usedCliArguments, hre);

        assert.ok(!Array.isArray(res), "Result should be an array");
        assert.equal(res.task.id, newTaskDefinition.id);
        assert.deepEqual(usedCliArguments, [true]);
        assert.deepEqual(res.taskArguments, {});
      });
    });

    describe("formatting of parameters types", function () {
      describe("named parameters", function () {
        before(async function () {
          newTaskDefinition = task(["task"])
            .addNamedParameter({ name: "param", type: ParameterType.BIGINT })
            .addNamedParameter({ name: "param2", type: ParameterType.BOOLEAN })
            .addNamedParameter({ name: "param3", type: ParameterType.FILE })
            .addNamedParameter({ name: "param4", type: ParameterType.FLOAT })
            .addNamedParameter({ name: "param5", type: ParameterType.INT })
            .addNamedParameter({ name: "param6", type: ParameterType.STRING })
            .setAction(() => {})
            .build();

          hre = await createHardhatRuntimeEnvironment({
            tasks: [newTaskDefinition],
          });
        });

        it("should correctly format the parameters accordingly to their types", function () {
          const command =
            "npx hardhat task --param 1234 --param2 --param3 ./file-path --param4 12.34 --param5 1234 --param6 hello";

          const res = parseTaskAndArguments(
            command.split(" ").slice(2),
            [
              false,
              false,
              false,
              false,
              false,
              false,
              false,
              false,
              false,
              false,
              false,
              false,
            ],
            hre,
          );

          assert.ok(!Array.isArray(res), "Result should be an array");
          assert.deepEqual(res.taskArguments, {
            param: BigInt(1234),
            param2: true,
            param3: "./file-path",
            param4: 12.34,
            param5: 1234,
            param6: "hello",
          });
        });
      });

      describe("positional parameters", function () {
        before(async function () {
          newTaskDefinition = task(["task"])
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
            .addPositionalParameter({ name: "param5", type: ParameterType.INT })
            .addPositionalParameter({
              name: "param6",
              type: ParameterType.STRING,
            })
            .setAction(() => {})
            .build();

          hre = await createHardhatRuntimeEnvironment({
            tasks: [newTaskDefinition],
          });
        });

        it("should correctly format the parameters accordingly to their types", function () {
          const command =
            "npx hardhat task 1234 true ./file-path 12.34 1234 hello";

          const res = parseTaskAndArguments(
            command.split(" ").slice(2),
            [false, false, false, false, false, false, false],
            hre,
          );

          assert.ok(!Array.isArray(res), "Result should be an array");
          assert.deepEqual(res.taskArguments, {
            param: BigInt(1234),
            param2: true,
            param3: "./file-path",
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
          "./file-path",
          "12.34",
          "1234",
          "hello",
        ];
        const paramResults = [
          BigInt(1234),
          true,
          "./file-path",
          12.34,
          1234,
          "hello",
        ];

        it("should correctly format the parameters accordingly to their types", async function () {
          // Variadic parameters can only be of a single type at a time, so loop through all the types
          for (let i = 0; i < paramTypes.length; i++) {
            newTaskDefinition = task(["task"])
              .addVariadicParameter({
                name: "param",
                type: paramTypes[i],
              })
              .setAction(() => {})
              .build();

            hre = await createHardhatRuntimeEnvironment({
              tasks: [newTaskDefinition],
            });

            const command = `npx hardhat task ${paramValues[i]}`;

            const res = parseTaskAndArguments(
              command.split(" ").slice(2),
              [false, false],
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
        newTaskDefinition = task(["task"])
          .addNamedParameter({ name: "param" })
          .addPositionalParameter({ name: "posParam" })
          .addPositionalParameter({
            name: "posParam2",
            defaultValue: "default",
          })
          .addVariadicParameter({ name: "varParam", defaultValue: ["default"] })
          .setAction(() => {})
          .build();

        newSubtaskDefinition = task(["task", "subtask"])
          .setAction(() => {})
          .build();

        hre = await createHardhatRuntimeEnvironment({
          tasks: [newTaskDefinition, newSubtaskDefinition],
        });
      });

      it("should get the subtasks and its optional parameter passed in the cli", function () {
        const command =
          "npx hardhat task --param <value> --network localhost <posValue> <posValue2> --verbose <varValue1> <varValue2>";

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
        assert.equal(res.task.id, newTaskDefinition.id);
        assert.deepEqual(usedCliArguments, [
          true,
          true,
          true,
          true,
          true,
          true,
          true,
          true,
          true,
          true,
        ]);
        assert.deepEqual(res.taskArguments, {
          param: "<value>",
          posParam: "<posValue>",
          posParam2: "<posValue2>",
          varParam: ["<varValue1>", "<varValue2>"],
        });
      });

      it("should throw because there is an unused argument", function () {
        const command = "npx hardhat task subtask <value>";

        const cliArguments = command.split(" ").slice(2);
        const usedCliArguments = [false, false, false];

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
