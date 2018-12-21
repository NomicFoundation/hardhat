import {
  BuidlerConfig,
  RunSuperFunction,
  RunTaskFunction,
  TaskArguments,
  TasksMap
} from "../types";
import { lazyObject } from "../util/lazy";

import { getNetworkConfig } from "./config/config";
import { BuidlerError, ERRORS } from "./errors";
import { BuidlerArguments } from "./params/buidler-params";
import {
  OverloadedTaskDefinition,
  TaskDefinition
} from "./tasks/task-definitions";
import { getWeb3Instance } from "./web3/network";
import { promisifyWeb3 } from "./web3/pweb3";

export class BuidlerRuntimeEnvironment {
  private static readonly BLACKLISTED_PROPERTIES: string[] = [
    "injectToGlobal",
    "runTaskDefinition"
  ];

  public readonly Web3: any;
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
  }

  public readonly run: RunTaskFunction = async (name, taskArguments = {}) => {
    const taskDefinition = this.tasks[name];
    if (taskDefinition === undefined) {
      throw new BuidlerError(ERRORS.UNRECOGNIZED_TASK, name);
    }

    return this.runTaskDefinition(taskDefinition, taskArguments);
  };

  public injectToGlobal(
    blacklist: string[] = BuidlerRuntimeEnvironment.BLACKLISTED_PROPERTIES
  ) {
    const globalAsAny = global as any;
    const previousEnvironment: any = globalAsAny.env;

    globalAsAny.env = this;

    const previousValues: { [name: string]: any } = {};

    for (const [key, value] of Object.entries(this)) {
      if (blacklist.includes(key)) {
        continue;
      }

      previousValues[key] = globalAsAny[key];
      globalAsAny[key] = value;
    }

    return () => {
      globalAsAny.env = previousEnvironment;

      for (const [key, _] of Object.entries(this)) {
        if (blacklist.includes(key)) {
          continue;
        }

        globalAsAny[key] = previousValues[key];
      }
    };
  }

  private async runTaskDefinition(
    taskDefinition: TaskDefinition,
    taskArguments: TaskArguments
  ) {
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
    const previousRunSuper: any = globalAsAny.runSuper;
    globalAsAny.runSuper = runSuper;

    const uninjectFromGlobal = this.injectToGlobal();

    const taskResult = await taskDefinition.action(
      taskArguments,
      this,
      runSuper
    );

    uninjectFromGlobal();
    globalAsAny.runSuper = previousRunSuper;

    return taskResult;
  }
}
