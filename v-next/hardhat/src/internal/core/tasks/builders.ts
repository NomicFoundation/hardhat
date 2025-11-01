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
> implements NewTaskDefinitionBuilder<TaskArgumentsT>
{
  readonly #id: string[];
  readonly #usedNames: Set<string> = new Set();

  readonly #options: Record<string, OptionDefinition> = {};
  readonly #positionalArgs: PositionalArgumentDefinition[] = [];

  #description: string;

  #action?: LazyActionObject<NewTaskActionFunction<TaskArgumentsT>>;

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
  ): this {
    this.#action = action;

    return this;
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
    ExtendTaskArguments<NameT, TypeT, TaskArgumentsT>
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

    return this;
  }

  public addFlag<NameT extends string>(flagConfig: {
    name: NameT;
    shortName?: string;
    description?: string;
    hidden?: boolean;
  }): NewTaskDefinitionBuilder<
    ExtendTaskArguments<NameT, ArgumentType.FLAG, TaskArgumentsT>
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
    ExtendTaskArguments<NameT, ArgumentType.LEVEL, TaskArgumentsT>
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
    ExtendTaskArguments<NameT, TypeT, TaskArgumentsT>
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
    ExtendTaskArguments<NameT, TypeT, TaskArgumentsT>
  > {
    return this.#addPositionalArgument({
      ...argConfig,
      isVariadic: true,
    });
  }

  public build(): NewTaskDefinition {
    if (this.#action === undefined) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.TASK_DEFINITIONS.NO_ACTION,
        {
          task: formatTaskId(this.#id),
        },
      );
    }

    return {
      type: TaskDefinitionType.NEW_TASK,
      id: this.#id,
      description: this.#description,
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- The type of the action is narrowed in the setAction function to
      improve the argument types. Once the task is built, we use the more
      general type to avoid having to parameterize the NewTaskDefinition */
      action: this.#action as LazyActionObject<NewTaskActionFunction>,
      options: this.#options,
      positionalArguments: this.#positionalArgs,
    };
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
    ExtendTaskArguments<NameT, TypeT, TaskArgumentsT>
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

    return this;
  }
}

export class TaskOverrideDefinitionBuilderImplementation<
  TaskArgumentsT extends TaskArguments = TaskArguments,
> implements TaskOverrideDefinitionBuilder<TaskArgumentsT>
{
  readonly #id: string[];

  readonly #options: Record<string, OptionDefinition> = {};

  #description?: string;

  #action?: LazyActionObject<TaskOverrideActionFunction<TaskArgumentsT>>;

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
  ): this {
    this.#action = action;

    return this;
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
  }: {
    name: NameT;
    shortName?: string;
    description?: string;
    type?: TypeT;
    defaultValue: ArgumentTypeToValueType<TypeT>;
  }): TaskOverrideDefinitionBuilder<
    ExtendTaskArguments<NameT, TypeT, TaskArgumentsT>
  > {
    const argumentType = type ?? ArgumentType.STRING;

    const optionDefinition = {
      name,
      shortName,
      description,
      type: argumentType,
      defaultValue,
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

    return this;
  }

  public addFlag<NameT extends string>(flagConfig: {
    name: string;
    shortName?: string;
    description?: string;
  }): TaskOverrideDefinitionBuilder<
    ExtendTaskArguments<NameT, ArgumentType.FLAG, TaskArgumentsT>
  > {
    return this.addOption({
      ...flagConfig,
      type: ArgumentType.FLAG,
      defaultValue: false,
    });
  }

  public addLevel<NameT extends string>(levelConfig: {
    name: string;
    shortName?: string;
    description?: string;
    defaultValue?: number;
  }): TaskOverrideDefinitionBuilder<
    ExtendTaskArguments<NameT, ArgumentType.LEVEL, TaskArgumentsT>
  > {
    return this.addOption({
      ...levelConfig,
      type: ArgumentType.LEVEL,
      defaultValue: levelConfig.defaultValue ?? 0,
    });
  }

  public build(): TaskOverrideDefinition {
    if (this.#action === undefined) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.TASK_DEFINITIONS.NO_ACTION,
        {
          task: formatTaskId(this.#id),
        },
      );
    }

    return {
      type: TaskDefinitionType.TASK_OVERRIDE,
      id: this.#id,
      description: this.#description,
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- The type of the action is narrowed in the setAction function to
      improve the argument types. Once the task is built, we use the more
      general type to avoid having to parameterize the TaskOverrideDefinition */
      action: this.#action as LazyActionObject<TaskOverrideActionFunction>,
      options: this.#options,
    };
  }
}
