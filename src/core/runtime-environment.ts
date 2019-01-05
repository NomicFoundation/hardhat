import {
  BuidlerArguments,
  BuidlerRuntimeEnvironment,
  EnvironmentExtender,
  ResolvedBuidlerConfig,
  RunSuperFunction,
  RunTaskFunction,
  TaskArguments,
  TaskDefinition,
  TasksMap
} from "../types";
import { lazyObject } from "../util/lazy";

import { BuidlerError, ERRORS } from "./errors";
import { createProvider } from "./providers/construction";
import { IEthereumProvider } from "../types";
import { OverriddenTaskDefinition } from "./tasks/task-definitions";

export class Environment implements BuidlerRuntimeEnvironment {
  private static readonly BLACKLISTED_PROPERTIES: string[] = [
    "injectToGlobal",
    "runTaskDefinition"
  ];

  public provider: IEthereumProvider;

  constructor(
    public readonly config: ResolvedBuidlerConfig,
    public readonly buidlerArguments: BuidlerArguments,
    public readonly tasks: TasksMap,
    private readonly extenders: EnvironmentExtender[] = []
  ) {
    this.provider = lazyObject(() =>
      createProvider(buidlerArguments.network, config.networks)
    );

    extenders.forEach(extender => extender(this));
  }

  public readonly run: RunTaskFunction = async (name, taskArguments = {}) => {
    const taskDefinition = this.tasks[name];
    if (taskDefinition === undefined) {
      throw new BuidlerError(ERRORS.ARGUMENTS.UNRECOGNIZED_TASK, name);
    }

    return this.runTaskDefinition(taskDefinition, taskArguments);
  };

  public injectToGlobal(
    blacklist: string[] = Environment.BLACKLISTED_PROPERTIES
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

    if (taskDefinition instanceof OverriddenTaskDefinition) {
      runSuper = async (_taskArguments = taskArguments) =>
        this.runTaskDefinition(
          taskDefinition.parentTaskDefinition,
          _taskArguments
        );
    } else {
      runSuper = async () => {
        throw new BuidlerError(
          ERRORS.TASK_DEFINITIONS.RUNSUPER_NOT_AVAILABLE,
          taskDefinition.name
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
