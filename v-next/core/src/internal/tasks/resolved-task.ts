import type { ParameterValue } from "../../types/common.js";
import type { HardhatRuntimeEnvironment } from "../../types/hre.js";
import type {
  TaskOption,
  NewTaskActionFunction,
  PositionalTaskParameter,
  Task,
  TaskActions,
  TaskArguments,
  TaskOverrideActionFunction,
  TaskParameter,
} from "../../types/tasks.js";

import {
  HardhatError,
  assertHardhatInvariant,
} from "@nomicfoundation/hardhat-errors";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";

import { isParameterValueValid } from "../parameters.js";
import { detectPluginNpmDependencyProblems } from "../plugins/detect-plugin-npm-dependency-problems.js";

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
    options: Record<string, TaskOption>,
    positionalParameters: PositionalTaskParameter[],
    pluginId?: string,
  ): ResolvedTask {
    return new ResolvedTask(
      id,
      description,
      [{ pluginId, action }],
      new Map(Object.entries(options)),
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
    public readonly options: Map<string, TaskOption>,
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
      throw new HardhatError(HardhatError.ERRORS.TASK_DEFINITIONS.EMPTY_TASK, {
        task: formatTaskId(this.id),
      });
    }

    // Normalize parameters into a single iterable
    const allParameters: TaskParameter[] = [
      ...this.options.values(),
      ...this.positionalParameters,
    ];

    const providedArgumentNames = new Set(Object.keys(taskArguments));
    for (const parameter of allParameters) {
      const value = taskArguments[parameter.name];

      this.#validateRequiredParameter(parameter, value);
      this.#validateParameterType(parameter, value);

      // resolve defaults for optional parameters
      if (value === undefined && parameter.defaultValue !== undefined) {
        taskArguments[parameter.name] = parameter.defaultValue;
      }

      // Remove processed parameter from the set
      providedArgumentNames.delete(parameter.name);
    }

    // At this point, the set should be empty as all the task parameters have
    // been processed. If there are any extra parameters, an error is thrown
    this.#validateExtraArguments(providedArgumentNames);

    const next = async (
      nextTaskArguments: TaskArguments,
      currentIndex = this.actions.length - 1,
    ): Promise<any> => {
      // The first action may be empty if the task was originally an empty task
      const currentAction = this.actions[currentIndex].action ?? (() => {});
      const actionFn =
        typeof currentAction === "function"
          ? currentAction
          : await this.#resolveFileAction(
              currentAction,
              this.actions[currentIndex].pluginId,
            );

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
   * Validates that a required parameter has a value. A parameter is required if
   * it doesn't have a default value.
   *
   * @throws HardhatError if the parameter is required and doesn't have a value.
   */
  #validateRequiredParameter(
    parameter: TaskParameter,
    value: ParameterValue | ParameterValue[],
  ) {
    if (parameter.defaultValue === undefined && value === undefined) {
      throw new HardhatError(
        HardhatError.ERRORS.TASK_DEFINITIONS.MISSING_VALUE_FOR_PARAMETER,
        {
          parameter: parameter.name,
          task: formatTaskId(this.id),
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
    parameter: TaskParameter,
    value: ParameterValue | ParameterValue[],
  ) {
    // skip type validation for optional parameters with undefined value
    if (value === undefined && parameter.defaultValue !== undefined) {
      return;
    }

    // check if the parameter is variadic
    const isPositionalParameter = (
      param: TaskParameter,
    ): param is PositionalTaskParameter => "isVariadic" in param;
    const isVariadic = isPositionalParameter(parameter) && parameter.isVariadic;

    // check if the value is valid for the parameter type
    if (!isParameterValueValid(parameter.parameterType, value, isVariadic)) {
      throw new HardhatError(
        HardhatError.ERRORS.TASK_DEFINITIONS.INVALID_VALUE_FOR_TYPE,
        {
          value,
          name: parameter.name,
          type: parameter.parameterType,
          task: formatTaskId(this.id),
        },
      );
    }
  }

  /**
   * Validates that no extra arguments were provided in the task arguments.
   *
   * @throws HardhatError if extra arguments were provided. The error message
   * includes the name of the first extra argument.
   */
  #validateExtraArguments(providedArgumentNames: Set<string>) {
    if (providedArgumentNames.size > 0) {
      throw new HardhatError(
        HardhatError.ERRORS.TASK_DEFINITIONS.UNRECOGNIZED_NAMED_PARAM,
        {
          parameter: [...providedArgumentNames][0],
          task: formatTaskId(this.id),
        },
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
    actionPluginId?: string,
  ): Promise<NewTaskActionFunction | TaskOverrideActionFunction> {
    let resolvedActionFn;
    try {
      resolvedActionFn = await import(actionFileUrl);
    } catch (error) {
      ensureError(error);

      if (actionPluginId !== undefined) {
        const plugin = this.#hre.config.plugins.find(
          (p) => p.id === actionPluginId,
        );

        assertHardhatInvariant(
          plugin !== undefined,
          `Plugin with id ${actionPluginId} not found.`,
        );

        await detectPluginNpmDependencyProblems(plugin);
      }

      throw new HardhatError(
        HardhatError.ERRORS.TASK_DEFINITIONS.INVALID_ACTION_URL,
        {
          action: actionFileUrl,
          task: formatTaskId(this.id),
        },
        error,
      );
    }

    if (typeof resolvedActionFn.default !== "function") {
      throw new HardhatError(
        HardhatError.ERRORS.TASK_DEFINITIONS.INVALID_ACTION,
        {
          action: actionFileUrl,
          task: formatTaskId(this.id),
        },
      );
    }

    return resolvedActionFn.default;
  }
}
