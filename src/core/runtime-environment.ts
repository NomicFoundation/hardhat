import {
  BuidlerConfig,
  RunSuperFunction,
  RunTaskFunction,
  TaskArguments,
  TasksMap,
  TruffleEnvironmentArtifactsType
} from "../types";
import { lazyObject } from "../util/lazy";

import { getNetworkConfig } from "./config";
import { BuidlerError, ERRORS } from "./errors";
import { BuidlerArguments } from "./params/buidler-params";
import {
  ITaskDefinition,
  OverloadedTaskDefinition
} from "./tasks/TaskDefinition";
import { TruffleEnvironmentArtifacts } from "./truffle";
import { getWeb3Instance } from "./web3/network";
import { promisifyWeb3 } from "./web3/pweb3";

export class BuidlerRuntimeEnvironment {
  public readonly Web3: any;
  public readonly artifacts: TruffleEnvironmentArtifactsType;
  public readonly pweb3: any;
  public readonly web3: any;

  constructor(
    public readonly config: BuidlerConfig,
    public readonly buidlerArguments: BuidlerArguments,
    public readonly tasks: TasksMap
  ) {
    const netConfig = getNetworkConfig(config, buidlerArguments.network);
    this.web3 = lazyObject(() =>
      getWeb3Instance(buidlerArguments.network, netConfig)
    );
    this.pweb3 = lazyObject(() => promisifyWeb3(this.web3));

    const importLazy = require("import-lazy")(require);
    this.Web3 = importLazy("web3");

    this.artifacts = new TruffleEnvironmentArtifacts(
      config,
      this.web3,
      netConfig
    );
  }

  public readonly run: RunTaskFunction = async (name, taskArguments = {}) => {
    const taskDefinition = this.tasks[name];
    if (taskDefinition === undefined) {
      throw new BuidlerError(ERRORS.UNRECOGNIZED_TASK, name);
    }

    return this.runTaskDefinition(taskDefinition, taskArguments);
  };

  public injectToGlobal() {
    const BLACKLISTED_PROPERTIES = ["injectToGlobal", "runTaskDefinition"];

    const globalAsAny = global as any;
    globalAsAny.env = this;

    for (const [key, value] of Object.entries(this)) {
      if (BLACKLISTED_PROPERTIES.includes(key)) {
        continue;
      }

      globalAsAny[key] = value;
    }
  }

  private async runTaskDefinition(
    taskDefinition: ITaskDefinition,
    taskArguments: TaskArguments
  ) {
    this.injectToGlobal();

    let runSuper: RunSuperFunction<TaskArguments>;

    if (taskDefinition instanceof OverloadedTaskDefinition) {
      runSuper = async (_taskArguments = taskArguments) =>
        this.runTaskDefinition(
          taskDefinition.parentTaskDefinition,
          _taskArguments
        );
    } else {
      runSuper = async () => {
        throw new Error(
          `Task ${
            taskDefinition.name
          } doesn't overload a previous one, so there's runSuper.`
        );
      };
    }

    const globalAsAny = global as any;

    globalAsAny.runSuper = runSuper;

    const taskResult = taskDefinition.action(taskArguments, this, runSuper);

    globalAsAny.runSuper = undefined;

    return taskResult;
  }
}
