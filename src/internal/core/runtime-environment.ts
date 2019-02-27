import {
  BuidlerArguments,
  BuidlerRuntimeEnvironment,
  EnvironmentExtender,
  IEthereumProvider,
  ResolvedBuidlerConfig,
  RunSuperFunction,
  RunTaskFunction,
  TaskArguments,
  TaskDefinition,
  TasksMap
} from "../../types";
import { lazyObject } from "../util/lazy";

import { BuidlerError, ERRORS } from "./errors";
import { createProvider } from "./providers/construction";
import { OverriddenTaskDefinition } from "./tasks/task-definitions";

export class Environment implements BuidlerRuntimeEnvironment {
  private static readonly BLACKLISTED_PROPERTIES: string[] = [
    "injectToGlobal",
    "runTaskDefinition"
  ];

  /**
   * An EIP1193 Ethereum provider.
   */
  public ethereum: IEthereumProvider;

  /**
   * Initializes the Buidler Runtime Environment and the given
   * extender functions.
   *
   * @remarks The extenders' execution order is given by the order
   * of the requires in the buidler's config file and its plugins.
   *
   * @param config The buidler's config object.
   * @param buidlerArguments The parsed buidler's arguments.
   * @param tasks A map of tasks.
   * @param extenders A list of extenders.
   */
  constructor(
    public readonly config: ResolvedBuidlerConfig,
    public readonly buidlerArguments: BuidlerArguments,
    public readonly tasks: TasksMap,
    private readonly extenders: EnvironmentExtender[] = []
  ) {
    this.ethereum = lazyObject(() =>
      createProvider(buidlerArguments.network, config.networks)
    );

    extenders.forEach(extender => extender(this));
  }

  /**
   * Executes the task with the given name.
   *
   * @param name The task's name.
   * @param taskArguments A map of task's arguments.
   *
   * @throws a BDLR303 if there aren't any defined tasks with the given name.
   * @returns a promise with the task's execution result.
   */
  public readonly run: RunTaskFunction = async (name, taskArguments = {}) => {
    const taskDefinition = this.tasks[name];
    if (taskDefinition === undefined) {
      throw new BuidlerError(ERRORS.ARGUMENTS.UNRECOGNIZED_TASK, name);
    }

    return this.runTaskDefinition(taskDefinition, taskArguments);
  };

  /**
   * Injects the properties of `this` (the Buidler Runtime Environment) into the global scope.
   *
   * @param blacklist a list of property names that won't be injected.
   *
   * @returns a function that restores the previous environment.
   */
  public injectToGlobal(
    blacklist: string[] = Environment.BLACKLISTED_PROPERTIES
  ): () => void {
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

    try {
      return await taskDefinition.action(taskArguments, this, runSuper);
    } finally {
      uninjectFromGlobal();
      globalAsAny.runSuper = previousRunSuper;
    }
  }
}
