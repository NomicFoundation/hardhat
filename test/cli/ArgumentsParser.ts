import { assert } from "chai";

import { TaskArguments } from "../types";
import { ArgumentsParser } from "../../src/cli/ArgumentsParser";
import {
  BuidlerArguments,
  BUIDLER_PARAM_DEFINITIONS
} from "../../src/core/params/buidler-params";
import { ERRORS } from "../../src/core/errors";
import {
  ITaskDefinition,
  TaskDefinition
} from "../../src/core/tasks/TaskDefinition";
import { string, int } from "../../src/core/argumentTypes";
import { expectBuidlerError } from "../helpers/errors";

describe("ArgumentsParser", () => {
  let argumentsParser: ArgumentsParser;
  let envArgs: BuidlerArguments;
  let taskDefinition: ITaskDefinition;

  beforeEach(() => {
    argumentsParser = new ArgumentsParser();
    envArgs = {
      network: "test",
      showStackTraces: false,
      version: false,
      help: false,
      emoji: false
    };
    taskDefinition = new TaskDefinition("compile", true)
      .addParam("param", "just a param", "a default value", string)
      .addParam("bleep", "useless param", 1602, int, true);
  });

  it("should tranform a param name into CLA", () => {
    assert.equal(
      ArgumentsParser.paramNameToCLA("showStackTraces"),
      "--show-stack-traces"
    );
    assert.equal(ArgumentsParser.paramNameToCLA("version"), "--version");
  });

  it("should transform CLA into a param name", () => {
    assert.equal(ArgumentsParser.cLAToParamName("--run"), "run");
    // TODO : define how much flexibility we want to offer on this
    assert.equal(
      ArgumentsParser.cLAToParamName("--showStackTraces"),
      "showStackTraces"
    );
    assert.equal(
      ArgumentsParser.cLAToParamName("--showstackTraces"),
      "showstackTraces"
    );
    assert.equal(
      ArgumentsParser.cLAToParamName("--show-stack-Traces"),
      "showStackTraces"
    );
    assert.equal(
      ArgumentsParser.cLAToParamName("--show-Stack-Traces"),
      "showStackTraces"
    );
  });

  it("should detect param name format", () => {
    assert.isTrue(argumentsParser._hasCLAParamNameFormat("--run"));
    assert.isFalse(argumentsParser._hasCLAParamNameFormat("run"));
  });

  it("should detect parameter names", () => {
    assert.isTrue(
      argumentsParser._isParamName(
        "--show-Stack-Traces",
        BUIDLER_PARAM_DEFINITIONS
      )
    );
    assert.isFalse(
      argumentsParser._isParamName("sarasa", BUIDLER_PARAM_DEFINITIONS)
    );
    assert.isFalse(
      argumentsParser._isParamName("--sarasa", BUIDLER_PARAM_DEFINITIONS)
    );
  });

  describe("buidler arguments", () => {
    it("should parse buidler arguments with task", () => {
      const rawCLAs: string[] = [
        "--showStackTraces",
        "--network",
        "local",
        "compile",
        "--taskParam"
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
      assert.equal("--taskParam", unparsedCLAs[0]);
    });

    it("should parse buidler arguments after taskname", () => {
      const rawCLAs: string[] = [
        "compile",
        "--taskParam",
        "--showStackTraces",
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
      assert.equal("--taskParam", unparsedCLAs[0]);
    });

    it("should fail trying to parse task arguments before taskname", () => {
      const rawCLAs: string[] = [
        "--taskParam",
        "compile",
        "--showStackTraces",
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
        "--showStackTraces",
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
        "--showStackTraces",
        "--network",
        "local",
        "--invalidParam"
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
        "--showStackTraces",
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
      const rawCLAs: string[] = ["--invalidParameter", "not_valid"];
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
      const taskDefinition: ITaskDefinition = new TaskDefinition(
        "compile",
        true
      );
      taskDefinition.addParam("param", "just a param");
      taskDefinition.addParam("bleep", "useless param", 1602, int, true);
      expectBuidlerError(() => {
        argumentsParser.parseTaskArguments(taskDefinition, rawCLAs);
      }, ERRORS.ARGUMENT_PARSER_MISSING_TASK_ARGUMENT);
    });

    it("should fail trying to parse unrecognized positional argument", () => {
      const rawCLAs: string[] = [];
      const taskDefinition: ITaskDefinition = new TaskDefinition(
        "compile",
        true
      );
      taskDefinition.addParam("param", "just a param");
      taskDefinition.addParam("bleep", "useless param", 1602, int, true);
      expectBuidlerError(() => {
        argumentsParser.parseTaskArguments(taskDefinition, rawCLAs);
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
