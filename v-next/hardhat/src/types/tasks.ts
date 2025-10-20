import type {
  OptionDefinition,
  ArgumentType,
  ArgumentTypeToValueType,
  PositionalArgumentDefinition,
} from "./arguments.js";
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

/**
 * A type representing the concrete arguments of a task. That is,
 * the actual values passed to it.
 */
export type TaskArguments = Record<string, any>;

/**
 * The type of a new task's action function.
 *
 * This type doesn't have access to `runSuper`, as this task isn't overriding
 * another one.
 *
 * A TaskArgumentsT type parameter can be passed to obtain precise argument
 * types. This is useful within the `setAction` method of the task builder, as
 * it allows inferring the types of the action function's arguments.
 */
export type NewTaskActionFunction<
  TaskArgumentsT extends TaskArguments = TaskArguments,
> = (taskArguments: TaskArgumentsT, hre: HardhatRuntimeEnvironment) => any;

/**
 * The type of an override task's action function.
 *
 * This type has access to `runSuper`, which is a function that runs the
 * original task.
 *
 * A TaskArgumentsT type parameter can be passed to obtain precise argument
 * types. This is useful within the `setAction` method of the task builder, as
 * it allows inferring the types of the action function's arguments.
 */
export type TaskOverrideActionFunction<
  TaskArgumentsT extends TaskArguments = TaskArguments,
> = (
  taskArguments: TaskArgumentsT & TaskArguments,
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

  action: LazyActionObject<NewTaskActionFunction>;

  options: Record<string, OptionDefinition>;

  positionalArguments: PositionalArgumentDefinition[];
}

/**
 * An override of an existing task.
 */
export interface TaskOverrideDefinition {
  type: TaskDefinitionType.TASK_OVERRIDE;

  id: string[];

  description?: string;

  action: LazyActionObject<TaskOverrideActionFunction>;

  options: Record<string, OptionDefinition>;
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
 * This helper type adds an argument to an existing TaskArgumentsT.
 **/
export type ExtendTaskArguments<
  NameT extends string,
  TypeT extends ArgumentType | ArgumentType[],
  TaskArgumentsT extends TaskArguments,
> = Record<
  NameT,
  TypeT extends ArgumentType[]
    ? Array<ArgumentTypeToValueType<TypeT[number]>>
    : TypeT extends ArgumentType
      ? ArgumentTypeToValueType<TypeT>
      : never
> &
  TaskArgumentsT;

/**
 * A builder for creating EmptyTaskDefinitions.
 */
export interface EmptyTaskDefinitionBuilder {
  /**
   * Builds the EmptyTaskDefinition.
   */
  build(): EmptyTaskDefinition;
}

/**
 * A builder for creating NewTaskDefinitions.
 */
export interface NewTaskDefinitionBuilder<
  TaskArgumentsT extends TaskArguments = TaskArguments,
> {
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
  setAction(
    action: LazyActionObject<NewTaskActionFunction<TaskArgumentsT>>,
  ): this;

  /**
   * Adds an option to the task.
   *
   * A task option is one that is used as `--<name> value` in the CLI.
   *
   * The type of the argument defaults to `ArgumentType.STRING`.
   *
   * The default value should be of the same type as the argument.
   */
  addOption<
    NameT extends string,
    TypeT extends ArgumentType = ArgumentType.STRING,
  >(optionConfig: {
    name: NameT;
    shortName?: string;
    description?: string;
    type?: TypeT;
    defaultValue: ArgumentTypeToValueType<TypeT>;
    hidden?: boolean;
  }): NewTaskDefinitionBuilder<
    ExtendTaskArguments<NameT, TypeT, TaskArgumentsT>
  >;

  /**
   * Adds an option of flag type and default value false.
   */
  addFlag<NameT extends string>(flagConfig: {
    name: NameT;
    shortName?: string;
    description?: string;
  }): NewTaskDefinitionBuilder<
    ExtendTaskArguments<NameT, ArgumentType.FLAG, TaskArgumentsT>
  >;

  /**
   * Adds an option of level type and default value 0.
   */
  addLevel<NameT extends string>(flagConfig: {
    name: NameT;
    shortName?: string;
    description?: string;
    defaultValue?: number;
  }): NewTaskDefinitionBuilder<
    ExtendTaskArguments<NameT, ArgumentType.LEVEL, TaskArgumentsT>
  >;

  /**
   * Adds a positional argument to the task.
   *
   * A positional task argument is one that is used as `<value>` in the CLI,
   * and whose position matters. For example, `mv <from> <to>` has two
   * positional arguments.
   *
   * The type of the argument defaults to `ArgumentType.STRING`.
   *
   * The default value, if provided, should be of the same type as the
   * argument.
   *
   * Note that if a default value is provided, the argument is considered
   * optional, and any other positional arguments after it must also be
   * optional.
   */
  addPositionalArgument<
    NameT extends string,
    TypeT extends ArgumentType = ArgumentType.STRING,
  >(argConfig: {
    name: NameT;
    description?: string;
    type?: TypeT;
    defaultValue?: ArgumentTypeToValueType<TypeT>;
  }): NewTaskDefinitionBuilder<
    ExtendTaskArguments<NameT, TypeT, TaskArgumentsT>
  >;

  /**
   * Adds a variadic positional argument to the task.
   *
   * A variadic argument is a positional argument that can have multiple
   * values. For example, `cat <file1> <file2> <file3>` has a variadic argument
   * representing the files to print.
   *
   * The default value, if provided, must be an array whose elements are
   * of the same type as the argument. That is, `type` represents the type of
   * each element.
   *
   * Note that this argument must be the last positional argument. No other
   * positional argument can follow it, including variadic arguments.
   */
  addVariadicArgument<
    NameT extends string,
    TypeT extends ArgumentType = ArgumentType.STRING,
  >(argConfig: {
    name: NameT;
    description?: string;
    type?: TypeT;
    defaultValue?: Array<ArgumentTypeToValueType<TypeT>>;
  }): NewTaskDefinitionBuilder<
    ExtendTaskArguments<NameT, TypeT[], TaskArgumentsT>
  >;

  /**
   * Builds the NewTaskDefinition.
   */
  build(): NewTaskDefinition;
}

/**
 * A builder for overriding existing tasks.
 */
export interface TaskOverrideDefinitionBuilder<
  TaskArgumentsT extends TaskArguments = TaskArguments,
> {
  /**
   * Sets a new description for the task.
   */
  setDescription(description: string): this;

  /**
   * Sets a new action for the task.
   *
   * @see NewTaskDefinitionBuilder.setAction
   */
  setAction(
    action: LazyActionObject<TaskOverrideActionFunction<TaskArgumentsT>>,
  ): this;

  /**
   * Adds a new option to the task.
   *
   * @see NewTaskDefinitionBuilder.addOption
   */
  addOption<
    NameT extends string,
    TypeT extends ArgumentType = ArgumentType.STRING,
  >(optionConfig: {
    name: NameT;
    shortName?: string;
    description?: string;
    type?: TypeT;
    defaultValue: ArgumentTypeToValueType<TypeT>;
    hidden?: boolean;
  }): TaskOverrideDefinitionBuilder<
    ExtendTaskArguments<NameT, TypeT, TaskArgumentsT>
  >;

  /**
   * Adds an option of flag type and default value false.
   */
  addFlag<NameT extends string>(flagConfig: {
    name: NameT;
    shortName?: string;
    description?: string;
  }): TaskOverrideDefinitionBuilder<
    ExtendTaskArguments<NameT, ArgumentType.FLAG, TaskArgumentsT>
  >;

  /**
   * Adds an option of level type and default value 0.
   */
  addLevel<NameT extends string>(flagConfig: {
    name: NameT;
    shortName?: string;
    description?: string;
    defaultValue?: number;
  }): TaskOverrideDefinitionBuilder<
    ExtendTaskArguments<NameT, ArgumentType.LEVEL, TaskArgumentsT>
  >;

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
  {
    pluginId?: string;
    action?: LazyActionObject<NewTaskActionFunction>;
  },
  ...Array<{
    pluginId?: string;
    action: LazyActionObject<TaskOverrideActionFunction>;
  }>,
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
   * The task options.
   */
  options: Map<string, OptionDefinition>;

  /**
   * The task positional arguments.
   */
  positionalArguments: PositionalArgumentDefinition[];

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
  run(taskArguments?: TaskArguments): Promise<any>;
}

/**
 * A task manager is an object that manages the tasks of a Hardhat project. It
 * can be used to retrieve tasks and run them.
 */
export interface TaskManager {
  /**
   * Returns the root tasks of the task manager.
   */
  get rootTasks(): Map<string, Task>;
  /**
   * Returns a task by its id, throwing if it doesn't exist.
   */
  getTask(taskId: string | string[]): Task;
}

export type LazyActionObject<T> = () => Promise<{
  default: T;
}>;
