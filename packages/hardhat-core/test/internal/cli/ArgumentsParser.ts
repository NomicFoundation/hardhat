/* eslint-disable dot-notation,@typescript-eslint/dot-notation */ // TODO this is for unit testing priv methods. We shouldn't test these at all?
import { assert } from "chai";

import { ArgumentsParser } from "../../../src/internal/cli/ArgumentsParser";
import { ERRORS } from "../../../src/internal/core/errors-list";
import {
  boolean,
  int,
  string,
} from "../../../src/internal/core/params/argumentTypes";
import { HARDHAT_PARAM_DEFINITIONS } from "../../../src/internal/core/params/hardhat-params";
import {
  OverriddenTaskDefinition,
  SimpleTaskDefinition,
} from "../../../src/internal/core/tasks/task-definitions";
import {
  HardhatArguments,
  TaskArguments,
  TaskDefinition,
} from "../../../src/types";
import { expectHardhatError } from "../../helpers/errors";
import { TASK_COMPILE } from "../../../src/builtin-tasks/task-names";

describe("ArgumentsParser", () => {
  let argumentsParser: ArgumentsParser;
  let envArgs: HardhatArguments;
  let taskDefinition: TaskDefinition;
  let overridenTaskDefinition: OverriddenTaskDefinition;

  beforeEach(() => {
    argumentsParser = new ArgumentsParser();
    envArgs = {
      network: "test",
      showStackTraces: false,
      version: false,
      help: false,
      emoji: false,
      verbose: false,
    };
    taskDefinition = new SimpleTaskDefinition("compile", true)
      .addParam("param", "just a param", "a default value", string)
      .addParam("bleep", "useless param", 1602, int, true);

    const baseTaskDefinition = new SimpleTaskDefinition("overriddenTask")
      .addParam("strParam", "a str param", "defaultValue", string)
      .addFlag("aFlag", "a flag param");

    overridenTaskDefinition = new OverriddenTaskDefinition(baseTaskDefinition)
      .addFlag("overriddenFlag", "added flag param")
      .addOptionalParam("overriddenOptParam", "added opt param");
  });

  it("should transform a param name into CLA", () => {
    assert.equal(
      ArgumentsParser.paramNameToCLA("showStackTraces"),
      "--show-stack-traces"
    );
    assert.equal(ArgumentsParser.paramNameToCLA("version"), "--version");
  });

  it("Should throw if a param name CLA isn't all lowercase", () => {
    expectHardhatError(
      () => ArgumentsParser.cLAToParamName("--showStackTraces"),
      ERRORS.ARGUMENTS.PARAM_NAME_INVALID_CASING
    );

    expectHardhatError(
      () => ArgumentsParser.cLAToParamName("--showstackTraces"),
      ERRORS.ARGUMENTS.PARAM_NAME_INVALID_CASING
    );

    expectHardhatError(
      () => ArgumentsParser.cLAToParamName("--show-stack-Traces"),
      ERRORS.ARGUMENTS.PARAM_NAME_INVALID_CASING
    );
  });

  it("should transform CLA into a param name", () => {
    assert.equal(ArgumentsParser.cLAToParamName("--run"), "run");

    assert.equal(
      ArgumentsParser.cLAToParamName("--show-stack-traces"),
      "showStackTraces"
    );
  });

  it("should detect param name format", () => {
    assert.isTrue(argumentsParser["_hasCLAParamNameFormat"]("--run"));
    assert.isFalse(argumentsParser["_hasCLAParamNameFormat"]("run"));
  });

  it("should detect parameter names", () => {
    assert.isTrue(
      argumentsParser["_isCLAParamName"](
        "--show-stack-traces",
        HARDHAT_PARAM_DEFINITIONS
      )
    );
    assert.isFalse(
      argumentsParser["_isCLAParamName"]("sarasa", HARDHAT_PARAM_DEFINITIONS)
    );
    assert.isFalse(
      argumentsParser["_isCLAParamName"]("--sarasa", HARDHAT_PARAM_DEFINITIONS)
    );
  });

  describe("hardhat arguments", () => {
    it("should parse hardhat arguments with compile task", () => {
      const rawCLAs: string[] = [
        "--show-stack-traces",
        "--network",
        "local",
        "compile",
        "--task-param",
      ];

      const { hardhatArguments, scopeOrTaskName, allUnparsedCLAs } =
        argumentsParser.parseHardhatArguments(
          HARDHAT_PARAM_DEFINITIONS,
          envArgs,
          rawCLAs
        );
      assert.isTrue(scopeOrTaskName === TASK_COMPILE);
      assert.equal(hardhatArguments.showStackTraces, true);
      assert.equal(hardhatArguments.network, "local");
      assert.equal(hardhatArguments.emoji, false);
      assert.equal(allUnparsedCLAs.length, 2);
      assert.equal("compile", allUnparsedCLAs[0]);
      assert.equal("--task-param", allUnparsedCLAs[1]);
    });

    it("should parse hardhat arguments after compile taskname", () => {
      const rawCLAs: string[] = [
        "compile",
        "--task-param",
        "--show-stack-traces",
        "--network",
        "local",
      ];

      const { hardhatArguments, scopeOrTaskName, allUnparsedCLAs } =
        argumentsParser.parseHardhatArguments(
          HARDHAT_PARAM_DEFINITIONS,
          envArgs,
          rawCLAs
        );
      assert.isTrue(scopeOrTaskName === TASK_COMPILE);
      assert.equal(hardhatArguments.showStackTraces, true);
      assert.equal(hardhatArguments.network, "local");
      assert.equal(hardhatArguments.emoji, false);
      assert.equal(allUnparsedCLAs.length, 2);
      assert.equal("--task-param", allUnparsedCLAs[1]);
    });

    it("should parse hardhat arguments with non-compile task", () => {
      const rawCLAs: string[] = [
        "--show-stack-traces",
        "--network",
        "local",
        "compile2",
        "--task-param",
      ];

      const { hardhatArguments, scopeOrTaskName, allUnparsedCLAs } =
        argumentsParser.parseHardhatArguments(
          HARDHAT_PARAM_DEFINITIONS,
          envArgs,
          rawCLAs
        );
      assert.isFalse(scopeOrTaskName === TASK_COMPILE);
      assert.equal(hardhatArguments.showStackTraces, true);
      assert.equal(hardhatArguments.network, "local");
      assert.equal(hardhatArguments.emoji, false);
      assert.equal(allUnparsedCLAs.length, 2);
      assert.equal("compile2", allUnparsedCLAs[0]);
      assert.equal("--task-param", allUnparsedCLAs[1]);
    });

    it("should parse hardhat arguments after non-compile taskname", () => {
      const rawCLAs: string[] = [
        "compile2",
        "--task-param",
        "--show-stack-traces",
        "--network",
        "local",
      ];

      const { hardhatArguments, scopeOrTaskName, allUnparsedCLAs } =
        argumentsParser.parseHardhatArguments(
          HARDHAT_PARAM_DEFINITIONS,
          envArgs,
          rawCLAs
        );
      assert.isFalse(scopeOrTaskName === TASK_COMPILE);
      assert.equal(hardhatArguments.showStackTraces, true);
      assert.equal(hardhatArguments.network, "local");
      assert.equal(hardhatArguments.emoji, false);
      assert.equal(allUnparsedCLAs.length, 2);
      assert.equal("--task-param", allUnparsedCLAs[1]);
    });

    it("should fail trying to parse task arguments before taskname", () => {
      const rawCLAs: string[] = [
        "--task-param",
        "compile",
        "--show-stack-traces",
        "--network",
        "local",
      ];

      expectHardhatError(
        () =>
          argumentsParser.parseHardhatArguments(
            HARDHAT_PARAM_DEFINITIONS,
            envArgs,
            rawCLAs
          ),
        ERRORS.ARGUMENTS.UNRECOGNIZED_COMMAND_LINE_ARG
      );
    });

    it("should parse a hardhat argument", () => {
      const rawCLAs: string[] = [
        "--show-stack-traces",
        "--network",
        "local",
        "compile",
      ];

      const hardhatArguments: TaskArguments = {};
      assert.equal(
        0,
        argumentsParser["_parseArgumentAt"](
          rawCLAs,
          0,
          HARDHAT_PARAM_DEFINITIONS,
          hardhatArguments
        )
      );
      assert.equal(hardhatArguments.showStackTraces, true);
      assert.equal(
        2,
        argumentsParser["_parseArgumentAt"](
          rawCLAs,
          1,
          HARDHAT_PARAM_DEFINITIONS,
          hardhatArguments
        )
      );
      assert.equal(hardhatArguments.network, "local");
    });

    it("should fail trying to parse hardhat with invalid argument", () => {
      const rawCLAs: string[] = [
        "--show-stack-traces",
        "--network",
        "local",
        "--invalid-param",
      ];
      expectHardhatError(
        () =>
          argumentsParser.parseHardhatArguments(
            HARDHAT_PARAM_DEFINITIONS,
            envArgs,
            rawCLAs
          ),
        ERRORS.ARGUMENTS.UNRECOGNIZED_COMMAND_LINE_ARG
      );
    });

    it("should fail trying to parse a repeated argument", () => {
      const rawCLAs: string[] = [
        "--show-stack-traces",
        "--network",
        "local",
        "--network",
        "local",
        "compile",
      ];
      expectHardhatError(
        () =>
          argumentsParser.parseHardhatArguments(
            HARDHAT_PARAM_DEFINITIONS,
            envArgs,
            rawCLAs
          ),
        ERRORS.ARGUMENTS.REPEATED_PARAM
      );
    });

    it("should only add non-present arguments", () => {
      const hardhatArguments = argumentsParser["_addHardhatDefaultArguments"](
        HARDHAT_PARAM_DEFINITIONS,
        envArgs,
        {
          showStackTraces: true,
        }
      );

      assert.isTrue(hardhatArguments.showStackTraces);
      assert.isFalse(hardhatArguments.emoji);
    });
  });

  // describe("scope and task names", () => {
  //   it("should parse a non-scoped task even if there is a scoped task with the same name", () => {
  //     const dummy = {} as TaskDefinition;
  //
  //     const { scopeName, taskName, unparsedCLAs } =
  //       argumentsParser.parseScopeAndTaskNames(
  //         ["compile"],
  //         { compile: dummy },
  //         { scope: { tasks: { compile: dummy } } }
  //       );
  //
  //     assert.isUndefined(scopeName);
  //     assert.equal(taskName, "compile");
  //     assert.equal(unparsedCLAs.length, 0);
  //   });
  //
  //   it("should parse a non-scoped task and its parameters", () => {
  //     const dummy = {} as TaskDefinition;
  //
  //     const { scopeName, taskName, unparsedCLAs } =
  //       argumentsParser.parseScopeAndTaskNames(
  //         ["compile", "hello"],
  //         { compile: dummy },
  //         { scope: { tasks: { compile: dummy } } }
  //       );
  //
  //     assert.isUndefined(scopeName);
  //     assert.equal(taskName, "compile");
  //     assert.equal(unparsedCLAs.length, 1);
  //     assert.equal(unparsedCLAs[0], "hello");
  //   });
  //
  //   it("should parse a scoped task and its parameters", () => {
  //     const dummy = {} as TaskDefinition;
  //
  //     const { scopeName, taskName, unparsedCLAs } =
  //       argumentsParser.parseScopeAndTaskNames(
  //         ["scope", "compile", "hello", "wagmi"],
  //         { compile: dummy },
  //         { scope: { tasks: { compile: dummy } } }
  //       );
  //
  //     assert.equal(scopeName, "scope");
  //     assert.equal(taskName, "compile");
  //     assert.equal(unparsedCLAs.length, 2);
  //     assert.equal(unparsedCLAs[0], "hello");
  //     assert.equal(unparsedCLAs[1], "wagmi");
  //   });
  //
  //   it("should throw an error if an unknown non-scoped task is used", () => {
  //     const dummy = {} as TaskDefinition;
  //
  //     expectHardhatError(
  //       () =>
  //         argumentsParser.parseScopeAndTaskNames(
  //           ["wen", "moon"],
  //           { compile: dummy },
  //           { scope: { tasks: { compile: dummy } } }
  //         ),
  //       ERRORS.ARGUMENTS.UNRECOGNIZED_TASK
  //     );
  //   });
  //
  //   it("should throw an error if an unknown scoped task is used", () => {
  //     const dummy = {} as TaskDefinition;
  //
  //     expectHardhatError(
  //       () =>
  //         argumentsParser.parseScopeAndTaskNames(
  //           ["scope", "moon"],
  //           { compile: dummy },
  //           { scope: { tasks: { compile: dummy } } }
  //         ),
  //       ERRORS.ARGUMENTS.UNRECOGNIZED_SCOPED_TASK,
  //       "Unrecognized task moon under scope scope"
  //     );
  //   });
  // });

  describe("tasks arguments", () => {
    it("should parse tasks arguments", () => {
      const rawCLAs: string[] = ["--param", "testing", "--bleep", "1337"];
      const { paramArguments, rawPositionalArguments } = argumentsParser[
        "_parseTaskParamArguments"
      ](taskDefinition, rawCLAs);
      assert.deepEqual(paramArguments, { param: "testing", bleep: 1337 });
      assert.equal(rawPositionalArguments.length, 0);
    });

    it("should parse overridden tasks arguments", () => {
      const rawCLAs: string[] = [
        "--str-param",
        "testing",
        "--a-flag",
        "--overridden-flag",
        "--overridden-opt-param",
        "optValue",
      ];

      const { paramArguments, rawPositionalArguments } = argumentsParser[
        "_parseTaskParamArguments"
      ](overridenTaskDefinition, rawCLAs);
      assert.deepEqual(paramArguments, {
        strParam: "testing",
        aFlag: true,
        overriddenFlag: true,
        overriddenOptParam: "optValue",
      });
      assert.equal(rawPositionalArguments.length, 0);
    });

    it("should parse task with variadic arguments", () => {
      taskDefinition.addVariadicPositionalParam(
        "variadic",
        "a variadic params",
        [],
        int
      );

      const rawPositionalArguments = ["16", "02"];
      const positionalArguments = argumentsParser["_parsePositionalParamArgs"](
        rawPositionalArguments,
        taskDefinition.positionalParamDefinitions
      );
      assert.deepEqual(positionalArguments.variadic, [16, 2]);
    });

    it("should parse task with default variadic arguments", () => {
      taskDefinition.addVariadicPositionalParam(
        "variadic",
        "a variadic params",
        [1729],
        int
      );

      const rawPositionalArguments: string[] = [];
      // eslint-disable-next-line dot-notation,@typescript-eslint/dot-notation
      const positionalArguments = argumentsParser["_parsePositionalParamArgs"](
        rawPositionalArguments,
        taskDefinition.positionalParamDefinitions
      );

      assert.deepEqual(positionalArguments.variadic, [1729]);
    });

    it("should fail when passing invalid parameter", () => {
      const rawCLAs: string[] = ["--invalid-parameter", "not_valid"];
      expectHardhatError(() => {
        argumentsParser.parseTaskArguments(taskDefinition, rawCLAs);
      }, ERRORS.ARGUMENTS.UNRECOGNIZED_PARAM_NAME);
    });

    it("should fail to parse task without non optional variadic arguments", () => {
      const rawCLAs: string[] = ["--param", "testing", "--bleep", "1337"];
      taskDefinition.addVariadicPositionalParam(
        "variadic",
        "a variadic params"
      );

      expectHardhatError(() => {
        argumentsParser.parseTaskArguments(taskDefinition, rawCLAs);
      }, ERRORS.ARGUMENTS.MISSING_POSITIONAL_ARG);
    });

    it("should fail to parse task without non optional argument", () => {
      const rawCLAs: string[] = [];
      const definition = new SimpleTaskDefinition("compile", true);
      definition.addParam("param", "just a param");
      definition.addParam("bleep", "useless param", 1602, int, true);
      expectHardhatError(
        () => {
          argumentsParser.parseTaskArguments(definition, rawCLAs);
        },
        ERRORS.ARGUMENTS.MISSING_TASK_ARGUMENT,
        "HH306: The '--param' parameter of task 'compile' expects a value, but none was passed."
      );
    });

    it("should fail trying to parse unrecognized positional argument", () => {
      const rawCLAs: string[] = [];
      const definition = new SimpleTaskDefinition("compile", true);
      definition.addParam("param", "just a param");
      definition.addParam("bleep", "useless param", 1602, int, true);
      expectHardhatError(
        () => {
          argumentsParser.parseTaskArguments(definition, rawCLAs);
        },
        ERRORS.ARGUMENTS.MISSING_TASK_ARGUMENT,
        "The '--param' parameter of task 'compile' expects a value, but none was passed."
      );
    });

    it("should fail when passing unneeded arguments", () => {
      const rawCLAs: string[] = ["more", "arguments"];
      expectHardhatError(() => {
        argumentsParser.parseTaskArguments(taskDefinition, rawCLAs);
      }, ERRORS.ARGUMENTS.UNRECOGNIZED_POSITIONAL_ARG);
    });

    it("should parse task with positional arguments", () => {
      const rawCLAs: string[] = [
        "--param",
        "testing",
        "--bleep",
        "1337",
        "foobar",
      ];
      taskDefinition.addPositionalParam("positional", "a posititon param");

      const args = argumentsParser.parseTaskArguments(taskDefinition, rawCLAs);
      assert.deepEqual(args, {
        param: "testing",
        bleep: 1337,
        positional: "foobar",
      });
    });

    it("Should throw the right error if the last CLA is a non-flag --param", () => {
      const rawCLAs: string[] = ["--b"];

      taskDefinition = new SimpleTaskDefinition("t", false)
        .addOptionalParam("b", "A boolean", true, boolean)
        .setAction(async () => {});

      expectHardhatError(
        () => argumentsParser.parseTaskArguments(taskDefinition, rawCLAs),
        ERRORS.ARGUMENTS.MISSING_TASK_ARGUMENT,
        "HH306: The '--b' parameter of task 't' expects a value, but none was passed."
      );
    });
  });
});
