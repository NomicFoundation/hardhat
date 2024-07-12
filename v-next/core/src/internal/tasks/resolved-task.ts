import type {
  ArgumentValue,
  OptionDefinition,
  PositionalArgumentDefinition,
} from "../../types/arguments.js";
import type { HardhatRuntimeEnvironment } from "../../types/hre.js";
import type {
  NewTaskActionFunction,
  Task,
  TaskActions,
  TaskArguments,
  TaskOverrideActionFunction,
} from "../../types/tasks.js";

import {
  HardhatError,
  assertHardhatInvariant,
} from "@ignored/hardhat-vnext-errors";
import { ensureError } from "@ignored/hardhat-vnext-utils/error";

import { isArgumentValueValid } from "../arguments.js";
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
    options: Record<string, OptionDefinition>,
    positionalArguments: PositionalArgumentDefinition[],
    pluginId?: string,
  ): ResolvedTask {
    return new ResolvedTask(
      id,
      description,
      [{ pluginId, action }],
      new Map(Object.entries(options)),
      positionalArguments,
      pluginId,
      new Map(),
      hre,
    );
  }

  constructor(
    public readonly id: string[],
    public readonly description: string,
    public readonly actions: TaskActions,
    public readonly options: Map<string, OptionDefinition>,
    public readonly positionalArguments: PositionalArgumentDefinition[],
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
   * @throws HardhatError if the task is empty, a required argument is missing,
   * a argument has an invalid type, or the file actions can't be resolved.
   */
  public async run(taskArguments: TaskArguments): Promise<any> {
    if (this.isEmpty) {
      throw new HardhatError(HardhatError.ERRORS.TASK_DEFINITIONS.EMPTY_TASK, {
        task: formatTaskId(this.id),
      });
    }

    const providedArgumentNames = new Set(Object.keys(taskArguments));

    // Validate and resolve the task options
    for (const option of this.options.values()) {
      const value = taskArguments[option.name];

      this.#validateArgumentType(option, value);

      // resolve defaults for optional arguments
      if (value === undefined) {
        taskArguments[option.name] = option.defaultValue;
      }

      providedArgumentNames.delete(option.name);
    }

    // Validate and resolve the task positional arguments
    for (const argument of this.positionalArguments) {
      const value = taskArguments[argument.name];

      this.#validateRequiredArgument(argument, value);
      this.#validateArgumentType(argument, value, argument.isVariadic);

      // resolve defaults for optional arguments
      if (value === undefined && argument.defaultValue !== undefined) {
        taskArguments[argument.name] = argument.defaultValue;
      }

      providedArgumentNames.delete(argument.name);
    }

    // At this point, the set should be empty as all the task arguments have
    // been processed. If there are any extra arguments, an error is thrown
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
   * Validates that a required argument has a value. A argument is required if
   * it doesn't have a default value.
   *
   * @throws HardhatError if the argument is required and doesn't have a value.
   */
  #validateRequiredArgument(
    argument: PositionalArgumentDefinition,
    value: ArgumentValue | ArgumentValue[],
  ) {
    if (argument.defaultValue === undefined && value === undefined) {
      throw new HardhatError(
        HardhatError.ERRORS.TASK_DEFINITIONS.MISSING_VALUE_FOR_TASK_ARGUMENT,
        {
          argument: argument.name,
          task: formatTaskId(this.id),
        },
      );
    }
  }

  /**
   * Validates that a argument has the correct type. If the argument is optional
   * and doesn't have a value, the type is not validated as it will be resolved
   * to the default value.
   *
   * @throws HardhatError if the argument has an invalid type.
   */
  #validateArgumentType(
    argument: OptionDefinition | PositionalArgumentDefinition,
    value: ArgumentValue | ArgumentValue[],
    isVariadic: boolean = false,
  ) {
    // skip type validation for optional arguments with undefined value
    if (value === undefined && argument.defaultValue !== undefined) {
      return;
    }

    // check if the value is valid for the argument type
    if (!isArgumentValueValid(argument.type, value, isVariadic)) {
      throw new HardhatError(
        HardhatError.ERRORS.TASK_DEFINITIONS.INVALID_VALUE_FOR_TYPE,
        {
          value,
          name: argument.name,
          type: argument.type,
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
        HardhatError.ERRORS.TASK_DEFINITIONS.UNRECOGNIZED_TASK_OPTION,
        {
          option: [...providedArgumentNames][0],
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

        await detectPluginNpmDependencyProblems(
          plugin,
          this.#hre.config.paths.root,
        );
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
