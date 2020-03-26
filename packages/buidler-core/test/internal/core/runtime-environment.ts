import { assert } from "chai";
import path from "path";
import sinon from "sinon";

import { types } from "../../../src/config";
import { BuidlerContext } from "../../../src/internal/context";
import { ERRORS } from "../../../src/internal/core/errors-list";
import { Environment } from "../../../src/internal/core/runtime-environment";
import { TasksDSL } from "../../../src/internal/core/tasks/dsl";
import { resetBuidlerContext } from "../../../src/internal/reset";
import {
  BuidlerArguments,
  BuidlerRuntimeEnvironment,
  ParamDefinition,
  ResolvedBuidlerConfig,
  TasksMap
} from "../../../src/types";
import {
  expectBuidlerError,
  expectBuidlerErrorAsync
} from "../../helpers/errors";
import { useFixtureProject } from "../../helpers/project";

describe("Environment", () => {
  const config: ResolvedBuidlerConfig = {
    defaultNetwork: "default",
    networks: {
      local: {
        url: "http://localhost:8545"
      },
      default: {
        url: "http://localhost:8545"
      }
    },
    paths: {
      root: "",
      configFile: "",
      cache: "",
      artifacts: "",
      sources: "",
      tests: ""
    },
    solc: {
      version: "0.5.0",
      optimizer: {
        enabled: false,
        runs: 0
      },
      evmVersion: "byzantium"
    },
    mocha: {},
    analytics: { enabled: true }
  };

  const args: BuidlerArguments = {
    network: "local",
    showStackTraces: false,
    version: false,
    help: false,
    emoji: false,
    verbose: false
  };

  let tasks: TasksMap;
  let env: BuidlerRuntimeEnvironment;
  let dsl: TasksDSL;

  beforeEach(() => {
    const ctx = BuidlerContext.createBuidlerContext();
    dsl = ctx.tasksDSL;
    dsl.task("example", async ret => {
      return 27;
    });

    dsl
      .task("complexExampleTask", "a complex example task")
      .addPositionalParam(
        "positionalRequiredStringParam",
        "a positional required type 'string' param",
        undefined,
        types.string,
        false
      )
      .addOptionalPositionalParam(
        "posOptJsonParamWithDefault",
        "a positional optional type 'json' param",
        { a: 1 },
        types.json
      )
      .setAction(async () => 42);

    dsl
      .task("taskWithMultipleTypesParams", "a task with many types params")
      .addFlag("flagParam", "some flag")
      .addOptionalParam("optIntParam", "an opt int param", 123, types.int)
      .addOptionalParam("optFloatParam", "an opt float param", 2.5, types.float)
      .addOptionalParam(
        "optFileParam",
        "an opt file param",
        undefined,
        types.inputFile
      )
      .addOptionalParam(
        "optStringParam",
        "an opt string param",
        "some default",
        types.string
      )
      .addOptionalParam(
        "optJsonParam",
        "an opt 'json' param",
        JSON.stringify({ a: 1 }),
        types.json
      )
      .setAction(async () => 42);

    tasks = ctx.tasksDSL.getTaskDefinitions();

    env = new Environment(config, args, tasks);
    ctx.setBuidlerRuntimeEnvironment(env);
  });

  afterEach(() => resetBuidlerContext());

  describe("Environment", () => {
    it("should create an environment", () => {
      assert.deepEqual(env.config, config);
      assert.isDefined(env.tasks);
      assert.isDefined(env.ethereum);
      assert.isDefined(env.network);
    });

    it("should run a task correctly", async () => {
      const ret = await env.run("example");
      assert.equal(ret, 27);
    });

    describe("run task arguments validation", () => {
      it("should throw on missing required argument", async () => {
        const taskName = "complexExampleTask";
        const requiredParamName = "positionalRequiredStringParam";
        const task = env.tasks[taskName];
        const param = task.positionalParamDefinitions.find(
          ({ name }) => name === requiredParamName
        );
        assert.isDefined(param);

        // task runs with required param present
        const taskResult = await env.run(taskName, {
          [requiredParamName]: "some value"
        });
        assert.isDefined(taskResult);

        // same task throws with required param missing
        await expectBuidlerErrorAsync(async () => {
          await env.run("complexExampleTask", {});
        }, ERRORS.ARGUMENTS.MISSING_TASK_ARGUMENT);
      });

      it("should use default value on missing optional argument with default param", async () => {
        const taskName = "complexExampleTask";
        const optParamName = "posOptJsonParamWithDefault";
        const task = env.tasks[taskName];
        const param = task.positionalParamDefinitions.find(
          ({ name }) => name === optParamName
        ) as ParamDefinition<any>;

        assert.isDefined(param);

        // specified arg value, should be different from the default for this test
        const paramValue = { value: 20 };
        const { defaultValue } = param;
        assert.notEqual(defaultValue, paramValue);

        const taskMinimalArgs = {
          positionalRequiredStringParam: "a string value"
        };

        const taskArgumentsSpecified = {
          ...taskMinimalArgs,
          [optParamName]: paramValue
        };

        // setup task action spy
        const taskActionSpy = sinon.spy(task, "action");

        // task should run with *specified* value on defined param argument
        await env.run(taskName, taskArgumentsSpecified);

        // task should run with *default* value on empty param argument
        await env.run(taskName, taskMinimalArgs);

        // assertions
        const [
          taskWithSpecifiedArgsCall,
          taskWithDefaultArgsCall
        ] = taskActionSpy.getCalls();

        assert.equal(
          taskWithSpecifiedArgsCall.args[0][optParamName],
          paramValue,
          "should include specified param value in task action call"
        );

        assert.equal(
          taskWithDefaultArgsCall.args[0][optParamName],
          defaultValue,
          "should include default param value in task action call"
        );
      });

      it("should validate argument type matches the param type", async () => {
        const taskName = "taskWithMultipleTypesParams";

        const typesValidationTestCases = {
          flagParam: { valid: true, invalid: 1 },
          optIntParam: { valid: 10, invalid: 1.2 },
          optFloatParam: { valid: 1.2, invalid: NaN },
          optStringParam: { valid: "a string", invalid: 123 },
          optJsonParam: { valid: { a: 20 }, invalid: 1234 },
          optFileParam: { valid: __filename, invalid: __dirname }
        };

        const expectTaskRunsSuccesfully = async (
          taskNameToRun: string,
          taskArguments: any
        ) => {
          const argsString = JSON.stringify(taskArguments);
          try {
            await env.run(taskNameToRun, taskArguments);
          } catch (error) {
            assert.fail(
              error,
              undefined,
              `Should not throw error task ${taskNameToRun} with args ${argsString}. Error message: ${error.message ||
                error}`
            );
          }
        };

        const expectTaskRunsWithError = async (
          taskNameToRun: string,
          taskArguments: any
        ) => {
          await expectBuidlerErrorAsync(async () => {
            await env.run(taskNameToRun, taskArguments);
            console.log("should have thrown: ", taskNameToRun, taskArguments);
          }, ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE);
        };

        for (const [paramName, { valid, invalid }] of Object.entries(
          typesValidationTestCases
        )) {
          const validTaskArguments = { [paramName]: valid };
          const invalidTaskArguments = { [paramName]: invalid };

          // should run task successfully with valid type arguments
          await expectTaskRunsSuccesfully(taskName, validTaskArguments);

          // should throw error with argument of type not same type as the param type
          await expectTaskRunsWithError(taskName, invalidTaskArguments);
        }
      });
    });

    it("should fail trying to run a non existent task", () => {
      env.run("invalid").catch(err => {
        assert.equal(err.number, ERRORS.ARGUMENTS.UNRECOGNIZED_TASK.number);
      });
    });

    it("should clean global state after task execution", async () => {
      assert.equal(await env.run("example"), 27);
      const globalAsAny = global as any;
      assert.isUndefined(globalAsAny.runSuper);
      assert.isUndefined(globalAsAny.env);
    });

    it("should run overridden task correctly", async () => {
      dsl.task("example", "description", async ret => {
        return 28;
      });
      tasks = dsl.getTaskDefinitions();
      const localEnv = new Environment(config, args, tasks);
      assert.equal(await localEnv.run("example"), 28);
    });

    it("Should preserve the injected env after running a sub-task", async () => {
      dsl.task(
        "with-subtask",
        "description",
        async ({}, { run, config: theConfig, network }, runSuper) => {
          const globalAsAny = global as any;
          assert.equal(globalAsAny.config, theConfig);
          assert.isDefined(globalAsAny.config);
          assert.equal(globalAsAny.runSuper, runSuper);
          assert.isDefined(globalAsAny.network);

          await run("example");

          assert.equal(globalAsAny.config, theConfig);
          assert.equal(globalAsAny.runSuper, runSuper);
          assert.equal(globalAsAny.network, network);
        }
      );

      await env.run("with-subtask");
    });

    it("Should define the network field correctly", () => {
      assert.isDefined(env.network);
      assert.equal(env.network.name, "local");
      assert.equal(env.network.config, config.networks.local);
      assert.equal(env.network.provider, env.ethereum);
    });

    it("Should throw if the chosen network doesn't exist", () => {
      expectBuidlerError(() => {
        const ctx = BuidlerContext.getBuidlerContext();
        env = new Environment(
          config,
          { ...args, network: "NOPE" },
          tasks,
          ctx.extendersManager.getExtenders()
        );
      }, ERRORS.NETWORK.CONFIG_NOT_FOUND);
    });

    it("Should choose the default network if none is selected", () => {
      const ctx = BuidlerContext.getBuidlerContext();
      env = new Environment(
        config,
        { ...args, network: undefined },
        tasks,
        ctx.extendersManager.getExtenders()
      );

      assert.equal(env.network.name, "default");
      assert.equal(env.network.config, config.networks.default);
    });
  });

  describe("Plugin system", () => {
    useFixtureProject("plugin-project");

    it("environment should contains plugin extensions", async () => {
      require(path.join(process.cwd(), "plugins", "example"));
      const ctx = BuidlerContext.getBuidlerContext();
      env = new Environment(
        config,
        args,
        tasks,
        ctx.extendersManager.getExtenders()
      );
      assert.equal((env as any).__test_key, "a value");
      assert.equal((env as any).__test_bleep(2), 4);
    });
  });
});
