import type {
  ArgumentTypeToValueType,
  OptionDefinition,
  PositionalArgumentDefinition,
} from "../../../types/arguments.js";
import type {
  NewTaskActionFunction,
  NewTaskDefinitionBuilder,
  NewTaskDefinition,
  TaskOverrideActionFunction,
  TaskOverrideDefinitionBuilder,
  TaskOverrideDefinition,
  EmptyTaskDefinitionBuilder,
  EmptyTaskDefinition,
  ExtendTaskArguments,
  TaskArguments,
  LazyActionObject,
  TaskAction,
  TaskOverrideAction,
  NewTaskDefinitionPlugin,
  TaskOverrideDefinitionPlugin,
  BuildReturnType,
  MissingActionState,
  ActionDefinedState,
} from "../../../types/tasks.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

import { ArgumentType } from "../../../types/arguments.js";
import { TaskDefinitionType } from "../../../types/tasks.js";

import { formatTaskId } from "./utils.js";
import {
  validateId,
  validateOption,
  validatePositionalArgument,
} from "./validations.js";

export class EmptyTaskDefinitionBuilderImplementation
  implements EmptyTaskDefinitionBuilder
{
  readonly #id: string[];

  readonly #description: string;

  constructor(id: string | string[], description: string = "") {
    validateId(id);

    this.#id = Array.isArray(id) ? id : [id];
    this.#description = description;
  }

  public build(): EmptyTaskDefinition {
    return {
      type: TaskDefinitionType.EMPTY_TASK,
      id: this.#id,
      description: this.#description,
    };
  }
}

export class NewTaskDefinitionBuilderImplementation<
  TaskArgumentsT extends TaskArguments = TaskArguments,
  ActionStateT extends
    | MissingActionState
    | ActionDefinedState = MissingActionState,
  ActionTypeT extends "FILE" | "INLINE" | "NONE" = "NONE",
> implements
    NewTaskDefinitionBuilder<TaskArgumentsT, ActionStateT, ActionTypeT>
{
  public readonly isActionDefined!: ActionStateT;

  readonly #id: string[];
  readonly #usedNames: Set<string> = new Set();

  readonly #options: Record<string, OptionDefinition> = {};
  readonly #positionalArgs: PositionalArgumentDefinition[] = [];

  #description: string;

  #action?: LazyActionObject<NewTaskActionFunction<TaskArgumentsT>>;
  #inlineAction?: NewTaskActionFunction<TaskArgumentsT>;

  constructor(id: string | string[], description: string = "") {
    validateId(id);

    this.#id = Array.isArray(id) ? id : [id];
    this.#description = description;
  }

  public setDescription(description: string): this {
    this.#description = description;
    return this;
  }

  public setAction(
    action: LazyActionObject<NewTaskActionFunction<TaskArgumentsT>>,
  ): NewTaskDefinitionBuilder<TaskArgumentsT, ActionDefinedState, "FILE"> {
    if (this.#inlineAction !== undefined) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.TASK_DEFINITIONS.ACTION_AND_INLINE_ACTION_CONFLICT,
        {
          task: formatTaskId(this.#id),
        },
      );
    }

    this.#action = action;

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    -- Cast to update the builder state, ensuring via the interface constraints that setAction or
    setInlineAction cannot be called again. It also set the action type to FILE or INLINE. */
    return this as NewTaskDefinitionBuilder<
      TaskArgumentsT,
      ActionDefinedState,
      "FILE"
    >;
  }

  public setInlineAction(
    inlineAction: NewTaskActionFunction<TaskArgumentsT>,
  ): NewTaskDefinitionBuilder<TaskArgumentsT, ActionDefinedState, "INLINE"> {
    if (this.#action !== undefined) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.TASK_DEFINITIONS.ACTION_AND_INLINE_ACTION_CONFLICT,
        {
          task: formatTaskId(this.#id),
        },
      );
    }

    this.#inlineAction = inlineAction;

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    -- Cast to update the builder state, ensuring via the interface constraints that setAction or
    setInlineAction cannot be called again. It also set the action type to FILE or INLINE. */
    return this as NewTaskDefinitionBuilder<
      TaskArgumentsT,
      ActionDefinedState,
      "INLINE"
    >;
  }

  public addOption<
    NameT extends string,
    TypeT extends ArgumentType = ArgumentType.STRING,
  >({
    name,
    shortName,
    description = "",
    type,
    defaultValue,
    hidden,
  }: {
    name: NameT;
    shortName?: string;
    description?: string;
    type?: TypeT;
    defaultValue: ArgumentTypeToValueType<TypeT>;
    hidden?: boolean;
  }): NewTaskDefinitionBuilder<
    ExtendTaskArguments<NameT, TypeT, TaskArgumentsT>,
    ActionStateT,
    ActionTypeT
  > {
    const argumentType = type ?? ArgumentType.STRING;

    const optionDefinition = {
      name,
      shortName,
      description,
      type: argumentType,
      defaultValue,
      hidden,
    };

    validateOption(optionDefinition, this.#usedNames, this.#id);

    this.#options[name] = optionDefinition;

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    -- Cast to update the generic argument types. Explicitly propagate 'ActionStateT' and
    'ActionTypeT' to preserve the current state (whether an action is defined or not,
    and if it is file-based or inline) for subsequent method calls. */
    return this as NewTaskDefinitionBuilder<
      ExtendTaskArguments<NameT, TypeT, TaskArgumentsT>,
      ActionStateT,
      ActionTypeT
    >;
  }

  public addFlag<NameT extends string>(flagConfig: {
    name: NameT;
    shortName?: string;
    description?: string;
    hidden?: boolean;
  }): NewTaskDefinitionBuilder<
    ExtendTaskArguments<NameT, ArgumentType.FLAG, TaskArgumentsT>,
    ActionStateT,
    ActionTypeT
  > {
    return this.addOption({
      ...flagConfig,
      type: ArgumentType.FLAG,
      defaultValue: false,
      hidden: flagConfig.hidden,
    });
  }

  public addLevel<NameT extends string>(levelConfig: {
    name: NameT;
    shortName?: string;
    description?: string;
    defaultValue?: number;
  }): NewTaskDefinitionBuilder<
    ExtendTaskArguments<NameT, ArgumentType.LEVEL, TaskArgumentsT>,
    ActionStateT,
    ActionTypeT
  > {
    return this.addOption({
      ...levelConfig,
      type: ArgumentType.LEVEL,
      defaultValue: levelConfig.defaultValue ?? 0,
    });
  }

  public addPositionalArgument<
    NameT extends string,
    TypeT extends ArgumentType = ArgumentType.STRING,
  >(argConfig: {
    name: NameT;
    description?: string;
    type?: TypeT;
    defaultValue?: ArgumentTypeToValueType<TypeT>;
  }): NewTaskDefinitionBuilder<
    ExtendTaskArguments<NameT, TypeT, TaskArgumentsT>,
    ActionStateT,
    ActionTypeT
  > {
    return this.#addPositionalArgument({
      ...argConfig,
      isVariadic: false,
    });
  }

  public addVariadicArgument<
    NameT extends string,
    TypeT extends ArgumentType = ArgumentType.STRING,
  >(argConfig: {
    name: NameT;
    description?: string;
    type?: TypeT;
    defaultValue?: Array<ArgumentTypeToValueType<TypeT>>;
  }): NewTaskDefinitionBuilder<
    ExtendTaskArguments<NameT, TypeT, TaskArgumentsT>,
    ActionStateT,
    ActionTypeT
  > {
    return this.#addPositionalArgument({
      ...argConfig,
      isVariadic: true,
    });
  }

  public build(): BuildReturnType<
    NewTaskDefinition,
    ActionTypeT,
    NewTaskDefinitionPlugin
  > {
    if (this.#action === undefined && this.#inlineAction === undefined) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.TASK_DEFINITIONS.NO_ACTION,
        {
          task: formatTaskId(this.#id),
        },
      );
    }

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    -- Cast the return value because TypeScript cannot verify that the object matches
    the conditional type `BuildReturnType` while the `ActionTypeT` generic remains unresolved. */
    return {
      type: TaskDefinitionType.NEW_TASK,
      id: this.#id,
      description: this.#description,
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- The type of the action is narrowed in the setAction function or setInlineAction to
      improve the argument types. Once the task is built, we use the more
      general type to avoid having to parameterize the NewTaskDefinition */
      ...((this.#action !== undefined
        ? { action: this.#action }
        : { inlineAction: this.#inlineAction }) as TaskAction),
      options: this.#options,
      positionalArguments: this.#positionalArgs,
    } as BuildReturnType<
      NewTaskDefinition,
      ActionTypeT,
      NewTaskDefinitionPlugin
    >;
  }

  #addPositionalArgument<
    NameT extends string,
    TypeT extends ArgumentType = ArgumentType.STRING,
  >({
    name,
    description = "",
    type,
    defaultValue,
    isVariadic,
  }: {
    name: NameT;
    description?: string;
    type?: TypeT;
    defaultValue?:
      | ArgumentTypeToValueType<TypeT>
      | Array<ArgumentTypeToValueType<TypeT>>;
    isVariadic: boolean;
  }): NewTaskDefinitionBuilder<
    ExtendTaskArguments<NameT, TypeT, TaskArgumentsT>,
    ActionStateT,
    ActionTypeT
  > {
    const argumentType = type ?? ArgumentType.STRING;

    const positionalArgDef = {
      name,
      description,
      type: argumentType,
      defaultValue,
      isVariadic,
    };

    const lastArg = this.#positionalArgs.at(-1);
    validatePositionalArgument(
      positionalArgDef,
      this.#usedNames,
      this.#id,
      lastArg,
    );

    this.#positionalArgs.push(positionalArgDef);

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    -- Cast to update the generic argument types. Explicitly propagate 'ActionStateT' and
    'ActionTypeT' to preserve the current state (whether an action is defined or not,
    and if it is file-based or inline) for subsequent method calls. */
    return this as NewTaskDefinitionBuilder<
      ExtendTaskArguments<NameT, TypeT, TaskArgumentsT>,
      ActionStateT,
      ActionTypeT
    >;
  }
}

export class TaskOverrideDefinitionBuilderImplementation<
  TaskArgumentsT extends TaskArguments = TaskArguments,
  ActionStateT extends
    | MissingActionState
    | ActionDefinedState = MissingActionState,
  ActionTypeT extends "FILE" | "INLINE" | "NONE" = "NONE",
> implements
    TaskOverrideDefinitionBuilder<TaskArgumentsT, ActionStateT, ActionTypeT>
{
  public readonly isActionDefined!: ActionStateT;

  readonly #id: string[];

  readonly #options: Record<string, OptionDefinition> = {};

  #description?: string;

  #action?: LazyActionObject<TaskOverrideActionFunction<TaskArgumentsT>>;
  #inlineAction?: TaskOverrideActionFunction<TaskArgumentsT>;

  constructor(id: string | string[]) {
    validateId(id);

    this.#id = Array.isArray(id) ? id : [id];
  }

  public setDescription(description: string): this {
    this.#description = description;
    return this;
  }

  public setAction(
    action: LazyActionObject<TaskOverrideActionFunction<TaskArgumentsT>>,
  ): TaskOverrideDefinitionBuilder<TaskArgumentsT, ActionDefinedState, "FILE"> {
    if (this.#inlineAction !== undefined) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.TASK_DEFINITIONS.ACTION_AND_INLINE_ACTION_CONFLICT,
        {
          task: formatTaskId(this.#id),
        },
      );
    }

    this.#action = action;

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    -- Cast to update the builder state, ensuring via the interface constraints that setAction or
    setInlineAction cannot be called again. It also set the action type to FILE or INLINE. */
    return this as TaskOverrideDefinitionBuilder<
      TaskArgumentsT,
      ActionDefinedState,
      "FILE"
    >;
  }

  public setInlineAction(
    inlineAction: TaskOverrideActionFunction<TaskArgumentsT>,
  ): TaskOverrideDefinitionBuilder<
    TaskArgumentsT,
    ActionDefinedState,
    "INLINE"
  > {
    if (this.#action !== undefined) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.TASK_DEFINITIONS.ACTION_AND_INLINE_ACTION_CONFLICT,
        {
          task: formatTaskId(this.#id),
        },
      );
    }

    this.#inlineAction = inlineAction;

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    -- Cast to update the builder state, ensuring via the interface constraints that setAction or
    setInlineAction cannot be called again. It also set the action type to FILE or INLINE. */
    return this as TaskOverrideDefinitionBuilder<
      TaskArgumentsT,
      ActionDefinedState,
      "INLINE"
    >;
  }

  public addOption<
    NameT extends string,
    TypeT extends ArgumentType = ArgumentType.STRING,
  >({
    name,
    shortName,
    description = "",
    type,
    defaultValue,
    hidden,
  }: {
    name: NameT;
    shortName?: string;
    description?: string;
    type?: TypeT;
    defaultValue: ArgumentTypeToValueType<TypeT>;
    hidden?: boolean;
  }): TaskOverrideDefinitionBuilder<
    ExtendTaskArguments<NameT, TypeT, TaskArgumentsT>,
    ActionStateT,
    ActionTypeT
  > {
    const argumentType = type ?? ArgumentType.STRING;

    const optionDefinition = {
      name,
      shortName,
      description,
      type: argumentType,
      defaultValue,
      hidden,
    };

    const usedNames = new Set<string>();
    for (const option of Object.values(this.#options)) {
      usedNames.add(option.name);
      if (option.shortName !== undefined) {
        usedNames.add(option.shortName);
      }
    }

    validateOption(optionDefinition, usedNames, this.#id);

    this.#options[name] = optionDefinition;

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    -- Cast to update the generic argument types. Explicitly propagate 'ActionStateT' and
    'ActionTypeT' to preserve the current state (whether an action is defined or not,
    and if it is file-based or inline) for subsequent method calls. */
    return this as TaskOverrideDefinitionBuilder<
      ExtendTaskArguments<NameT, TypeT, TaskArgumentsT>,
      ActionStateT,
      ActionTypeT
    >;
  }

  public addFlag<NameT extends string>(flagConfig: {
    name: NameT;
    shortName?: string;
    description?: string;
    hidden?: boolean;
  }): TaskOverrideDefinitionBuilder<
    ExtendTaskArguments<NameT, ArgumentType.FLAG, TaskArgumentsT>,
    ActionStateT,
    ActionTypeT
  > {
    return this.addOption({
      ...flagConfig,
      type: ArgumentType.FLAG,
      defaultValue: false,
      hidden: flagConfig.hidden,
    });
  }

  public addLevel<NameT extends string>(levelConfig: {
    name: NameT;
    shortName?: string;
    description?: string;
    defaultValue?: number;
  }): TaskOverrideDefinitionBuilder<
    ExtendTaskArguments<NameT, ArgumentType.LEVEL, TaskArgumentsT>,
    ActionStateT,
    ActionTypeT
  > {
    return this.addOption({
      ...levelConfig,
      type: ArgumentType.LEVEL,
      defaultValue: levelConfig.defaultValue ?? 0,
    });
  }

  public build(): BuildReturnType<
    TaskOverrideDefinition,
    ActionTypeT,
    TaskOverrideDefinitionPlugin
  > {
    if (this.#action === undefined && this.#inlineAction === undefined) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.TASK_DEFINITIONS.NO_ACTION,
        {
          task: formatTaskId(this.#id),
        },
      );
    }

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    -- Cast the return value because TypeScript cannot verify that the object matches
    the conditional type `BuildReturnType` while the `ActionTypeT` generic remains unresolved. */
    return {
      type: TaskDefinitionType.TASK_OVERRIDE,
      id: this.#id,
      description: this.#description,
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- The type of the action is narrowed in the setAction function or setInlineAction to
      improve the argument types. Once the task is built, we use the more
      general type to avoid having to parameterize the TaskOverrideDefinition */
      ...((this.#action !== undefined
        ? {
            action: this.#action,
          }
        : {
            inlineAction: this.#inlineAction,
          }) as TaskOverrideAction),
      options: this.#options,
    } as BuildReturnType<
      TaskOverrideDefinition,
      ActionTypeT,
      TaskOverrideDefinitionPlugin
    >;
  }
}
