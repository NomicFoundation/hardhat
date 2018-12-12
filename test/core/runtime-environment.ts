import { assert } from "chai";

import { ERRORS } from "../../src/core/errors";
import { BuidlerArguments } from "../../src/core/params/buidler-params";
import { BuidlerRuntimeEnvironment } from "../../src/core/runtime-environment";
import { TasksDSL } from "../../src/core/tasks/dsl";
import { BuidlerConfig, TaskArguments } from "../../src/types";

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
          host: "127.0.0.1",
          port: 8545
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

  it("should create an environment", () => {
    assert.deepEqual(env.config, config);
    assert.isDefined(env.web3);
    assert.isDefined(env.Web3);
    assert.isDefined(env.pweb3);
    assert.isDefined(env.artifacts);
    assert.isDefined(env.tasks);
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
});
