import type {
  ArgumentValue,
  OptionDefinition,
  PositionalArgumentDefinition,
} from "../../../types/arguments.js";
import type { HardhatRuntimeEnvironment } from "../../../types/hre.js";
import type {
  NewTaskActionFunction,
  Task,
  TaskActions,
  TaskArguments,
  TaskOverrideActionFunction,
} from "../../../types/tasks.js";

import {
  HardhatError,
  assertHardhatInvariant,
} from "@ignored/hardhat-vnext-errors";
import { ensureError } from "@ignored/hardhat-vnext-utils/error";

import { SHOULD_WARN_ABOUT_INLINE_TASK_ACTIONS_AND_HOOK_HANDLERS } from "../inline-functions-warning.js";
import { detectPluginNpmDependencyProblems } from "../plugins/detect-plugin-npm-dependency-problems.js";

import { formatTaskId } from "./utils.js";
import { validateTaskArgumentValue } from "./validations.js";

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
  public async run(taskArguments: TaskArguments = {}): Promise<any> {
    if (this.isEmpty) {
      throw new HardhatError(HardhatError.ERRORS.TASK_DEFINITIONS.EMPTY_TASK, {
        task: formatTaskId(this.id),
      });
    }

    const providedArgumentNames = new Set(Object.keys(taskArguments));
    const argumentDefinitions = [
      ...this.options.values(),
      ...this.positionalArguments,
    ];
    const validatedTaskArguments: TaskArguments = {};
    for (const argumentDefinition of argumentDefinitions) {
      const value = taskArguments[argumentDefinition.name];
      const isPositional = "isVariadic" in argumentDefinition;

      if (isPositional) {
        this.#validateRequiredArgument(argumentDefinition, value);
      }

      if (value !== undefined) {
        validateTaskArgumentValue(
          argumentDefinition.name,
          argumentDefinition.type,
          value,
          isPositional && argumentDefinition.isVariadic,
          this.id,
        );
      }

      // resolve defaults for optional arguments
      validatedTaskArguments[argumentDefinition.name] =
        value ?? argumentDefinition.defaultValue;

      providedArgumentNames.delete(argumentDefinition.name);
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
      const pluginId = this.actions[currentIndex].pluginId;

      if (
        typeof currentAction === "function" &&
        pluginId !== undefined &&
        SHOULD_WARN_ABOUT_INLINE_TASK_ACTIONS_AND_HOOK_HANDLERS
      ) {
        console.warn(
          `WARNING: Inline task action found in plugin "${pluginId}" for task "${formatTaskId(this.id)}". Use file:// URLs in production.`,
        );
      }

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

    return next(validatedTaskArguments);
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
          this.#hre.config.paths.root,
          plugin,
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
