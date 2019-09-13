import { assert } from "chai";
import path from "path";

import { BuidlerContext } from "../../../src/internal/context";
import { ERRORS } from "../../../src/internal/core/errors-list";
import { Environment } from "../../../src/internal/core/runtime-environment";
import { TasksDSL } from "../../../src/internal/core/tasks/dsl";
import { resetBuidlerContext } from "../../../src/internal/reset";
import {
  BuidlerArguments,
  BuidlerRuntimeEnvironment,
  ResolvedBuidlerConfig,
  TaskArguments
} from "../../../src/types";
import { expectBuidlerError } from "../../helpers/errors";
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

  let tasks: TaskArguments;
  let env: BuidlerRuntimeEnvironment;
  let dsl: TasksDSL;

  beforeEach(() => {
    const ctx = BuidlerContext.createBuidlerContext();
    dsl = ctx.tasksDSL;
    dsl.task("example", async ret => {
      return 27;
    });
    tasks = ctx.tasksDSL.getTaskDefinitions();

    env = new Environment(config, args, tasks);
    ctx.setBuidlerRuntimeEnvironment(env);
  });

  afterEach(() => resetBuidlerContext());

  describe("Enviroment", () => {
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
