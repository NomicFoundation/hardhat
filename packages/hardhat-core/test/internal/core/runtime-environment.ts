import { assert } from "chai";
import path from "path";
import sinon from "sinon";

import { types } from "../../../src/config";
import { HardhatContext } from "../../../src/internal/context";
import {
  defaultHardhatNetworkParams,
  defaultHttpNetworkParams,
} from "../../../src/internal/core/config/default-config";
import { ERRORS } from "../../../src/internal/core/errors-list";
import { Environment } from "../../../src/internal/core/runtime-environment";
import { TasksDSL } from "../../../src/internal/core/tasks/dsl";
import { resetHardhatContext } from "../../../src/internal/reset";
import {
  HardhatArguments,
  HardhatConfig,
  HardhatRuntimeEnvironment,
  ParamDefinition,
  ScopesMap,
  TasksMap,
} from "../../../src/types";
import {
  expectHardhatError,
  expectHardhatErrorAsync,
} from "../../helpers/errors";
import { useFixtureProject } from "../../helpers/project";

describe("Environment", () => {
  const config: HardhatConfig = {
    defaultNetwork: "default",
    networks: {
      localhost: {
        url: "http://127.0.0.1:8545",
        ...defaultHttpNetworkParams,
      },
      hardhat: {
        ...defaultHardhatNetworkParams,
        gas: defaultHardhatNetworkParams.blockGasLimit,
        initialDate: new Date().toISOString(),
        accounts: [],
      },
      default: {
        url: "http://127.0.0.1:8545",
        ...defaultHttpNetworkParams,
      },
    },
    paths: {
      root: "",
      configFile: "",
      cache: "",
      artifacts: "",
      sources: "",
      tests: "",
    },
    solidity: {
      compilers: [
        {
          version: "0.5.0",
          settings: {
            evmVersion: "byzantium",
            optimizer: {
              enabled: false,
              runs: 0,
            },
          },
        },
      ],
      overrides: {},
    },
    mocha: {},
  };

  const args: HardhatArguments = {
    network: "localhost",
    showStackTraces: false,
    version: false,
    help: false,
    emoji: false,
    verbose: false,
  };

  let tasks: TasksMap;
  let scopes: ScopesMap;
  let env: HardhatRuntimeEnvironment;
  let dsl: TasksDSL;

  beforeEach(() => {
    const ctx = HardhatContext.createHardhatContext();
    dsl = ctx.tasksDSL;
    dsl.task("example", async () => {
      return 27;
    });

    dsl.scope("scoped").task("task", async () => {
      return 28;
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
      .setAction(async (_args: any[]) => _args);

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
      .addOptionalVariadicPositionalParam(
        "variadicOptStrParam",
        "an opt variadic 'str' param",
        [],
        types.string
      )
      .setAction(async (_args: any[]) => _args);

    tasks = ctx.tasksDSL.getTaskDefinitions();
    scopes = ctx.tasksDSL.getScopesDefinitions();

    env = new Environment(config, args, tasks, scopes);
    ctx.setHardhatRuntimeEnvironment(env);
  });

  afterEach(() => resetHardhatContext());

  describe("Environment", () => {
    it("should create an environment", () => {
      assert.deepEqual(env.config, config);
      assert.isDefined(env.tasks);
      assert.isDefined(env.network);
      assert.isDefined(env.version);
      assert.isString(env.version);
    });

    it("should run a task correctly", async () => {
      const ret = await env.run("example");
      assert.equal(ret, 27);
    });

    it("should run a scoped task correctly", async () => {
      const ret = await env.run({ scope: "scoped", task: "task" });
      assert.equal(ret, 28);
    });

    it("should throw if the scope doesn't exist", async () => {
      await expectHardhatErrorAsync(
        () => env.run({ scope: "scopd", task: "task" }),
        ERRORS.ARGUMENTS.UNRECOGNIZED_SCOPE
      );
    });

    it("should throw if a scoped task doesn't exist", async () => {
      await expectHardhatErrorAsync(
        () => env.run({ scope: "scoped", task: "tsk" }),
        ERRORS.ARGUMENTS.UNRECOGNIZED_SCOPED_TASK
      );
    });

    it("should not run a scoped task with just task name", async () => {
      await expectHardhatErrorAsync(
        () => env.run("task"),
        ERRORS.ARGUMENTS.UNRECOGNIZED_TASK
      );

      await expectHardhatErrorAsync(
        () => env.run({ task: "task" }),
        ERRORS.ARGUMENTS.UNRECOGNIZED_TASK
      );
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
          [requiredParamName]: "some value",
        });
        assert.isDefined(taskResult);

        // same task throws with required param missing
        await expectHardhatErrorAsync(
          async () => {
            await env.run("complexExampleTask", {});
          },
          ERRORS.ARGUMENTS.MISSING_TASK_ARGUMENT,
          "HH306: The 'positionalRequiredStringParam' parameter of task 'complexExampleTask' expects a value, but none was passed."
        );
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
          positionalRequiredStringParam: "a string value",
        };

        const taskArgumentsSpecified = {
          ...taskMinimalArgs,
          [optParamName]: paramValue,
        };

        // setup task action spy
        const taskActionSpy = sinon.spy(task, "action");

        // task should run with *specified* value on defined param argument
        await env.run(taskName, taskArgumentsSpecified);

        // task should run with *default* value on empty param argument
        await env.run(taskName, taskMinimalArgs);

        // assertions
        const [taskWithSpecifiedArgsCall, taskWithDefaultArgsCall] =
          taskActionSpy.getCalls();

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
          optFileParam: { valid: __filename, invalid: __dirname },
          variadicOptStrParam: { valid: ["a", "b"], invalid: ["a", 1] },
        };

        const expectTaskRunsSuccessfully = async (
          taskNameToRun: string,
          taskArguments: any
        ) => {
          const argsString = JSON.stringify(taskArguments);
          try {
            await env.run(taskNameToRun, taskArguments);
          } catch (error: any) {
            assert.fail(
              error,
              undefined,
              `Should not throw error task ${taskNameToRun} with args ${argsString}. Error message: ${
                error.message ?? error
              }`
            );
          }
        };

        const expectTaskRunsWithError = async (
          taskNameToRun: string,
          taskArguments: any
        ) => {
          await expectHardhatErrorAsync(async () => {
            await env.run(taskNameToRun, taskArguments);
            console.error(
              `should have thrown task run: '${taskNameToRun}' with arguments: `,
              taskArguments
            );
          }, ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE);
        };

        for (const [paramName, { valid, invalid }] of Object.entries(
          typesValidationTestCases
        )) {
          // should run task successfully with valid type arguments
          const validTaskArguments = { [paramName]: valid };
          await expectTaskRunsSuccessfully(taskName, validTaskArguments);

          // should throw error with argument of type not same type as the param type
          const invalidTaskArguments = { [paramName]: invalid };
          await expectTaskRunsWithError(taskName, invalidTaskArguments);
        }
      });
    });

    it("should fail trying to run a non existent task", async () => {
      await expectHardhatErrorAsync(
        () => env.run("invalid"),
        ERRORS.ARGUMENTS.UNRECOGNIZED_TASK
      );
    });

    it("should clean global state after task execution", async () => {
      assert.equal(await env.run("example"), 27);
      const globalAsAny = global as any;
      assert.isUndefined(globalAsAny.hre);
      assert.isUndefined(globalAsAny.runSuper);
      assert.isUndefined(globalAsAny.env);
    });

    it("should run overridden task correctly", async () => {
      dsl.task("example", "description", async () => {
        return 28;
      });
      tasks = dsl.getTaskDefinitions();
      scopes = dsl.getScopesDefinitions();
      const localEnv = new Environment(config, args, tasks, scopes);
      assert.equal(await localEnv.run("example"), 28);
    });

    it("Should preserve the injected env after running a sub-task", async () => {
      dsl.task(
        "with-subtask",
        "description",
        async ({}, hre, runSuper: any) => {
          const { run, config: theConfig, network } = hre;
          const globalAsAny = global as any;
          assert.equal(globalAsAny.hre, hre);
          assert.equal(globalAsAny.config, theConfig);
          assert.isDefined(globalAsAny.config);
          assert.equal(globalAsAny.runSuper, runSuper);
          assert.isDefined(globalAsAny.network);

          await run("example");

          assert.equal(globalAsAny.hre, hre);
          assert.equal(globalAsAny.config, theConfig);
          assert.equal(globalAsAny.runSuper, runSuper);
          assert.equal(globalAsAny.network, network);
        }
      );

      await env.run("with-subtask");
    });

    it("Should preserve added fields in the HRE after running a sub-task", async () => {
      dsl.task(
        "with-subtask",
        "description",
        async ({}, hre, _runSuper: any) => {
          const modifiedHre = hre as any;
          modifiedHre.newField = 123;

          await modifiedHre.run("example");
          await hre.run("example");

          assert.equal(modifiedHre.newField, 123);
        }
      );

      await env.run("with-subtask");
    });

    it("Should preserve monkey-patched fields in the HRE after running a sub-task", async () => {
      dsl.task(
        "with-subtask",
        "description",
        async ({}, hre, _runSuper: any) => {
          const modifiedHre = hre as any;
          modifiedHre.network = 123;

          await modifiedHre.run("example");
          await hre.run("example");

          assert.equal(modifiedHre.network, 123);
        }
      );

      await env.run("with-subtask");
    });

    it("Should pass new fields in the HRE after running a sub-task", async () => {
      dsl.task(
        "with-subtask",
        "description",
        async ({}, hre, _runSuper: any) => {
          const modifiedHre = hre as any;
          modifiedHre.newField = 123;

          await modifiedHre.run("subtask");

          assert.equal(modifiedHre.newField, 123);
        }
      );

      dsl.task("subtask", "description", async ({}, hre, _runSuper: any) => {
        const theHre = hre as any;

        assert.equal(theHre.newField, 123);
      });

      await env.run("with-subtask");
    });

    it("Should define the network field correctly", () => {
      assert.isDefined(env.network);
      assert.equal(env.network.name, "localhost");
      assert.equal(env.network.config, config.networks.localhost);
    });

    it("Should throw if the chosen network doesn't exist", () => {
      expectHardhatError(() => {
        const ctx = HardhatContext.getHardhatContext();
        env = new Environment(
          config,
          { ...args, network: "NOPE" },
          tasks,
          scopes,
          ctx.environmentExtenders
        );
      }, ERRORS.NETWORK.CONFIG_NOT_FOUND);
    });

    it("Should choose the default network if none is selected", () => {
      const ctx = HardhatContext.getHardhatContext();
      env = new Environment(
        config,
        { ...args, network: undefined },
        tasks,
        scopes,
        ctx.environmentExtenders
      );

      assert.equal(env.network.name, "default");
      assert.equal(env.network.config, config.networks.default);
    });

    it("should override subtask args through parent", async () => {
      dsl
        .task("parentTask", "a task that will call another task")
        .setAction(async (_, hre) => {
          return hre.run("taskWithMultipleTypesParams", {
            optIntParam: 123,
          });
        });

      // default run
      const result1 = await env.run("parentTask");
      assert.equal(result1.optIntParam, 123);

      // subtask args should get overridden
      const result2 = await env.run("parentTask", undefined, {
        taskWithMultipleTypesParams: {
          optIntParam: 456,
        },
      });
      assert.equal(result2.optIntParam, 456);
    });

    it("should prioritize the first subtask arg", async () => {
      dsl.task("a", "a", async (_, hre) => {
        const a = await hre.run("b", undefined, { d: { p: "a" } });
        const b = await hre.run("b", undefined);

        return [a, b];
      });

      dsl.subtask("b", "b", (_, hre) => {
        return hre.run("c", undefined, { d: { p: "b" } });
      });

      dsl.subtask("c", "c", (_, hre) => {
        return hre.run("d", { p: "c" });
      });

      dsl
        .subtask("d")
        .addParam("p")
        .setAction(({ p }) => {
          return p;
        });

      const resultA = await env.run("a");
      assert.deepEqual(resultA, ["a", "b"]);
    });

    it("should override subtask args even if one of the calls passes undefined", async () => {
      dsl.task("a", "a", async (_, hre) => {
        return hre.run("b", undefined, { d: { p: "a" } });
      });

      dsl.subtask("b", "b", (_, hre) => {
        return hre.run("c", undefined, undefined);
      });

      dsl.subtask("c", "c", (_, hre) => {
        return hre.run("d", { p: "c" });
      });

      dsl
        .subtask("d")
        .addParam("p")
        .setAction(({ p }) => {
          return p;
        });

      const resultA = await env.run("a");
      assert.equal(resultA, "a");
    });

    it("Should resolve default params", async () => {
      dsl.task("a", "a", async (_, hre) => {
        return hre.run("b", undefined, {});
      });

      dsl
        .subtask("b")
        .addOptionalParam("p", "p", 123, types.int)
        .setAction(async ({ p }) => {
          return p;
        });

      const result = await env.run("a");
      assert.equal(result, 123);
    });
  });

  describe("Plugin system", () => {
    useFixtureProject("plugin-project");

    it("environment should contains plugin extensions", async () => {
      require(path.join(process.cwd(), "plugins", "example"));
      const ctx = HardhatContext.getHardhatContext();
      env = new Environment(
        config,
        args,
        tasks,
        scopes,
        ctx.environmentExtenders
      );
      assert.equal((env as any).__test_key, "a value");
      assert.equal((env as any).__test_bleep(2), 4);
    });
  });
});
