import { HardhatRuntimeEnvironment } from "../../types/hre.js";
import {
  NamedTaskParameter,
  NewTaskActionFunction,
  PositionalTaskParameter,
  Task,
  TaskActions,
  TaskArguments,
} from "../../types/tasks.js";
import { formatTaskId } from "./utils.js";

export class ResolvedTask implements Task {
  readonly #hre: HardhatRuntimeEnvironment;

  public static createEmptyTask(
    hre: HardhatRuntimeEnvironment,
    id: string[],
    description: string,
    pluginId?: string,
  ): ResolvedTask {
    return new ResolvedTask(
      id,
      description,
      [{ pluginId, action: undefined }],
      new Map(),
      [],
      pluginId,
      new Map(),
      hre,
    );
  }

  public static createNewTask(
    hre: HardhatRuntimeEnvironment,
    id: string[],
    description: string,
    action: NewTaskActionFunction | string,
    namedParameters: Record<string, NamedTaskParameter>,
    positionalParameters: PositionalTaskParameter[],
    pluginId?: string,
  ): ResolvedTask {
    return new ResolvedTask(
      id,
      description,
      [{ pluginId, action }],
      new Map(Object.entries(namedParameters)),
      positionalParameters,
      pluginId,
      new Map(),
      hre,
    );
  }

  constructor(
    public readonly id: string[],
    public readonly description: string,
    public readonly actions: TaskActions,
    public readonly namedParameters: Map<string, NamedTaskParameter>,
    public readonly positionalParameters: PositionalTaskParameter[],
    public readonly pluginId: string | undefined,
    public readonly subtasks: Map<string, Task>,
    hre: HardhatRuntimeEnvironment,
  ) {
    this.#hre = hre;
  }

  public get isEmpty(): boolean {
    return this.actions.length === 1 && this.actions[0].action === undefined;
  }

  public async run(taskArguments: TaskArguments): Promise<any> {
    // TODO: Run the task
    // - Validate the argument types
    // - Validate that there are no missing required arguments
    // - Resolve defaults for optional arguments
    // - Run the tasks actions with a chain of `runSuper`s
    console.log(`Running task "${formatTaskId(this.id)}"`);
    for (const action of this.actions) {
      if (action.pluginId !== undefined) {
        console.log(
          `  Running action from plugin ${action.pluginId}: ${action.action?.toString()}`,
        );
      } else {
        console.log(`  Running action: ${action.action?.toString()}`);
      }
    }

    void taskArguments;
    void this.#hre;
  }
}
