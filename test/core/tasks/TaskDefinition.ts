import {
  ITaskDefinition,
  OverloadedTaskDefinition,
  ParamDefinition,
  TaskDefinition
} from "../../../src/core/tasks/TaskDefinition";
import { assert } from "chai";
import { ERRORS } from "../../../src/core/errors";
import { expectBuidlerError } from "../../helpers/errors";
import { BuidlerArguments } from "../../../src/core/params/buidler-params";
import * as types from "../../../src/core/argumentTypes";
import { unsafeObjectKeys } from "../../../src/util/unsafe";

function expectThrowParamAlreadyDefinedError(f: () => any) {
  expectBuidlerError(f, ERRORS.TASKS_DEFINITION_PARAM_ALREADY_DEFINED);
}

function getLastPositionalParam(taskDefinition: ITaskDefinition) {
  assert.isNotEmpty(taskDefinition.positionalParamDefinitions);
  return taskDefinition.positionalParamDefinitions[
    taskDefinition.positionalParamDefinitions.length - 1
  ];
}

function assertParamDefintion(
  actual: ParamDefinition<any>,
  expected: Partial<ParamDefinition<any>>
) {
  for (const key of unsafeObjectKeys(actual)) {
    if (expected[key] !== undefined) {
      assert.deepEqual(actual[key], expected[key]);
    }
  }
}

describe("TaskDefinition", () => {
  describe("construction", () => {
    let taskDefinition: TaskDefinition;

    before("init taskDefinition", () => {
      taskDefinition = new TaskDefinition("name", true);
    });

    it("gets the right name", () => {
      assert.equal(taskDefinition.name, "name");
    });

    it("gets the right isInternal flag", () => {
      assert.isTrue(taskDefinition.isInternal);
    });

    it("starts without any param defined", () => {
      assert.deepEqual(taskDefinition.paramDefinitions, {});
      assert.isEmpty(taskDefinition.positionalParamDefinitions);
    });

    it("starts without any description", () => {
      assert.isUndefined(taskDefinition.description);
    });

    it("starts with an action that throws", () => {
      expectBuidlerError(
        () => taskDefinition.action({}, {} as any, async () => {}),
        ERRORS.TASKS_DEFINITION_NO_ACTION
      );
    });
  });

  describe("setDescription", () => {
    it("Should change the description", () => {
      const taskDefinition = new TaskDefinition("name");
      assert.isUndefined(taskDefinition.description);

      taskDefinition.setDescription("A");
      assert.equal(taskDefinition.description, "A");

      taskDefinition.setDescription("B");
      assert.equal(taskDefinition.description, "B");
    });
  });

  describe("setAction", () => {
    it("Should change the action", async () => {
      const taskDefinition = new TaskDefinition("name");

      taskDefinition.setAction(async () => 1);
      let result = await taskDefinition.action({}, {} as any, async () => {});
      assert.equal(result, 1);

      const obj = {};
      taskDefinition.setAction(async () => obj);
      result = await taskDefinition.action({}, {} as any, async () => {});
      assert.equal(result, obj);
    });
  });

  describe("param definition rules", () => {
    let taskDefinition: TaskDefinition;

    beforeEach("init taskDefinition", () => {
      taskDefinition = new TaskDefinition("name", true);
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

    describe("param name clashes with Buidler's ones", () => {
      function testClashWith(name: string) {
        expectBuidlerError(
          () => taskDefinition.addParam(name),
          ERRORS.TASKS_DEFINITION_PARAM_CLASHES_WITH_GLOBAL
        );
        expectBuidlerError(
          () => taskDefinition.addOptionalParam(name),
          ERRORS.TASKS_DEFINITION_PARAM_CLASHES_WITH_GLOBAL
        );
        expectBuidlerError(
          () => taskDefinition.addFlag(name),
          ERRORS.TASKS_DEFINITION_PARAM_CLASHES_WITH_GLOBAL
        );
        expectBuidlerError(
          () => taskDefinition.addPositionalParam(name),
          ERRORS.TASKS_DEFINITION_PARAM_CLASHES_WITH_GLOBAL
        );
        expectBuidlerError(
          () => taskDefinition.addOptionalPositionalParam(name),
          ERRORS.TASKS_DEFINITION_PARAM_CLASHES_WITH_GLOBAL
        );
        expectBuidlerError(
          () => taskDefinition.addVariadicPositionalParam(name),
          ERRORS.TASKS_DEFINITION_PARAM_CLASHES_WITH_GLOBAL
        );
        expectBuidlerError(
          () => taskDefinition.addOptionalVariadicPositionalParam(name),
          ERRORS.TASKS_DEFINITION_PARAM_CLASHES_WITH_GLOBAL
        );
      }

      it("Should throw if a param clashes", () => {
        // This is constructed to force a type error here if a Buidler arg is
        // added and not tested.
        const buidlerArgs: BuidlerArguments = {
          showStackTraces: true,
          network: "",
          version: false,
          emoji: false,
          help: false
        };

        Object.keys(buidlerArgs).forEach(name => testClashWith(name));
      });
    });

    describe("positional param rules", () => {
      describe("no mandatory positional param after an optional one", () => {
        beforeEach("add optional positional", () => {
          taskDefinition.addOptionalPositionalParam("asd");
        });

        it("throws when trying to add a new positional param", () => {
          expectBuidlerError(
            () => taskDefinition.addPositionalParam("asd2"),
            ERRORS.TASKS_DEFINITION_MANDATORY_PARAM_AFTER_OPTIONAL
          );
        });

        it("throws when trying to add a new variadic positional param", () => {
          expectBuidlerError(
            () => taskDefinition.addVariadicPositionalParam("asd2"),
            ERRORS.TASKS_DEFINITION_MANDATORY_PARAM_AFTER_OPTIONAL
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
          expectBuidlerError(
            () => taskDefinition.addPositionalParam("p"),
            ERRORS.TASKS_DEFINITION_PARAM_AFTER_VARIADIC
          );
        });

        it("should throw on adding an optional positional param", () => {
          expectBuidlerError(
            () => taskDefinition.addOptionalPositionalParam("p"),
            ERRORS.TASKS_DEFINITION_PARAM_AFTER_VARIADIC
          );
        });

        it("should throw on adding another variadic param", () => {
          expectBuidlerError(
            () => taskDefinition.addVariadicPositionalParam("p"),
            ERRORS.TASKS_DEFINITION_PARAM_AFTER_VARIADIC
          );
        });

        it("should throw on adding an optional variadic param", () => {
          expectBuidlerError(
            () => taskDefinition.addOptionalVariadicPositionalParam("p"),
            ERRORS.TASKS_DEFINITION_PARAM_AFTER_VARIADIC
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
    let taskDefinition: TaskDefinition;

    beforeEach("init taskDefinition", () => {
      taskDefinition = new TaskDefinition("name", true);
    });

    describe("addParam", () => {
      it("should add the param correctly", () => {
        taskDefinition.addParam("p", "desc", 123, types.int, true);
        assertParamDefintion(taskDefinition.paramDefinitions.p, {
          name: "p",
          description: "desc",
          defaultValue: 123,
          type: types.int,
          isOptional: true,
          isVariadic: false,
          isFlag: false
        });
      });

      it("should set isOptional if a default value is provided", () => {
        taskDefinition.addParam("p", "desc", 123, types.int);
        assertParamDefintion(taskDefinition.paramDefinitions.p, {
          defaultValue: 123,
          isOptional: true
        });
      });

      it("should accept an optional parm with undefined as default vlaue", () => {
        taskDefinition.addParam("p", "desc", undefined, types.int, true);
        assertParamDefintion(taskDefinition.paramDefinitions.p, {
          defaultValue: undefined,
          isOptional: true
        });
      });

      it("should use types.string as if non type is given", () => {
        taskDefinition.addParam("p");
        assert.equal(taskDefinition.paramDefinitions.p.type, types.string);
      });

      it("should throw if a non-string default value is given but its type isn't set", () => {
        expectBuidlerError(
          () => taskDefinition.addParam("p", "desc", 123),
          ERRORS.TASKS_DEFINITION_DEFAULT_VALUE_WRONG_TYPE
        );
      });

      it("should throw if a default value is set to a mandatory param", () => {
        expectBuidlerError(
          () => taskDefinition.addParam("p", "desc", 123, types.int, false),
          ERRORS.TASKS_DEFINITION_DEFAULT_IN_MANDATORY_PARAM
        );
      });
    });

    describe("addOptionalParam", () => {
      it("should set the param correctly", () => {
        taskDefinition.addOptionalParam("p", "desc", 123, types.int);
        assertParamDefintion(taskDefinition.paramDefinitions.p, {
          name: "p",
          description: "desc",
          defaultValue: 123,
          type: types.int,
          isOptional: true,
          isVariadic: false,
          isFlag: false
        });
      });

      it("should work with undefined as default value", () => {
        taskDefinition.addOptionalParam("p", "desc", undefined);
        assertParamDefintion(taskDefinition.paramDefinitions.p, {
          defaultValue: undefined,
          isOptional: true
        });
      });

      it("should use types.string as if non type is given", () => {
        taskDefinition.addOptionalParam("p");
        assert.equal(taskDefinition.paramDefinitions.p.type, types.string);
      });

      it("should throw if a non-string default value is given but its type isn't set", () => {
        expectBuidlerError(
          () => taskDefinition.addOptionalParam("p", "desc", 123),
          ERRORS.TASKS_DEFINITION_DEFAULT_VALUE_WRONG_TYPE
        );
      });
    });

    describe("addFlag", () => {
      it("should set an optional boolean param", () => {
        taskDefinition.addFlag("f", "d");

        assertParamDefintion(taskDefinition.paramDefinitions.f, {
          name: "f",
          description: "d",
          defaultValue: false,
          type: types.boolean,
          isOptional: true,
          isVariadic: false,
          isFlag: true
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
        assertParamDefintion(getLastPositionalParam(taskDefinition), {
          name: "p",
          description: "desc",
          defaultValue: 123,
          type: types.int,
          isOptional: true,
          isVariadic: false,
          isFlag: false
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

        assertParamDefintion(getLastPositionalParam(taskDefinition), {
          defaultValue: undefined,
          isOptional: true
        });
      });

      it("should use types.string as if non type is given", () => {
        taskDefinition.addPositionalParam("p", "desc");
        const last = getLastPositionalParam(taskDefinition);
        assert.equal(last.type, types.string);
      });

      it("should throw if a non-string default value is given but its type isn't set", () => {
        expectBuidlerError(
          () => taskDefinition.addPositionalParam("p", "desc", 123),
          ERRORS.TASKS_DEFINITION_DEFAULT_VALUE_WRONG_TYPE
        );
      });

      it("should throw if a default value is set to a mandatory param", () => {
        expectBuidlerError(
          () =>
            taskDefinition.addPositionalParam(
              "p",
              "desc",
              123,
              types.int,
              false
            ),
          ERRORS.TASKS_DEFINITION_DEFAULT_IN_MANDATORY_PARAM
        );
      });

      it("should set isOptional if default value is provided", () => {
        taskDefinition.addPositionalParam("p", "desc", "A");

        assertParamDefintion(getLastPositionalParam(taskDefinition), {
          defaultValue: "A",
          isOptional: true
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
        assertParamDefintion(getLastPositionalParam(taskDefinition), {
          name: "p",
          description: "desc",
          defaultValue: 123,
          type: types.int,
          isOptional: true,
          isVariadic: false,
          isFlag: false
        });
      });

      it("should work with undefined as default value", () => {
        taskDefinition.addOptionalPositionalParam(
          "p",
          "desc",
          undefined,
          types.int
        );

        assertParamDefintion(getLastPositionalParam(taskDefinition), {
          defaultValue: undefined,
          isOptional: true
        });
      });

      it("should use types.string as if non type is given", () => {
        taskDefinition.addOptionalPositionalParam("p", "desc");
        const last = getLastPositionalParam(taskDefinition);
        assert.equal(last.type, types.string);
      });

      it("should throw if a non-string default value is given but its type isn't set", () => {
        expectBuidlerError(
          () => taskDefinition.addOptionalPositionalParam("p", "desc", 123),
          ERRORS.TASKS_DEFINITION_DEFAULT_VALUE_WRONG_TYPE
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

        assertParamDefintion(getLastPositionalParam(taskDefinition), {
          name: "p",
          description: "desc",
          defaultValue: [123],
          type: types.int,
          isOptional: true,
          isVariadic: true,
          isFlag: false
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

        assertParamDefintion(getLastPositionalParam(taskDefinition), {
          defaultValue: [123],
          isVariadic: true
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

        assertParamDefintion(getLastPositionalParam(taskDefinition), {
          defaultValue: undefined,
          isOptional: true,
          isVariadic: true
        });
      });

      it("should use types.string as if non type is given", () => {
        taskDefinition.addVariadicPositionalParam("p", "desc");
        const last = getLastPositionalParam(taskDefinition);
        assert.equal(last.type, types.string);
      });

      it("should throw if a non-string default value is given but its type isn't set", () => {
        expectBuidlerError(
          () => taskDefinition.addVariadicPositionalParam("p", "desc", 123),
          ERRORS.TASKS_DEFINITION_DEFAULT_VALUE_WRONG_TYPE
        );

        expectBuidlerError(
          () => taskDefinition.addVariadicPositionalParam("p", "desc", [123]),
          ERRORS.TASKS_DEFINITION_DEFAULT_VALUE_WRONG_TYPE
        );
      });

      it("should throw if a default value is set to a mandatory param", () => {
        expectBuidlerError(
          () =>
            taskDefinition.addVariadicPositionalParam(
              "p",
              "desc",
              123,
              types.int,
              false
            ),
          ERRORS.TASKS_DEFINITION_DEFAULT_IN_MANDATORY_PARAM
        );

        expectBuidlerError(
          () =>
            taskDefinition.addVariadicPositionalParam(
              "p",
              "desc",
              [123],
              types.int,
              false
            ),
          ERRORS.TASKS_DEFINITION_DEFAULT_IN_MANDATORY_PARAM
        );
      });

      it("should set isOptional if default value is provided", () => {
        taskDefinition.addVariadicPositionalParam("p", "desc", "A");

        assertParamDefintion(getLastPositionalParam(taskDefinition), {
          defaultValue: ["A"],
          isOptional: true,
          isVariadic: true
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

        assertParamDefintion(getLastPositionalParam(taskDefinition), {
          name: "p",
          description: "desc",
          defaultValue: [123],
          type: types.int,
          isOptional: true,
          isVariadic: true,
          isFlag: false
        });
      });

      it("should convert the default value into an array if necessary", () => {
        taskDefinition.addOptionalVariadicPositionalParam(
          "p",
          "desc",
          123,
          types.int
        );

        assertParamDefintion(getLastPositionalParam(taskDefinition), {
          defaultValue: [123],
          isVariadic: true
        });
      });

      it("should work with undefined as default value", () => {
        taskDefinition.addOptionalVariadicPositionalParam(
          "p",
          "desc",
          undefined,
          types.int
        );

        assertParamDefintion(getLastPositionalParam(taskDefinition), {
          defaultValue: undefined,
          isOptional: true,
          isVariadic: true
        });
      });

      it("should use types.string as if non type is given", () => {
        taskDefinition.addOptionalVariadicPositionalParam("p", "desc");
        const last = getLastPositionalParam(taskDefinition);
        assert.equal(last.type, types.string);
      });

      it("should throw if a non-string default value is given but its type isn't set", () => {
        expectBuidlerError(
          () =>
            taskDefinition.addOptionalVariadicPositionalParam("p", "desc", 123),
          ERRORS.TASKS_DEFINITION_DEFAULT_VALUE_WRONG_TYPE
        );

        expectBuidlerError(
          () =>
            taskDefinition.addOptionalVariadicPositionalParam("p", "desc", [
              123
            ]),
          ERRORS.TASKS_DEFINITION_DEFAULT_VALUE_WRONG_TYPE
        );
      });
    });
  });
});

describe("OverloadedTaskDefinition", () => {
  let parentTask: TaskDefinition;
  let overloadedTask: OverloadedTaskDefinition;

  beforeEach("init tasks", () => {
    parentTask = new TaskDefinition("t")
      .addParam("p", "desc")
      .addFlag("f")
      .addPositionalParam("pp", "positional param");

    overloadedTask = new OverloadedTaskDefinition(parentTask, true);
  });

  describe("construction", () => {
    it("should have the right name", () => {
      assert.equal(overloadedTask.name, "t");
    });

    it("should set isInternal", () => {
      assert.isTrue(overloadedTask.isInternal);
    });

    it("should set the parent task", () => {
      assert.equal(overloadedTask.parentTaskDefinition, parentTask);
    });
  });

  describe("inherited properties", () => {
    it("should return the parent's name", () => {
      assert.equal(overloadedTask.name, parentTask.name);
    });

    it("should return the parent's action", () => {
      assert.equal(overloadedTask.action, parentTask.action);
    });

    it("should return the parent's description", () => {
      assert.equal(overloadedTask.description, parentTask.description);
    });

    it("should return the parent's param definitions", () => {
      assert.equal(
        overloadedTask.paramDefinitions,
        parentTask.paramDefinitions
      );
    });

    it("should return the parent's positional param definitions", () => {
      assert.equal(
        overloadedTask.positionalParamDefinitions,
        parentTask.positionalParamDefinitions
      );
    });

    it("should work with more than one level of chaining", () => {
      const overloadedAgain = new OverloadedTaskDefinition(
        overloadedTask,
        false
      );
      assert.equal(overloadedAgain.isInternal, false);
      assert.equal(overloadedAgain.name, parentTask.name);
      assert.equal(overloadedAgain.action, parentTask.action);
      assert.equal(overloadedAgain.description, parentTask.description);
      assert.equal(
        overloadedAgain.paramDefinitions,
        parentTask.paramDefinitions
      );
      assert.equal(
        overloadedAgain.positionalParamDefinitions,
        parentTask.positionalParamDefinitions
      );
    });

    it("should return overridden actions", () => {
      assert.equal(overloadedTask.action, parentTask.action);

      const action2 = async () => 1;
      overloadedTask.setAction(action2);

      assert.equal(overloadedTask.action, action2);

      const action3 = async () => 1;
      overloadedTask.setAction(action3);

      assert.equal(overloadedTask.action, action3);

      const overloadedAgain = new OverloadedTaskDefinition(overloadedTask);
      assert.equal(overloadedAgain.action, action3);

      const action4 = async () => 1;
      overloadedAgain.setAction(action4);

      assert.equal(overloadedTask.action, action3);
      assert.equal(overloadedAgain.action, action4);
    });

    it("should return overridden descriptions", () => {
      assert.equal(overloadedTask.description, parentTask.description);

      overloadedTask.setDescription("d2");
      assert.equal(overloadedTask.description, "d2");

      overloadedTask.setDescription("d3");
      assert.equal(overloadedTask.description, "d3");

      const overloadedAgain = new OverloadedTaskDefinition(overloadedTask);
      assert.equal(overloadedTask.description, "d3");

      overloadedAgain.setDescription("d4");
      assert.equal(overloadedTask.description, "d3");
      assert.equal(overloadedAgain.description, "d4");
    });
  });

  describe("Param definitions are forbidden", () => {
    it("should throw if addParam is called", () => {
      expectBuidlerError(
        () => overloadedTask.addParam("p"),
        ERRORS.TASKS_DEFINITION_OVERLOAD_NO_PARAMS
      );
    });

    it("should throw if addOptionalParam is called", () => {
      expectBuidlerError(
        () => overloadedTask.addOptionalParam("p"),
        ERRORS.TASKS_DEFINITION_OVERLOAD_NO_PARAMS
      );
    });

    it("should throw if addFlag is called", () => {
      expectBuidlerError(
        () => overloadedTask.addFlag("p"),
        ERRORS.TASKS_DEFINITION_OVERLOAD_NO_PARAMS
      );
    });

    it("should throw if addPositionalParam is called", () => {
      expectBuidlerError(
        () => overloadedTask.addPositionalParam("p"),
        ERRORS.TASKS_DEFINITION_OVERLOAD_NO_PARAMS
      );
    });

    it("should throw if addOptionalPositionalParam is called", () => {
      expectBuidlerError(
        () => overloadedTask.addOptionalPositionalParam("p"),
        ERRORS.TASKS_DEFINITION_OVERLOAD_NO_PARAMS
      );
    });

    it("should throw if addVariadicPositionalParam is called", () => {
      expectBuidlerError(
        () => overloadedTask.addVariadicPositionalParam("p"),
        ERRORS.TASKS_DEFINITION_OVERLOAD_NO_PARAMS
      );
    });

    it("should throw if addOptionalVariadicPositionalParam is called", () => {
      expectBuidlerError(
        () => overloadedTask.addOptionalVariadicPositionalParam("p"),
        ERRORS.TASKS_DEFINITION_OVERLOAD_NO_PARAMS
      );
    });
  });
});
