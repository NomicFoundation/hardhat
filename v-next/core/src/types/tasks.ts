import type {
  ParameterType,
  ParameterTypeToValueType,
  ParameterValue,
} from "./common.js";
import type { HardhatRuntimeEnvironment } from "./hre.js";

// We add the TaskManager to the HRE with a module augmentation to avoid
// introducing a circular dependency that would look like this:
// hre.ts -> tasks.ts -> hre.ts
declare module "./hre.js" {
  export interface HardhatRuntimeEnvironment {
    readonly tasks: TaskManager;
  }
}

// We add the tasks to the config types with a module augmentation to avoid
// introducing a circular dependency that would look like this:
// config.ts -> tasks.ts -> hre.ts -> config.ts
declare module "./config.js" {
  export interface HardhatUserConfig {
    tasks?: TaskDefinition[];
  }

  export interface HardhatConfig {
    tasks: TaskDefinition[];
  }
}

export interface TaskParameter<T extends ParameterType = ParameterType> {
  name: string;
  description: string;
  parameterType: T;
  defaultValue?:
    | ParameterTypeToValueType<T>
    | Array<ParameterTypeToValueType<T>>;
}

/**
 * A named task parameter is one that is used as `--<name> value` in the CLI.
 *
 * They have a name, description, type, and an optional default value.
 *
 * If the type is ParameterType.BOOLEAN, the default value is `false`, the
 * parameter is considered a flag, and can be used as `--<name>` to set it to
 * `true`.
 */
export interface NamedTaskParameter<T extends ParameterType = ParameterType>
  extends TaskParameter<T> {
  defaultValue?: ParameterTypeToValueType<T>;
}

/**
 * A positional task parameter is one that is used as `<value>` in the CLI, and whose
 * position matters. For example, `mv <from> <to>` has two positional parameters.
 *
 * If the parameter is variadic, it can have multiple values. A variadic parameter
 * can only be the last positional parameter, and it consumes all the remaining values.
 */
export interface PositionalTaskParameter<
  T extends ParameterType = ParameterType,
> extends TaskParameter<T> {
  isVariadic: boolean;
}

/**
 * A type representing the arguments or concrete parameters of a task. That is,
 * the actual values passed to it.
 */
export type TaskArguments = Record<string, ParameterValue | ParameterValue[]>;

/**
 * The type of a new task's action function.
 *
 * This type doesn't have access to `runSuper`, as this task isn't overriding
 * another one.
 */
export type NewTaskActionFunction = (
  taskArguments: TaskArguments,
  hre: HardhatRuntimeEnvironment,
) => any;

/**
 * The type of an override task's action function.
 *
 * This type has access to `runSuper`, which is a function that runs the
 * original task.
 */
export type TaskOverrideActionFunction = (
  taskArguments: TaskArguments,
  hre: HardhatRuntimeEnvironment,
  runSuper: (taskArguments: TaskArguments) => Promise<any>,
) => any;

/**
 * The different types of task definitions.
 */
export enum TaskDefinitionType {
  EMPTY_TASK = "EMPTY_TASK",
  NEW_TASK = "NEW_TASK",
  TASK_OVERRIDE = "TASK_OVERRIDE",
}

/**
 * Empty task definition. It is meant to be used as a placeholder task that only
 * prints information about its subtasks.
 *
 * For example, if you have the tasks `ignition deploy` and `ignition verify`,
 * but `ignition` itself doesn't do anything, you must define `ignition` as an
 * empty task.
 */
export interface EmptyTaskDefinition {
  type: TaskDefinitionType.EMPTY_TASK;
  id: string[];
  description: string;
}

/**
 * The definition of a new task.
 */
export interface NewTaskDefinition {
  type: TaskDefinitionType.NEW_TASK;

  id: string[];

  description: string;

  action: NewTaskActionFunction | string;

  namedParameters: Record<string, NamedTaskParameter>;

  positionalParameters: PositionalTaskParameter[];
}

/**
 * An override of an existing task.
 */
export interface TaskOverrideDefinition {
  type: TaskDefinitionType.TASK_OVERRIDE;

  id: string[];

  description?: string;

  action: TaskOverrideActionFunction | string;

  namedParameters: Record<string, NamedTaskParameter>;
}

/**
 * The definition of a task, as used in the plugins and user config. They are
 * declarative descriptions of the task, which are later processed to create the
 * actual `Task`s.
 */
export type TaskDefinition =
  | EmptyTaskDefinition
  | NewTaskDefinition
  | TaskOverrideDefinition;

/**
 * A builder for creating NewTaskDefinitions.
 */
export interface NewTaskDefinitionBuilder {
  /**
   * Sets the description of the task.
   */
  setDescription(description: string): this;

  /**
   * Sets the action of the task.
   *
   * It can be provided as a function, or as a `file://` URL pointing to a file
   * that exports a default NewTaskActionFunction.
   *
   * Note that plugins can only use the inline function form for development
   * purposes.
   */
  setAction(action: NewTaskActionFunction | string): this;

  /**
   * Adds a named parameter to the task.
   *
   * A named task parameter is one that is used as `--<name> value` in the CLI.
   *
   * If the type is `ParameterType.BOOLEAN`, the default value is `false`, the
   * parameter is considered a flag, and can be used as `--<name>` to set it to
   * `true`.
   *
   * The type of the parameter defaults to `ParameterType.STRING`.
   *
   * The default value, if provided, should be of the same type as the
   * parameter.
   */
  addNamedParameter<T extends ParameterType>(paramOptions: {
    name: string;
    description?: string;
    type?: T;
    defaultValue?: ParameterTypeToValueType<T>;
  }): this;

  /**
   * Adds a named parameter of boolean type and default value false.
   */
  addFlag(paramOptions: { name: string; description?: string }): this;

  /**
   * Adds a positional parameter to the task.
   *
   * A positional task parameter is one that is used as `<value>` in the CLI,
   * and whose position matters. For example, `mv <from> <to>` has two
   * positional parameters.
   *
   * The type of the parameter defaults to `ParameterType.STRING`.
   *
   * The default value, if provided, should be of the same type as the
   * parameter.
   *
   * Note that if a default value is provided, the parameter is considered
   * optional, and any other positional parameters after it must also be
   * optional.
   */
  addPositionalParameter<T extends ParameterType>(paramOptions: {
    name: string;
    description?: string;
    type?: T;
    defaultValue?: ParameterTypeToValueType<T>;
  }): this;

  /**
   * Adds a variadic positional parameter to the task.
   *
   * A variadic parameter is a positional parameter that can have multiple
   * values. For example, `cat <file1> <file2> <file3>` has a variadic parameter
   * representing the files to print.
   *
   * The default value, if provided, must be an array whose elements are
   * of the same type as the parameter. That is, `type` represents the type of
   * each element.
   *
   * Note that this parameter must be the last positional parameter. No other
   * positional parameter can follow it, including variadic parameters.
   */
  addVariadicParameter<T extends ParameterType>(paramOptions: {
    name: string;
    description?: string;
    type?: T;
    defaultValue?: Array<ParameterTypeToValueType<T>>;
  }): this;

  /**
   * Builds the NewTaskDefinition.
   */
  build(): NewTaskDefinition;
}

/**
 * A builder for overriding existing tasks.
 */
export interface TaskOverrideDefinitionBuilder {
  /**
   * Sets a new description for the task.
   */
  setDescription(description: string): this;

  /**
   * Sets a new action for the task.
   *
   * @see NewTaskDefinitionBuilder.setAction
   */
  setAction(action: TaskOverrideActionFunction | string): this;

  /**
   * Adds a new named parameter to the task.
   *
   * @see NewTaskDefinitionBuilder.addNamedParameter
   */
  addNamedParameter<T extends ParameterType>(paramOptions: {
    name: string;
    description?: string;
    type?: T;
    defaultValue?: ParameterTypeToValueType<T>;
  }): this;

  /**
   * Adds a named parameter of boolean type and default value false.
   */
  addFlag(paramOptions: { name: string; description?: string }): this;

  /**
   * Builds the TaskOverrideDefinition.
   */
  build(): TaskOverrideDefinition;
}

/**
 * The actions associated to the task, in order.
 *
 * Each of them has the pluginId of the plugin that defined it, if any, and the
 * action itself.
 *
 * Note that the first action is a `NewTaskActionFunction`, `string`, or
 * `undefined`. `undefined` is only used for empty tasks.
 *
 * The rest of the actions always have a `TaskOverrideActionFunction` or a
 * `string`.
 */
export type TaskActions = [
  { pluginId?: string; action?: NewTaskActionFunction | string },
  ...Array<{ pluginId?: string; action: TaskOverrideActionFunction | string }>,
];

/**
 * A task.
 */
export interface Task {
  /**
   * The task id.
   */
  id: string[];

  /**
   * The task description.
   */
  description: string;

  /**
   * The task actions, in definition order.
   */
  actions: TaskActions;

  /**
   * The task named parameters.
   */
  namedParameters: Map<string, NamedTaskParameter>;

  /**
   * The task positional parameters.
   */
  positionalParameters: PositionalTaskParameter[];

  /**
   * Whether the task is an empty task.
   */
  isEmpty: boolean;

  /**
   * The plugin that defined the task, if any.
   */
  pluginId?: string;

  /**
   * The subtasks of this task.
   */
  subtasks: Map<string, Task>;

  /**
   * Runs a task.
   */
  run(taskArguments: TaskArguments): Promise<any>;
}

/**
 * A task manager is an object that manages the tasks of a Hardhat project. It
 * can be used to retrieve tasks and run them.
 */
export interface TaskManager {
  /**
   * Returns a task by its id, throwing if it doesn't exist.
   */
  getTask(taskId: string | string[]): Task;
}
