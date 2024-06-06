import type { HardhatRuntimeEnvironment } from "../../types/hre.js";
import type {
  NamedTaskParameter,
  NewTaskActionFunction,
  PositionalTaskParameter,
  Task,
  TaskActions,
  TaskArguments,
  TaskOverrideActionFunction,
} from "../../types/tasks.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

import { isParameterValueValid } from "../../types/common.js";

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

  /**
   * This method runs the task with the given arguments.
   * It validates the arguments, resolves the file actions, and runs the task
   * actions by calling them in order.
   *
   * @param taskArguments The arguments to run the task with.
   * @returns The result of running the task.
   * @throws HardhatError if the task is empty, a required parameter is missing,
   * a parameter has an invalid type, or the file actions can't be resolved.
   */
  public async run(taskArguments: TaskArguments): Promise<any> {
    if (this.isEmpty) {
      throw new Error(`Cannot run an empty task`); // TODO should be a HardhatError
    }

    for (const [name, value] of Object.entries(taskArguments)) {
      const parameter = this.#getParameter(name);

      this.#validateRequiredParameter(parameter, value);

      this.#validateParameterType(parameter, value);

      // resolve defaults for optional parameters
      if (value === undefined && parameter.defaultValue !== undefined) {
        taskArguments[name] = parameter.defaultValue;
      }
    }

    const next = async (
      nextTaskArguments: TaskArguments,
      currentIndex = this.actions.length - 1,
    ): Promise<any> => {
      // The first action may be empty if the task was originally an empty task
      const currentAction = this.actions[currentIndex].action ?? (() => {});

      const actionFn =
        typeof currentAction === "function"
          ? currentAction
          : await this.#resolveFileAction(currentAction, this.id);

      if (currentIndex === 0) {
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
        We know that the first action in the array is a NewTaskActionFunction */
        return (actionFn as NewTaskActionFunction)(
          nextTaskArguments,
          this.#hre,
        );
      }

      return actionFn(
        nextTaskArguments,
        this.#hre,
        async (newTaskArguments: TaskArguments) => {
          return next(newTaskArguments, currentIndex - 1);
        },
      );
    };

    return next(taskArguments);
  }

  /**
   * Gets a parameter by name.
   * @throws HardhatError if the parameter doesn't exist.
   */
  #getParameter(name: string): NamedTaskParameter | PositionalTaskParameter {
    const parameter =
      this.namedParameters.get(name) ??
      this.positionalParameters.find((p) => p.name === name);

    // Validate that the parameter exists
    if (parameter === undefined) {
      throw new HardhatError(
        HardhatError.ERRORS.ARGUMENTS.UNRECOGNIZED_NAMED_PARAM,
        {
          parameter: name,
        },
      );
    }

    return parameter;
  }

  /**
   * Validates that a required parameter has a value. A parameter is required if
   * it doesn't have a default value.
   * @throws HardhatError if the parameter is required and doesn't have a value.
   */
  #validateRequiredParameter(
    parameter: NamedTaskParameter | PositionalTaskParameter,
    value: unknown,
  ) {
    if (parameter.defaultValue === undefined && value === undefined) {
      throw new HardhatError(
        HardhatError.ERRORS.ARGUMENTS.MISSING_VALUE_FOR_PARAMETER,
        {
          paramName: parameter.name,
        },
      );
    }
  }

  /**
   * Validates that a parameter has the correct type. If the parameter is optional
   * and doesn't have a value, the type is not validated as it will be resolved
   * to the default value.
   *
   * @throws HardhatError if the parameter has an invalid type.
   */
  #validateParameterType(
    parameter: NamedTaskParameter | PositionalTaskParameter,
    value: unknown,
  ) {
    // skip type validation for optional parameters with undefined value
    if (value === undefined && parameter.defaultValue !== undefined) {
      return;
    }

    const isVariadic = "isVariadic" in parameter && parameter.isVariadic;
    if (!isParameterValueValid(parameter.parameterType, value, isVariadic)) {
      throw new Error( // TODO should be a HardhatError
        `Invalid type for parameter ${parameter.name} in task ${formatTaskId(this.id)}`,
      );
    }
  }

  /**
   * Resolves the action file for a task. The action file is imported and the
   * default export function is returned.
   *
   * @throws HardhatError if the module can't be imported or doesn't have a
   * default export function.
   */
  async #resolveFileAction(
    actionFileUrl: string,
    taskId: string[],
  ): Promise<NewTaskActionFunction | TaskOverrideActionFunction> {
    let resolvedActionFn;
    try {
      resolvedActionFn = await import(actionFileUrl);
    } catch (error) {
      // TODO: use HardhatError
      throw new Error(`Error importing the module`);
    }

    if (typeof resolvedActionFn.default !== "function") {
      // TODO: use HardhatError
      throw new Error(
        `The task ${formatTaskId(taskId)} has an invalid action file`,
      );
    }

    return resolvedActionFn.default;
  }
}
