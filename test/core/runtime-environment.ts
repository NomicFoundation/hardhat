import { assert } from "chai";
import { BuidlerRuntimeEnvironment } from "../../src/core/runtime-environment";
import {
  BuidlerConfig,
  RunSuperFunction,
  RunTaskFunction,
  TaskArguments,
  TasksMap,
  TruffleEnvironmentArtifactsType
} from "../../src/types";
import { BuidlerArguments } from "../../src/core/params/buidler-params";
import { TasksDSL } from "../../src/core/tasks/dsl";
import { ITaskDefinition } from "../../src/core/tasks/TaskDefinition";

describe("BuidlerRuntimeEnvironment", () => {
  let config: BuidlerConfig;
  let args: BuidlerArguments;
  let tasks: TaskArguments;
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

    tasks = [
      new TasksDSL().task("example", async (ret) => {
        return 27;
      })
    ];
  });

  it("should create an environment", () => {
    const env = new BuidlerRuntimeEnvironment(config, args, tasks);

    assert.deepEqual(env.config, config);
    assert.isDefined(env.web3);
    assert.isDefined(env.Web3);
    assert.isDefined(env.pweb3);
    assert.isDefined(env.artifacts);
    assert.isDefined(env.tasks);
  });

  it("should run a task", () => {
    const env = new BuidlerRuntimeEnvironment(config, args, tasks);
    
    env.run("example");
  });

  it("should fail trying to run a non existent task", () => {
    const env = new BuidlerRuntimeEnvironment(config, args, tasks);

  });

  it("should inject environment to global", () => {
    const env = new BuidlerRuntimeEnvironment(config, args, tasks);

  });

  it("should uninject environment from global", () => {
    const env = new BuidlerRuntimeEnvironment(config, args, tasks);

  });
});
