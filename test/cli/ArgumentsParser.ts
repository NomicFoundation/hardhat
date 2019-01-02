import { assert } from "chai";

import { ArgumentsParser } from "../../src/cli/ArgumentsParser";
import { ERRORS } from "../../src/core/errors";
import { int, string } from "../../src/core/params/argumentTypes";
import { BUIDLER_PARAM_DEFINITIONS } from "../../src/core/params/buidler-params";
import { SimpleTaskDefinition } from "../../src/core/tasks/task-definitions";
import {
  BuidlerArguments,
  TaskArguments,
  TaskDefinition
} from "../../src/types";
import { expectBuidlerError } from "../helpers/errors";

describe("ArgumentsParser", () => {
  let argumentsParser: ArgumentsParser;
  let envArgs: BuidlerArguments;
  let taskDefinition: TaskDefinition;

  beforeEach(() => {
    argumentsParser = new ArgumentsParser();
    envArgs = {
      network: "test",
      showStackTraces: false,
      version: false,
      help: false,
      emoji: false
    };
    taskDefinition = new SimpleTaskDefinition("compile", true)
      .addParam("param", "just a param", "a default value", string)
      .addParam("bleep", "useless param", 1602, int, true);
  });

  it("should transform a param name into CLA", () => {
    assert.equal(
      ArgumentsParser.paramNameToCLA("showStackTraces"),
      "--show-stack-traces"
    );
    assert.equal(ArgumentsParser.paramNameToCLA("version"), "--version");
  });

  it("Should throw if a param name CLA isn't all lowercase", () => {
    expectBuidlerError(
      () => ArgumentsParser.cLAToParamName("--showStackTraces"),
      ERRORS.ARGUMENT_PARSER_PARAM_NAME_INVALID_CASING
    );

    expectBuidlerError(
      () => ArgumentsParser.cLAToParamName("--showstackTraces"),
      ERRORS.ARGUMENT_PARSER_PARAM_NAME_INVALID_CASING
    );

    expectBuidlerError(
      () => ArgumentsParser.cLAToParamName("--show-stack-Traces"),
      ERRORS.ARGUMENT_PARSER_PARAM_NAME_INVALID_CASING
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
    assert.isTrue(argumentsParser._hasCLAParamNameFormat("--run"));
    assert.isFalse(argumentsParser._hasCLAParamNameFormat("run"));
  });

  it("should detect parameter names", () => {
    assert.isTrue(
      argumentsParser._isCLAParamName(
        "--show-stack-traces",
        BUIDLER_PARAM_DEFINITIONS
      )
    );
    assert.isFalse(
      argumentsParser._isCLAParamName("sarasa", BUIDLER_PARAM_DEFINITIONS)
    );
    assert.isFalse(
      argumentsParser._isCLAParamName("--sarasa", BUIDLER_PARAM_DEFINITIONS)
    );
  });

  describe("buidler arguments", () => {
    it("should parse buidler arguments with task", () => {
      const rawCLAs: string[] = [
        "--show-stack-traces",
        "--network",
        "local",
        "compile",
        "--task-param"
      ];

      const {
        buidlerArguments,
        taskName,
        unparsedCLAs
      } = argumentsParser.parseBuidlerArguments(
        BUIDLER_PARAM_DEFINITIONS,
        envArgs,
        rawCLAs
      );
      assert.equal(taskName, "compile");
      assert.equal(buidlerArguments.showStackTraces, true);
      assert.equal(buidlerArguments.network, "local");
      assert.equal(buidlerArguments.emoji, false);
      assert.equal(unparsedCLAs.length, 1);
      assert.equal("--task-param", unparsedCLAs[0]);
    });

    it("should parse buidler arguments after taskname", () => {
      const rawCLAs: string[] = [
        "compile",
        "--task-param",
        "--show-stack-traces",
        "--network",
        "local"
      ];

      const {
        buidlerArguments,
        taskName,
        unparsedCLAs
      } = argumentsParser.parseBuidlerArguments(
        BUIDLER_PARAM_DEFINITIONS,
        envArgs,
        rawCLAs
      );
      assert.equal(taskName, "compile");
      assert.equal(buidlerArguments.showStackTraces, true);
      assert.equal(buidlerArguments.network, "local");
      assert.equal(buidlerArguments.emoji, false);
      assert.equal(unparsedCLAs.length, 1);
      assert.equal("--task-param", unparsedCLAs[0]);
    });

    it("should fail trying to parse task arguments before taskname", () => {
      const rawCLAs: string[] = [
        "--task-param",
        "compile",
        "--show-stack-traces",
        "--network",
        "local"
      ];

      expectBuidlerError(
        () =>
          argumentsParser.parseBuidlerArguments(
            BUIDLER_PARAM_DEFINITIONS,
            envArgs,
            rawCLAs
          ),
        ERRORS.ARGUMENT_PARSER_UNRECOGNIZED_COMMAND_LINE_ARG
      );
    });

    it("should parse a buidler argument", () => {
      const rawCLAs: string[] = [
        "--show-stack-traces",
        "--network",
        "local",
        "compile"
      ];

      const buidlerArguments: TaskArguments = {};
      assert.equal(
        0,
        argumentsParser._parseArgumentAt(
          rawCLAs,
          0,
          BUIDLER_PARAM_DEFINITIONS,
          buidlerArguments
        )
      );
      assert.equal(buidlerArguments.showStackTraces, true);
      assert.equal(
        2,
        argumentsParser._parseArgumentAt(
          rawCLAs,
          1,
          BUIDLER_PARAM_DEFINITIONS,
          buidlerArguments
        )
      );
      assert.equal(buidlerArguments.network, "local");
    });

    it("should fail trying to parse buidler with invalid argument", () => {
      const rawCLAs: string[] = [
        "--show-stack-traces",
        "--network",
        "local",
        "--invalid-param"
      ];
      expectBuidlerError(
        () =>
          argumentsParser.parseBuidlerArguments(
            BUIDLER_PARAM_DEFINITIONS,
            envArgs,
            rawCLAs
          ),
        ERRORS.ARGUMENT_PARSER_UNRECOGNIZED_COMMAND_LINE_ARG
      );
    });

    it("should fail trying to parse a repeated argument", () => {
      const rawCLAs: string[] = [
        "--show-stack-traces",
        "--network",
        "local",
        "--network",
        "local",
        "compile"
      ];
      expectBuidlerError(
        () =>
          argumentsParser.parseBuidlerArguments(
            BUIDLER_PARAM_DEFINITIONS,
            envArgs,
            rawCLAs
          ),
        ERRORS.ARGUMENT_PARSER_REPEATED_PARAM
      );
    });

    it("should only add non-present arguments", () => {
      const rawCLAs: string[] = [
        "--showStackTraces",
        "--network",
        "local",
        "compile"
      ];
      const buidlerArguments: TaskArguments = {
        showStackTraces: true
      };
      argumentsParser._addBuidlerDefaultArguments(
        BUIDLER_PARAM_DEFINITIONS,
        envArgs,
        buidlerArguments
      );
      assert.isTrue(buidlerArguments.showStackTraces);
      assert.isFalse(buidlerArguments.emoji);
    });
  });

  describe("tasks arguments", () => {
    it("should parse tasks arguments", () => {
      const rawCLAs: string[] = ["--param", "testing", "--bleep", "1337"];
      const {
        paramArguments,
        rawPositionalArguments
      } = argumentsParser._parseTaskParamArguments(taskDefinition, rawCLAs);
      assert.deepEqual(paramArguments, { param: "testing", bleep: 1337 });
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
      const positionalArguments = argumentsParser._parsePositionalParamArgs(
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
      const positionalArguments = argumentsParser._parsePositionalParamArgs(
        rawPositionalArguments,
        taskDefinition.positionalParamDefinitions
      );

      assert.deepEqual(positionalArguments.variadic, [1729]);
    });

    it("should fail when passing invalid parameter", () => {
      const rawCLAs: string[] = ["--invalid-parameter", "not_valid"];
      expectBuidlerError(() => {
        argumentsParser.parseTaskArguments(taskDefinition, rawCLAs);
      }, ERRORS.ARGUMENT_PARSER_UNRECOGNIZED_PARAM_NAME);
    });

    it("should fail to parse task without non optional variadic arguments", () => {
      const rawCLAs: string[] = ["--param", "testing", "--bleep", "1337"];
      taskDefinition.addVariadicPositionalParam(
        "variadic",
        "a variadic params"
      );

      expectBuidlerError(() => {
        argumentsParser.parseTaskArguments(taskDefinition, rawCLAs);
      }, ERRORS.ARGUMENT_PARSER_MISSING_POSITIONAL_ARG);
    });

    it("should fail to parse task without non optional argument", () => {
      const rawCLAs: string[] = [];
      const definition = new SimpleTaskDefinition("compile", true);
      definition.addParam("param", "just a param");
      definition.addParam("bleep", "useless param", 1602, int, true);
      expectBuidlerError(() => {
        argumentsParser.parseTaskArguments(definition, rawCLAs);
      }, ERRORS.ARGUMENT_PARSER_MISSING_TASK_ARGUMENT);
    });

    it("should fail trying to parse unrecognized positional argument", () => {
      const rawCLAs: string[] = [];
      const definition = new SimpleTaskDefinition("compile", true);
      definition.addParam("param", "just a param");
      definition.addParam("bleep", "useless param", 1602, int, true);
      expectBuidlerError(() => {
        argumentsParser.parseTaskArguments(definition, rawCLAs);
      }, ERRORS.ARGUMENT_PARSER_MISSING_TASK_ARGUMENT);
    });

    it("should fail when passing unneeded arguments", () => {
      const rawCLAs: string[] = ["more", "arguments"];
      expectBuidlerError(() => {
        argumentsParser.parseTaskArguments(taskDefinition, rawCLAs);
      }, ERRORS.ARGUMENT_PARSER_UNRECOGNIZED_POSITIONAL_ARG);
    });

    it("should parse task with positional arguments", () => {
      const rawCLAs: string[] = [
        "--param",
        "testing",
        "--bleep",
        "1337",
        "foobar"
      ];
      taskDefinition.addPositionalParam("positional", "a posititon param");

      const args = argumentsParser.parseTaskArguments(taskDefinition, rawCLAs);
      assert.deepEqual(args, {
        param: "testing",
        bleep: 1337,
        positional: "foobar"
      });
    });
  });
});
