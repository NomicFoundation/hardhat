import { assert } from "chai";

import { usePlugin } from "../../src/core/config/config-env";
import extenderManager from "../../src/core/config/extenders-instance";
import { ERRORS } from "../../src/core/errors";
import { BuidlerArguments } from "../../src/core/params/buidler-params";
import { BuidlerRuntimeEnvironment } from "../../src/core/runtime-environment";
import { TasksDSL } from "../../src/core/tasks/dsl";
import { BuidlerConfig, TaskArguments } from "../../src/types";
import { expectErrorAsync } from "../helpers/errors";
import { useFixtureProject } from "../helpers/project";

describe("BuidlerRuntimeEnvironment", () => {
  let config: BuidlerConfig;
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
        }
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
    env = new BuidlerRuntimeEnvironment(config, args, tasks);
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
        assert.equal(err.number, ERRORS.UNRECOGNIZED_TASK.number);
      });
    });

    it("should clean global state after task execution", async () => {
      assert.equal(await env.run("example"), 27);
      const globalAsAny = global as any;
      assert.isUndefined(globalAsAny.runSuper);
      assert.isUndefined(globalAsAny.env);
    });

    it("should run overloaded task correctly", async () => {
      dsl.task("example", "description", async ret => {
        return 28;
      });
      tasks = dsl.getTaskDefinitions();
      const localEnv = new BuidlerRuntimeEnvironment(config, args, tasks);
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
      env = new BuidlerRuntimeEnvironment(
        config,
        args,
        tasks,
        extenderManager.getExtenders()
      );
      assert.equal(env.__test_key, "a value");
      assert.equal(env.__test_bleep(2), 4);
    });

    it("should fail when using a non existent plugin", async () => {
      await expectErrorAsync(
        async () => usePlugin("non-existent"),
        /Cannot find module/
      );
    });
  });
});
