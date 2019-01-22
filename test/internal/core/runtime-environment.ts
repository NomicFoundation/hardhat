import { assert } from "chai";

import { usePlugin } from "../../../src/internal/core/config/config-env";
import extenderManager from "../../../src/internal/core/config/extenders-instance";
import { ERRORS } from "../../../src/internal/core/errors";
import { Environment } from "../../../src/internal/core/runtime-environment";
import { TasksDSL } from "../../../src/internal/core/tasks/dsl";
import {
  BuidlerArguments,
  BuidlerRuntimeEnvironment,
  ResolvedBuidlerConfig,
  TaskArguments
} from "../../../src/types";
import { expectErrorAsync } from "../../helpers/errors";
import { useFixtureProject } from "../../helpers/project";

describe("Environment", () => {
  let config: ResolvedBuidlerConfig;
  let args: BuidlerArguments;
  let tasks: TaskArguments;
  let env: BuidlerRuntimeEnvironment;
  let dsl: TasksDSL;
  before(() => {
    config = {
      networks: {
        local: {
          url: "http://localhost:8545"
        }
      },
      paths: {
        root: "",
        configFile: "",
        cache: "",
        artifacts: "",
        sources: ""
      },
      solc: {
        version: "0.5.0",
        optimizer: {
          enabled: false,
          runs: 0
        },
        evmVersion: "byzantium"
      },
      mocha: {}
    };
    args = {
      network: "local",
      showStackTraces: false,
      version: false,
      help: false,
      emoji: false
    };
    dsl = new TasksDSL();
    dsl.task("example", async ret => {
      return 27;
    });
    tasks = dsl.getTaskDefinitions();
  });

  beforeEach(() => {
    env = new Environment(config, args, tasks);
  });

  describe("Enviroment", () => {
    it("should create an environment", () => {
      assert.deepEqual(env.config, config);
      assert.isDefined(env.tasks);
      assert.isDefined(env.provider);
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
        async ({}, { run, config: theConfig }, runSuper) => {
          const globalAsAny = global as any;
          assert.equal(globalAsAny.config, theConfig);
          assert.isDefined(globalAsAny.config);
          assert.equal(globalAsAny.runSuper, runSuper);

          await run("example");

          assert.equal(globalAsAny.config, theConfig);
          assert.equal(globalAsAny.runSuper, runSuper);
        }
      );

      await env.run("with-subtask");
    });
  });

  describe("Plugin system", () => {
    useFixtureProject("plugin-project");

    it("enviroment should contains plugin extensions", async () => {
      usePlugin(process.cwd() + "/plugins/example");
      env = new Environment(
        config,
        args,
        tasks,
        extenderManager.getExtenders()
      );
      assert.equal((env as any).__test_key, "a value");
      assert.equal((env as any).__test_bleep(2), 4);
    });

    it("should fail when using a non existent plugin", async () => {
      await expectErrorAsync(
        async () => usePlugin("non-existent"),
        /Cannot find module/
      );
    });
  });
});
