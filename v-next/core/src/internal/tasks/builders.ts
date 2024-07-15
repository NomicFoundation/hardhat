import type {
  ArgumentTypeToValueType,
  OptionDefinition,
  PositionalArgumentDefinition,
} from "../../types/arguments.js";
import type {
  NewTaskActionFunction,
  NewTaskDefinitionBuilder,
  NewTaskDefinition,
  TaskOverrideActionFunction,
  TaskOverrideDefinitionBuilder,
  TaskOverrideDefinition,
  EmptyTaskDefinitionBuilder,
  EmptyTaskDefinition,
} from "../../types/tasks.js";

import { HardhatError } from "@ignored/hardhat-vnext-errors";

import { ArgumentType } from "../../types/arguments.js";
import { TaskDefinitionType } from "../../types/tasks.js";

import { formatTaskId } from "./utils.js";
import {
  validateAction,
  validateId,
  validateOption,
  validatePositionalArgument,
} from "./validations.js";

export class EmptyTaskDefinitionBuilderImplementation
  implements EmptyTaskDefinitionBuilder
{
  readonly #id: string[];

  #description: string;

  constructor(id: string | string[], description: string = "") {
    validateId(id);

    this.#id = Array.isArray(id) ? id : [id];
    this.#description = description;
  }

  public setDescription(description: string): this {
    this.#description = description;
    return this;
  }

  public build(): EmptyTaskDefinition {
    return {
      type: TaskDefinitionType.EMPTY_TASK,
      id: this.#id,
      description: this.#description,
    };
  }
}

export class NewTaskDefinitionBuilderImplementation
  implements NewTaskDefinitionBuilder
{
  readonly #id: string[];
  readonly #usedNames: Set<string> = new Set();

  readonly #options: Record<string, OptionDefinition> = {};
  readonly #positionalArgs: PositionalArgumentDefinition[] = [];

  #description: string;

  #action?: NewTaskActionFunction | string;

  constructor(id: string | string[], description: string = "") {
    validateId(id);

    this.#id = Array.isArray(id) ? id : [id];
    this.#description = description;
  }

  public setDescription(description: string): this {
    this.#description = description;
    return this;
  }

  public setAction(action: NewTaskActionFunction | string): this {
    validateAction(action);

    this.#action = action;

    return this;
  }

  public addOption<T extends ArgumentType>({
    name,
    description = "",
    type,
    defaultValue,
  }: {
    name: string;
    description?: string;
    type?: T;
    defaultValue: ArgumentTypeToValueType<T>;
  }): this {
    const argumentType = type ?? ArgumentType.STRING;

    const optionDefinition = {
      name,
      description,
      type: argumentType,
      defaultValue,
    };

    validateOption(optionDefinition, this.#usedNames, this.#id);

    this.#options[name] = optionDefinition;

    return this;
  }

  public addFlag(flagConfig: { name: string; description?: string }): this {
    return this.addOption({
      ...flagConfig,
      type: ArgumentType.BOOLEAN,
      defaultValue: false,
    });
  }

  public addPositionalArgument<T extends ArgumentType>(argConfig: {
    name: string;
    description?: string;
    type?: T;
    defaultValue?: ArgumentTypeToValueType<T>;
  }): this {
    return this.#addPositionalArgument({
      ...argConfig,
      isVariadic: false,
    });
  }

  public addVariadicArgument<T extends ArgumentType>(argConfig: {
    name: string;
    description?: string;
    type?: T;
    defaultValue?: Array<ArgumentTypeToValueType<T>>;
  }): this {
    return this.#addPositionalArgument({
      ...argConfig,
      isVariadic: true,
    });
  }

  public build(): NewTaskDefinition {
    if (this.#action === undefined) {
      throw new HardhatError(HardhatError.ERRORS.TASK_DEFINITIONS.NO_ACTION, {
        task: formatTaskId(this.#id),
      });
    }

    return {
      type: TaskDefinitionType.NEW_TASK,
      id: this.#id,
      description: this.#description,
      action: this.#action,
      options: this.#options,
      positionalArguments: this.#positionalArgs,
    };
  }

  #addPositionalArgument<T extends ArgumentType>({
    name,
    description = "",
    type,
    defaultValue,
    isVariadic,
  }: {
    name: string;
    description?: string;
    type?: T;
    defaultValue?:
      | ArgumentTypeToValueType<T>
      | Array<ArgumentTypeToValueType<T>>;
    isVariadic: boolean;
  }): this {
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

export class TaskOverrideDefinitionBuilderImplementation
  implements TaskOverrideDefinitionBuilder
{
  readonly #id: string[];

  readonly #options: Record<string, OptionDefinition> = {};

  #description?: string;

  #action?: TaskOverrideActionFunction | string;

  constructor(id: string | string[]) {
    validateId(id);

    this.#id = Array.isArray(id) ? id : [id];
  }

  public setDescription(description: string): this {
    this.#description = description;
    return this;
  }

  public setAction(action: TaskOverrideActionFunction | string): this {
    validateAction(action);

    this.#action = action;

    return this;
  }

  public addOption<T extends ArgumentType>({
    name,
    description = "",
    type,
    defaultValue,
  }: {
    name: string;
    description?: string;
    type?: T;
    defaultValue: ArgumentTypeToValueType<T>;
  }): this {
    const argumentType = type ?? ArgumentType.STRING;

    const optionDefinition = {
      name,
      description,
      type: argumentType,
      defaultValue,
    };

    validateOption(
      optionDefinition,
      new Set(Object.keys(this.#options)),
      this.#id,
    );

    this.#options[name] = optionDefinition;

    return this;
  }

  public addFlag(flagConfig: { name: string; description?: string }): this {
    return this.addOption({
      ...flagConfig,
      type: ArgumentType.BOOLEAN,
      defaultValue: false,
    });
  }

  public build(): TaskOverrideDefinition {
    if (this.#action === undefined) {
      throw new HardhatError(HardhatError.ERRORS.TASK_DEFINITIONS.NO_ACTION, {
        task: formatTaskId(this.#id),
      });
    }

    return {
      type: TaskDefinitionType.TASK_OVERRIDE,
      id: this.#id,
      description: this.#description,
      action: this.#action,
      options: this.#options,
    };
  }
}
