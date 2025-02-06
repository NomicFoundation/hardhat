import { assert } from "chai";
import sinon from "sinon";

import { ERRORS } from "../../../../src/internal/core/errors-list";
import * as types from "../../../../src/internal/core/params/argumentTypes";
import {
  OverriddenTaskDefinition,
  SimpleScopeDefinition,
  SimpleTaskDefinition,
} from "../../../../src/internal/core/tasks/task-definitions";
import { unsafeObjectKeys } from "../../../../src/internal/util/unsafe";
import {
  HardhatArguments,
  ParamDefinition,
  TaskDefinition,
} from "../../../../src/types";
import { expectHardhatError } from "../../../helpers/errors";

function expectThrowParamAlreadyDefinedError(f: () => any) {
  expectHardhatError(f, ERRORS.TASK_DEFINITIONS.PARAM_ALREADY_DEFINED);
}

function getLastPositionalParam(taskDefinition: TaskDefinition) {
  assert.isNotEmpty(taskDefinition.positionalParamDefinitions);
  return taskDefinition.positionalParamDefinitions[
    taskDefinition.positionalParamDefinitions.length - 1
  ];
}

function assertParamDefinition(
  actual: ParamDefinition<any>,
  expected: Partial<ParamDefinition<any>>
) {
  for (const key of unsafeObjectKeys(actual)) {
    if (expected[key] !== undefined) {
      assert.deepEqual(actual[key], expected[key]);
    }
  }
}

const runSuperNop: any = async () => {};
runSuperNop.isDefined = false;

describe("SimpleTaskDefinition", () => {
  describe("construction", () => {
    let taskDefinition: SimpleTaskDefinition;

    before("init taskDefinition", () => {
      taskDefinition = new SimpleTaskDefinition("name", true);
    });

    it("gets the right name", () => {
      assert.equal(taskDefinition.name, "name");
    });

    it("gets the right isSubtask flag", () => {
      assert.isTrue(taskDefinition.isSubtask);
    });

    it("starts without any param defined", () => {
      assert.deepEqual(taskDefinition.paramDefinitions, {});
      assert.isEmpty(taskDefinition.positionalParamDefinitions);
    });

    it("starts without any description", () => {
      assert.isUndefined(taskDefinition.description);
    });

    it("starts without any scope", () => {
      assert.isUndefined(taskDefinition.scope);
    });

    it("starts with an action that throws", () => {
      expectHardhatError(
        () => taskDefinition.action({}, {} as any, runSuperNop),
        ERRORS.TASK_DEFINITIONS.ACTION_NOT_SET
      );
    });
  });

  describe("construction with task identifiers", () => {
    let taskDefinition: SimpleTaskDefinition;

    before("init taskDefinition", () => {
      taskDefinition = new SimpleTaskDefinition(
        { scope: "scope", task: "name" },
        true
      );
    });

    it("gets the right name", () => {
      assert.equal(taskDefinition.name, "name");
    });

    it("gets the right scope", () => {
      assert.equal(taskDefinition.scope, "scope");
    });

    it("gets the right isSubtask flag", () => {
      assert.isTrue(taskDefinition.isSubtask);
    });

    it("starts without any param defined", () => {
      assert.deepEqual(taskDefinition.paramDefinitions, {});
      assert.isEmpty(taskDefinition.positionalParamDefinitions);
    });

    it("starts without any description", () => {
      assert.isUndefined(taskDefinition.description);
    });

    it("starts with an action that throws", () => {
      expectHardhatError(
        () => taskDefinition.action({}, {} as any, runSuperNop),
        ERRORS.TASK_DEFINITIONS.ACTION_NOT_SET
      );
    });
  });

  describe("setDescription", () => {
    it("Should change the description", () => {
      const taskDefinition = new SimpleTaskDefinition("name");
      assert.isUndefined(taskDefinition.description);

      taskDefinition.setDescription("A");
      assert.equal(taskDefinition.description, "A");

      taskDefinition.setDescription("B");
      assert.equal(taskDefinition.description, "B");
    });
  });

  describe("setAction", () => {
    it("Should change the action", async () => {
      const taskDefinition = new SimpleTaskDefinition("name");

      taskDefinition.setAction(async () => 1);
      let result = await taskDefinition.action({}, {} as any, runSuperNop);
      assert.equal(result, 1);

      const obj = {};
      taskDefinition.setAction(async () => obj);
      result = await taskDefinition.action({}, {} as any, runSuperNop);
      assert.equal(result, obj);
    });
  });

  describe("param definition rules", () => {
    let taskDefinition: SimpleTaskDefinition;

    beforeEach("init taskDefinition", () => {
      taskDefinition = new SimpleTaskDefinition("name", true);
    });

    describe("param name repetitions", () => {
      beforeEach("set param with name 'name'", () => {
        taskDefinition.addParam("name", "a description", "asd");
      });

      it("should throw if addParam repeats a param name", () => {
        expectThrowParamAlreadyDefinedError(() =>
          taskDefinition.addParam("name", "another desc")
        );
      });

      it("should throw if addOptionalParam repeats a param name", () => {
        expectThrowParamAlreadyDefinedError(() =>
          taskDefinition.addOptionalParam("name", "another desc")
        );
      });

      it("should throw if addFlag repeats a param name", () => {
        expectThrowParamAlreadyDefinedError(() =>
          taskDefinition.addFlag("name", "another desc")
        );
      });

      it("should throw if addPositionalParam repeats a param name", () => {
        expectThrowParamAlreadyDefinedError(() =>
          taskDefinition.addPositionalParam("name", "another desc")
        );
      });

      it("should throw if addOptionalPositionalParam repeats a param name", () => {
        expectThrowParamAlreadyDefinedError(() =>
          taskDefinition.addOptionalPositionalParam("name", "another desc")
        );
      });

      it("should throw if addVariadicPositionalParam repeats a param name", () => {
        expectThrowParamAlreadyDefinedError(() =>
          taskDefinition.addVariadicPositionalParam("name", "another desc")
        );
      });

      it("should throw if addOptionalVariadicPositionalParam repeats a param name", () => {
        expectThrowParamAlreadyDefinedError(() =>
          taskDefinition.addOptionalVariadicPositionalParam(
            "name",
            "another desc"
          )
        );
      });
    });

    describe("param name clashes with Hardhat's ones", () => {
      function testClashWith(name: string) {
        expectHardhatError(
          () => taskDefinition.addParam(name),
          ERRORS.TASK_DEFINITIONS.PARAM_CLASHES_WITH_HARDHAT_PARAM
        );
        expectHardhatError(
          () => taskDefinition.addOptionalParam(name),
          ERRORS.TASK_DEFINITIONS.PARAM_CLASHES_WITH_HARDHAT_PARAM
        );
        expectHardhatError(
          () => taskDefinition.addFlag(name),
          ERRORS.TASK_DEFINITIONS.PARAM_CLASHES_WITH_HARDHAT_PARAM
        );
        expectHardhatError(
          () => taskDefinition.addPositionalParam(name),
          ERRORS.TASK_DEFINITIONS.PARAM_CLASHES_WITH_HARDHAT_PARAM
        );
        expectHardhatError(
          () => taskDefinition.addOptionalPositionalParam(name),
          ERRORS.TASK_DEFINITIONS.PARAM_CLASHES_WITH_HARDHAT_PARAM
        );
        expectHardhatError(
          () => taskDefinition.addVariadicPositionalParam(name),
          ERRORS.TASK_DEFINITIONS.PARAM_CLASHES_WITH_HARDHAT_PARAM
        );
        expectHardhatError(
          () => taskDefinition.addOptionalVariadicPositionalParam(name),
          ERRORS.TASK_DEFINITIONS.PARAM_CLASHES_WITH_HARDHAT_PARAM
        );
      }

      it("Should throw if a param clashes", () => {
        // This is constructed to force a type error here if a Hardhat arg is
        // added and not tested.
        const hardhatArgs: HardhatArguments = {
          showStackTraces: true,
          network: "",
          version: false,
          emoji: false,
          help: false,
          verbose: false,
        };

        Object.keys(hardhatArgs).forEach((name) => testClashWith(name));
      });
    });

    describe("positional param rules", () => {
      describe("no mandatory positional param after an optional one", () => {
        beforeEach("add optional positional", () => {
          taskDefinition.addOptionalPositionalParam("asd");
        });

        it("throws when trying to add a new positional param", () => {
          expectHardhatError(
            () => taskDefinition.addPositionalParam("asd2"),
            ERRORS.TASK_DEFINITIONS.MANDATORY_PARAM_AFTER_OPTIONAL
          );
        });

        it("throws when trying to add a new variadic positional param", () => {
          expectHardhatError(
            () => taskDefinition.addVariadicPositionalParam("asd2"),
            ERRORS.TASK_DEFINITIONS.MANDATORY_PARAM_AFTER_OPTIONAL
          );
        });

        describe("should still accept non-positional ones", () => {
          it("should accept a common param", () => {
            taskDefinition.addParam("p");
            assert.notEqual(taskDefinition.paramDefinitions.p, undefined);
          });

          it("should accept an optional param", () => {
            taskDefinition.addOptionalParam("p");
            assert.notEqual(taskDefinition.paramDefinitions.p, undefined);
          });

          it("should accept a flag", () => {
            taskDefinition.addFlag("p");
            assert.notEqual(taskDefinition.paramDefinitions.p, undefined);
          });
        });
      });

      describe("accepts multiple optional params", () => {
        beforeEach("add optional positional", () => {
          taskDefinition.addOptionalPositionalParam("asd");
        });

        it("should accept an optional positional param", () => {
          taskDefinition.addOptionalPositionalParam("asd2");
          const last = getLastPositionalParam(taskDefinition);
          assert.equal(last.name, "asd2");
          assert.isTrue(last.isOptional);
        });

        it("should accept an optional variadic positional param", () => {
          taskDefinition.addOptionalVariadicPositionalParam("asd2");
          const last = getLastPositionalParam(taskDefinition);
          assert.equal(last.name, "asd2");
          assert.isTrue(last.isOptional);
          assert.isTrue(last.isVariadic);
        });
      });

      describe("no positional params after a variadic positional param", () => {
        beforeEach("add variadic param", () => {
          taskDefinition.addVariadicPositionalParam("asd");
        });

        it("should throw on adding a positional param", () => {
          expectHardhatError(
            () => taskDefinition.addPositionalParam("p"),
            ERRORS.TASK_DEFINITIONS.PARAM_AFTER_VARIADIC
          );
        });

        it("should throw on adding an optional positional param", () => {
          expectHardhatError(
            () => taskDefinition.addOptionalPositionalParam("p"),
            ERRORS.TASK_DEFINITIONS.PARAM_AFTER_VARIADIC
          );
        });

        it("should throw on adding another variadic param", () => {
          expectHardhatError(
            () => taskDefinition.addVariadicPositionalParam("p"),
            ERRORS.TASK_DEFINITIONS.PARAM_AFTER_VARIADIC
          );
        });

        it("should throw on adding an optional variadic param", () => {
          expectHardhatError(
            () => taskDefinition.addOptionalVariadicPositionalParam("p"),
            ERRORS.TASK_DEFINITIONS.PARAM_AFTER_VARIADIC
          );
        });

        describe("should still accept non-positional ones", () => {
          it("should accept a common param", () => {
            taskDefinition.addParam("p");
            assert.notEqual(taskDefinition.paramDefinitions.p, undefined);
          });

          it("should accept an optional param", () => {
            taskDefinition.addOptionalParam("p");
            assert.notEqual(taskDefinition.paramDefinitions.p, undefined);
          });

          it("should accept a flag", () => {
            taskDefinition.addFlag("p");
            assert.notEqual(taskDefinition.paramDefinitions.p, undefined);
          });
        });
      });
    });
  });

  describe("Setting params", () => {
    let taskDefinition: SimpleTaskDefinition;

    beforeEach("init taskDefinition", () => {
      taskDefinition = new SimpleTaskDefinition("name", true);
    });

    describe("addParam", () => {
      it("Should fail if the param name isn't camelCase", function () {
        expectHardhatError(
          () => taskDefinition.addParam("A"),
          ERRORS.TASK_DEFINITIONS.INVALID_PARAM_NAME_CASING
        );

        expectHardhatError(
          () => taskDefinition.addParam("Aa"),
          ERRORS.TASK_DEFINITIONS.INVALID_PARAM_NAME_CASING
        );

        expectHardhatError(
          () => taskDefinition.addParam("0"),
          ERRORS.TASK_DEFINITIONS.INVALID_PARAM_NAME_CASING
        );

        expectHardhatError(
          () => taskDefinition.addParam("0a"),
          ERRORS.TASK_DEFINITIONS.INVALID_PARAM_NAME_CASING
        );

        expectHardhatError(
          () => taskDefinition.addParam("a "),
          ERRORS.TASK_DEFINITIONS.INVALID_PARAM_NAME_CASING
        );

        expectHardhatError(
          () => taskDefinition.addParam("a-1"),
          ERRORS.TASK_DEFINITIONS.INVALID_PARAM_NAME_CASING
        );

        expectHardhatError(
          () => taskDefinition.addParam("a_"),
          ERRORS.TASK_DEFINITIONS.INVALID_PARAM_NAME_CASING
        );

        expectHardhatError(
          () => taskDefinition.addParam("a_b"),
          ERRORS.TASK_DEFINITIONS.INVALID_PARAM_NAME_CASING
        );
      });

      it("should add the param correctly", () => {
        taskDefinition.addParam("p", "desc", 123, types.int, true);
        assertParamDefinition(taskDefinition.paramDefinitions.p, {
          name: "p",
          description: "desc",
          defaultValue: 123,
          type: types.int,
          isOptional: true,
          isVariadic: false,
          isFlag: false,
        });
      });

      it("should set isOptional if a default value is provided", () => {
        taskDefinition.addParam("p", "desc", 123, types.int);
        assertParamDefinition(taskDefinition.paramDefinitions.p, {
          defaultValue: 123,
          isOptional: true,
        });
      });

      it("should accept an optional parm with undefined as default value", () => {
        taskDefinition.addParam("p", "desc", undefined, types.int, true);
        assertParamDefinition(taskDefinition.paramDefinitions.p, {
          defaultValue: undefined,
          isOptional: true,
        });
      });

      it("should use types.string as if non type is given", () => {
        taskDefinition.addParam("p");
        assert.equal(taskDefinition.paramDefinitions.p.type, types.string);
      });

      it("should throw if a non-string default value is given but its type isn't set", () => {
        expectHardhatError(
          () => taskDefinition.addParam("p", "desc", 123),
          ERRORS.TASK_DEFINITIONS.DEFAULT_VALUE_WRONG_TYPE
        );
      });

      it("should throw if a default value is set to a mandatory param", () => {
        expectHardhatError(
          () => taskDefinition.addParam("p", "desc", 123, types.int, false),
          ERRORS.TASK_DEFINITIONS.DEFAULT_IN_MANDATORY_PARAM
        );
      });
    });

    describe("addOptionalParam", () => {
      it("should set the param correctly", () => {
        taskDefinition.addOptionalParam("p", "desc", 123, types.int);
        assertParamDefinition(taskDefinition.paramDefinitions.p, {
          name: "p",
          description: "desc",
          defaultValue: 123,
          type: types.int,
          isOptional: true,
          isVariadic: false,
          isFlag: false,
        });
      });

      it("should work with undefined as default value", () => {
        taskDefinition.addOptionalParam("p", "desc", undefined);
        assertParamDefinition(taskDefinition.paramDefinitions.p, {
          defaultValue: undefined,
          isOptional: true,
        });
      });

      it("should use types.string as if non type is given", () => {
        taskDefinition.addOptionalParam("p");
        assert.equal(taskDefinition.paramDefinitions.p.type, types.string);
      });

      it("should throw if a non-string default value is given but its type isn't set", () => {
        expectHardhatError(
          () => taskDefinition.addOptionalParam("p", "desc", 123),
          ERRORS.TASK_DEFINITIONS.DEFAULT_VALUE_WRONG_TYPE
        );
      });
    });

    describe("addFlag", () => {
      it("should set an optional boolean param", () => {
        taskDefinition.addFlag("f", "d");

        assertParamDefinition(taskDefinition.paramDefinitions.f, {
          name: "f",
          description: "d",
          defaultValue: false,
          type: types.boolean,
          isOptional: true,
          isVariadic: false,
          isFlag: true,
        });
      });
    });

    describe("addPositionalParam", () => {
      it("shouldn't add the param definition to paramDefinitions", () => {
        taskDefinition.addPositionalParam("p", "desc");
        assert.isUndefined(taskDefinition.paramDefinitions.p);
      });

      it("should add the param definition to positionalParamDefinitions", () => {
        taskDefinition.addPositionalParam("p", "desc", 123, types.int, true);
        assertParamDefinition(getLastPositionalParam(taskDefinition), {
          name: "p",
          description: "desc",
          defaultValue: 123,
          type: types.int,
          isOptional: true,
          isVariadic: false,
          isFlag: false,
        });
      });

      it("should work with undefined as default value", () => {
        taskDefinition.addPositionalParam(
          "p",
          "desc",
          undefined,
          types.int,
          true
        );

        assertParamDefinition(getLastPositionalParam(taskDefinition), {
          defaultValue: undefined,
          isOptional: true,
        });
      });

      it("should use types.string as if non type is given", () => {
        taskDefinition.addPositionalParam("p", "desc");
        const last = getLastPositionalParam(taskDefinition);
        assert.equal(last.type, types.string);
      });

      it("should throw if a non-string default value is given but its type isn't set", () => {
        expectHardhatError(
          () => taskDefinition.addPositionalParam("p", "desc", 123),
          ERRORS.TASK_DEFINITIONS.DEFAULT_VALUE_WRONG_TYPE
        );
      });

      it("should throw if a default value is set to a mandatory param", () => {
        expectHardhatError(
          () =>
            taskDefinition.addPositionalParam(
              "p",
              "desc",
              123,
              types.int,
              false
            ),
          ERRORS.TASK_DEFINITIONS.DEFAULT_IN_MANDATORY_PARAM
        );
      });

      it("should set isOptional if default value is provided", () => {
        taskDefinition.addPositionalParam("p", "desc", "A");

        assertParamDefinition(getLastPositionalParam(taskDefinition), {
          defaultValue: "A",
          isOptional: true,
        });
      });
    });

    describe("addOptionalPositionalParam", () => {
      it("shouldn't add the param definition to paramDefinitions", () => {
        taskDefinition.addOptionalPositionalParam("p", "desc");
        assert.isUndefined(taskDefinition.paramDefinitions.p);
      });

      it("should add the param definition to positionalParamDefinitions", () => {
        taskDefinition.addOptionalPositionalParam("p", "desc", 123, types.int);
        assertParamDefinition(getLastPositionalParam(taskDefinition), {
          name: "p",
          description: "desc",
          defaultValue: 123,
          type: types.int,
          isOptional: true,
          isVariadic: false,
          isFlag: false,
        });
      });

      it("should work with undefined as default value", () => {
        taskDefinition.addOptionalPositionalParam(
          "p",
          "desc",
          undefined,
          types.int
        );

        assertParamDefinition(getLastPositionalParam(taskDefinition), {
          defaultValue: undefined,
          isOptional: true,
        });
      });

      it("should use types.string as if non type is given", () => {
        taskDefinition.addOptionalPositionalParam("p", "desc");
        const last = getLastPositionalParam(taskDefinition);
        assert.equal(last.type, types.string);
      });

      it("should throw if a non-string default value is given but its type isn't set", () => {
        expectHardhatError(
          () => taskDefinition.addOptionalPositionalParam("p", "desc", 123),
          ERRORS.TASK_DEFINITIONS.DEFAULT_VALUE_WRONG_TYPE
        );
      });
    });

    describe("addVariadicPositionalParam", () => {
      it("shouldn't add the param definition to paramDefinitions", () => {
        taskDefinition.addVariadicPositionalParam("p", "desc");
        assert.isUndefined(taskDefinition.paramDefinitions.p);
      });

      it("should add the param definition to positionalParamDefinitions", () => {
        taskDefinition.addVariadicPositionalParam(
          "p",
          "desc",
          [123],
          types.int,
          true
        );

        assertParamDefinition(getLastPositionalParam(taskDefinition), {
          name: "p",
          description: "desc",
          defaultValue: [123],
          type: types.int,
          isOptional: true,
          isVariadic: true,
          isFlag: false,
        });
      });

      it("should convert the default value into an array if necessary", () => {
        taskDefinition.addVariadicPositionalParam(
          "p",
          "desc",
          123,
          types.int,
          true
        );

        assertParamDefinition(getLastPositionalParam(taskDefinition), {
          defaultValue: [123],
          isVariadic: true,
        });
      });

      it("should work with undefined as default value", () => {
        taskDefinition.addVariadicPositionalParam(
          "p",
          "desc",
          undefined,
          types.int,
          true
        );

        assertParamDefinition(getLastPositionalParam(taskDefinition), {
          defaultValue: undefined,
          isOptional: true,
          isVariadic: true,
        });
      });

      it("should use types.string as if non type is given", () => {
        taskDefinition.addVariadicPositionalParam("p", "desc");
        const last = getLastPositionalParam(taskDefinition);
        assert.equal(last.type, types.string);
      });

      it("should throw if a non-string default value is given but its type isn't set", () => {
        expectHardhatError(
          () => taskDefinition.addVariadicPositionalParam("p", "desc", 123),
          ERRORS.TASK_DEFINITIONS.DEFAULT_VALUE_WRONG_TYPE
        );

        expectHardhatError(
          () => taskDefinition.addVariadicPositionalParam("p", "desc", [123]),
          ERRORS.TASK_DEFINITIONS.DEFAULT_VALUE_WRONG_TYPE
        );
      });

      it("should throw if a default value is set to a mandatory param", () => {
        expectHardhatError(
          () =>
            taskDefinition.addVariadicPositionalParam(
              "p",
              "desc",
              123,
              types.int,
              false
            ),
          ERRORS.TASK_DEFINITIONS.DEFAULT_IN_MANDATORY_PARAM
        );

        expectHardhatError(
          () =>
            taskDefinition.addVariadicPositionalParam(
              "p",
              "desc",
              [123],
              types.int,
              false
            ),
          ERRORS.TASK_DEFINITIONS.DEFAULT_IN_MANDATORY_PARAM
        );
      });

      it("should set isOptional if default value is provided", () => {
        taskDefinition.addVariadicPositionalParam("p", "desc", "A");

        assertParamDefinition(getLastPositionalParam(taskDefinition), {
          defaultValue: ["A"],
          isOptional: true,
          isVariadic: true,
        });
      });
    });

    describe("addOptionalVariadicPositionalParam", () => {
      it("shouldn't add the param definition to paramDefinitions", () => {
        taskDefinition.addOptionalVariadicPositionalParam("p", "desc");
        assert.isUndefined(taskDefinition.paramDefinitions.p);
      });

      it("should add the param definition to positionalParamDefinitions", () => {
        taskDefinition.addOptionalVariadicPositionalParam(
          "p",
          "desc",
          [123],
          types.int
        );

        assertParamDefinition(getLastPositionalParam(taskDefinition), {
          name: "p",
          description: "desc",
          defaultValue: [123],
          type: types.int,
          isOptional: true,
          isVariadic: true,
          isFlag: false,
        });
      });

      it("should convert the default value into an array if necessary", () => {
        taskDefinition.addOptionalVariadicPositionalParam(
          "p",
          "desc",
          123,
          types.int
        );

        assertParamDefinition(getLastPositionalParam(taskDefinition), {
          defaultValue: [123],
          isVariadic: true,
        });
      });

      it("should work with undefined as default value", () => {
        taskDefinition.addOptionalVariadicPositionalParam(
          "p",
          "desc",
          undefined,
          types.int
        );

        assertParamDefinition(getLastPositionalParam(taskDefinition), {
          defaultValue: undefined,
          isOptional: true,
          isVariadic: true,
        });
      });

      it("should use types.string as if non type is given", () => {
        taskDefinition.addOptionalVariadicPositionalParam("p", "desc");
        const last = getLastPositionalParam(taskDefinition);
        assert.equal(last.type, types.string);
      });

      it("should throw if a non-string default value is given but its type isn't set", () => {
        expectHardhatError(
          () =>
            taskDefinition.addOptionalVariadicPositionalParam("p", "desc", 123),
          ERRORS.TASK_DEFINITIONS.DEFAULT_VALUE_WRONG_TYPE
        );

        expectHardhatError(
          () =>
            taskDefinition.addOptionalVariadicPositionalParam("p", "desc", [
              123,
            ]),
          ERRORS.TASK_DEFINITIONS.DEFAULT_VALUE_WRONG_TYPE
        );
      });
    });

    describe("CLI argument types", () => {
      describe("tasks", () => {
        let task: SimpleTaskDefinition;
        beforeEach(() => {
          task = new SimpleTaskDefinition("t", false);
        });

        describe("When using non-cli argument types", () => {
          it("Should throw on addParam", () => {
            expectHardhatError(
              () => task.addParam("p", "p", undefined, types.any),
              ERRORS.TASK_DEFINITIONS.CLI_ARGUMENT_TYPE_REQUIRED
            );
          });

          it("Should  throw on addOptionalParam", () => {
            expectHardhatError(
              () => task.addOptionalParam("p", "p", "asd", types.any),
              ERRORS.TASK_DEFINITIONS.CLI_ARGUMENT_TYPE_REQUIRED
            );
          });

          it("Should  throw on addPositionalParam", () => {
            expectHardhatError(
              () => task.addPositionalParam("p", "p", undefined, types.any),
              ERRORS.TASK_DEFINITIONS.CLI_ARGUMENT_TYPE_REQUIRED
            );
          });

          it("Should  throw on addOptionalPositionalParam", () => {
            expectHardhatError(
              () => task.addOptionalPositionalParam("p", "p", "asd", types.any),
              ERRORS.TASK_DEFINITIONS.CLI_ARGUMENT_TYPE_REQUIRED
            );
          });

          it("Should  throw on addVariadicPositionalParam", () => {
            expectHardhatError(
              () =>
                task.addVariadicPositionalParam("p", "p", undefined, types.any),
              ERRORS.TASK_DEFINITIONS.CLI_ARGUMENT_TYPE_REQUIRED
            );
          });

          it("Should  throw on addVariadicPositionalParam", () => {
            expectHardhatError(
              () =>
                task.addOptionalVariadicPositionalParam(
                  "p",
                  "p",
                  "asd",
                  types.any
                ),
              ERRORS.TASK_DEFINITIONS.CLI_ARGUMENT_TYPE_REQUIRED
            );
          });
        });
      });

      describe("subtasks", () => {
        describe("When using non-cli argument types", () => {
          let task: SimpleTaskDefinition;
          beforeEach(() => {
            task = new SimpleTaskDefinition("t", true);
          });

          it("Should not throw on addParam", () => {
            task.addParam("p", "p", undefined, types.any);
            assert.isDefined(task.paramDefinitions.p);
          });

          it("Should not throw on addOptionalParam", () => {
            task.addOptionalParam("p", "p", "asd", types.any);
            assert.isDefined(task.paramDefinitions.p);
          });

          it("Should not throw on addPositionalParam", () => {
            task.addPositionalParam("p", "p", undefined, types.any);
            assert.lengthOf(task.positionalParamDefinitions, 1);
          });

          it("Should not throw on addOptionalPositionalParam", () => {
            task.addOptionalPositionalParam("p", "p", "asd", types.any);
            assert.lengthOf(task.positionalParamDefinitions, 1);
          });

          it("Should not throw on addVariadicPositionalParam", () => {
            task.addVariadicPositionalParam("p", "p", undefined, types.any);
            assert.lengthOf(task.positionalParamDefinitions, 1);
          });

          it("Should not throw on addVariadicPositionalParam", () => {
            task.addOptionalVariadicPositionalParam("p", "p", "asd", types.any);
            assert.lengthOf(task.positionalParamDefinitions, 1);
          });
        });
      });
    });
  });
});

describe("OverriddenTaskDefinition", () => {
  let parentTask: SimpleTaskDefinition;
  let overriddenTask: OverriddenTaskDefinition;

  beforeEach("init tasks", () => {
    parentTask = new SimpleTaskDefinition("t")
      .addParam("p", "desc")
      .addFlag("f")
      .addPositionalParam("pp", "positional param");

    overriddenTask = new OverriddenTaskDefinition(parentTask, true);
  });

  describe("construction", () => {
    it("should have the right name", () => {
      assert.equal(overriddenTask.name, "t");
    });

    it("should set isSubtask", () => {
      assert.isTrue(overriddenTask.isSubtask);
    });

    it("should set the parent task", () => {
      assert.equal(overriddenTask.parentTaskDefinition, parentTask);
    });
  });

  describe("inherited properties", () => {
    it("should return the parent's name", () => {
      assert.equal(overriddenTask.name, parentTask.name);
    });

    it("should return the parent's action", () => {
      assert.equal(overriddenTask.action, parentTask.action);
    });

    it("should return the parent's description", () => {
      assert.equal(overriddenTask.description, parentTask.description);
    });

    it("should return the parent's param definitions", () => {
      assert.equal(
        overriddenTask.paramDefinitions,
        parentTask.paramDefinitions
      );
    });

    it("should return the parent's positional param definitions", () => {
      assert.equal(
        overriddenTask.positionalParamDefinitions,
        parentTask.positionalParamDefinitions
      );
    });

    it("should work with more than one level of chaining", () => {
      const overriddenAgain = new OverriddenTaskDefinition(
        overriddenTask,
        false
      );
      assert.equal(overriddenAgain.isSubtask, false);
      assert.equal(overriddenAgain.name, parentTask.name);
      assert.equal(overriddenAgain.action, parentTask.action);
      assert.equal(overriddenAgain.description, parentTask.description);
      assert.equal(
        overriddenAgain.paramDefinitions,
        parentTask.paramDefinitions
      );
      assert.equal(
        overriddenAgain.positionalParamDefinitions,
        parentTask.positionalParamDefinitions
      );
    });

    it("should return overridden actions", () => {
      assert.equal(overriddenTask.action, parentTask.action);

      const action2 = async () => 1;
      overriddenTask.setAction(action2);

      assert.equal(overriddenTask.action, action2);

      const action3 = async () => 1;
      overriddenTask.setAction(action3);

      assert.equal(overriddenTask.action, action3);

      const overriddenAgain = new OverriddenTaskDefinition(overriddenTask);
      assert.equal(overriddenAgain.action, action3);

      const action4 = async () => 1;
      overriddenAgain.setAction(action4);

      assert.equal(overriddenTask.action, action3);
      assert.equal(overriddenAgain.action, action4);
    });

    it("should return overridden descriptions", () => {
      assert.equal(overriddenTask.description, parentTask.description);

      overriddenTask.setDescription("d2");
      assert.equal(overriddenTask.description, "d2");

      overriddenTask.setDescription("d3");
      assert.equal(overriddenTask.description, "d3");

      const overriddenAgain = new OverriddenTaskDefinition(overriddenTask);
      assert.equal(overriddenTask.description, "d3");

      overriddenAgain.setDescription("d4");
      assert.equal(overriddenTask.description, "d3");
      assert.equal(overriddenAgain.description, "d4");
    });
  });

  describe("Param definitions can be added only in compatible cases", () => {
    it("should add a flag param if addFlag is called", () => {
      overriddenTask.addFlag("flagParam", "flag in overriden task");
      assertParamDefinition(overriddenTask.paramDefinitions.flagParam, {
        name: "flagParam",
        description: "flag in overriden task",
        defaultValue: false,
        type: types.boolean,
        isOptional: true,
        isVariadic: false,
        isFlag: true,
      });
    });

    it("should throw if adding a param of same name that was already defined in parent task", () => {
      const definedParamName = "f";
      // a param definition in an overridenTask is present in the parentTask ref as well
      assert.isDefined(overriddenTask.paramDefinitions[definedParamName]);
      assert.isDefined(parentTask.paramDefinitions[definedParamName]);

      // expect PARAM_ALREADY_DEFINED for add flag param
      expectHardhatError(
        () => overriddenTask.addFlag(definedParamName),
        ERRORS.TASK_DEFINITIONS.PARAM_ALREADY_DEFINED
      );

      // expect PARAM_ALREADY_DEFINED for add optional param using addParam method
      expectHardhatError(
        () =>
          overriddenTask.addParam(
            definedParamName,
            undefined,
            undefined,
            undefined,
            true
          ),
        ERRORS.TASK_DEFINITIONS.PARAM_ALREADY_DEFINED
      );

      // expect PARAM_ALREADY_DEFINED for add optional param using addParam method
      expectHardhatError(
        () =>
          overriddenTask.addOptionalParam(
            definedParamName,
            undefined,
            undefined,
            undefined
          ),
        ERRORS.TASK_DEFINITIONS.PARAM_ALREADY_DEFINED
      );
    });

    it("should throw if addParam is called with isOptional = false", () => {
      expectHardhatError(
        () => overriddenTask.addParam("p"),
        ERRORS.TASK_DEFINITIONS.OVERRIDE_NO_MANDATORY_PARAMS
      );
    });

    it("should add an optional param if addParam is called with isOptional = true", () => {
      const optParamName = "optParam";
      assert.isUndefined(overriddenTask.paramDefinitions[optParamName], "");

      overriddenTask.addParam(
        optParamName,
        undefined,
        undefined,
        undefined,
        true
      );

      assert.isDefined(overriddenTask.paramDefinitions[optParamName]);
    });

    it("should add an optional param if addOptionalParam is called", () => {
      const optParamName = "optParam";
      assert.isUndefined(overriddenTask.paramDefinitions[optParamName], "");
      overriddenTask.addOptionalParam(optParamName);
      assert.isDefined(overriddenTask.paramDefinitions[optParamName]);
    });

    it("should throw if addPositionalParam is called", () => {
      expectHardhatError(
        () => overriddenTask.addPositionalParam("p"),
        ERRORS.TASK_DEFINITIONS.OVERRIDE_NO_POSITIONAL_PARAMS
      );
    });

    it("should throw if addOptionalPositionalParam is called", () => {
      expectHardhatError(
        () => overriddenTask.addOptionalPositionalParam("p"),
        ERRORS.TASK_DEFINITIONS.OVERRIDE_NO_POSITIONAL_PARAMS
      );
    });

    it("should throw if addVariadicPositionalParam is called", () => {
      expectHardhatError(
        () => overriddenTask.addVariadicPositionalParam("p"),
        ERRORS.TASK_DEFINITIONS.OVERRIDE_NO_VARIADIC_PARAMS
      );
    });

    it("should throw if addOptionalVariadicPositionalParam is called", () => {
      expectHardhatError(
        () => overriddenTask.addOptionalVariadicPositionalParam("p"),
        ERRORS.TASK_DEFINITIONS.OVERRIDE_NO_VARIADIC_PARAMS
      );
    });
  });
});

describe("SimpleScopeDefinition", () => {
  it("should create a scope definition without a description", async function () {
    const scopeDefinition = new SimpleScopeDefinition(
      "scope",
      undefined,
      (() => {}) as any,
      (() => {}) as any
    );

    assert.equal(scopeDefinition.name, "scope");
    assert.isUndefined(scopeDefinition.description);
  });

  it("should create a scope definition with a description", async function () {
    const scopeDefinition = new SimpleScopeDefinition(
      "scope",
      "a description",
      (() => {}) as any,
      (() => {}) as any
    );

    assert.equal(scopeDefinition.name, "scope");
    assert.equal(scopeDefinition.description, "a description");
  });

  it("should change the description with setDescription", async function () {
    const scopeDefinition = new SimpleScopeDefinition(
      "scope",
      "a description",
      (() => {}) as any,
      (() => {}) as any
    );

    assert.equal(scopeDefinition.name, "scope");
    assert.equal(scopeDefinition.description, "a description");

    scopeDefinition.setDescription("another description");

    assert.equal(scopeDefinition.description, "another description");
  });

  it("should call the right callbacks", async function () {
    const addTask = sinon.spy();
    const addSubtask = sinon.spy();

    const scopeDefinition = new SimpleScopeDefinition(
      "scope",
      "a description",
      addTask,
      addSubtask
    );

    assert.isFalse(addTask.called);
    assert.isFalse(addSubtask.called);

    const taskAction: any = () => {};
    scopeDefinition.task("task", taskAction);

    assert.isTrue(addTask.calledOnce);
    assert.isFalse(addSubtask.called);

    const subtaskAction: any = () => {};
    scopeDefinition.subtask("subtask", subtaskAction);

    assert.isTrue(addTask.calledOnce);
    assert.isTrue(addSubtask.calledOnce);
  });
});
