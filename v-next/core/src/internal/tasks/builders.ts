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
import {
  RESERVED_ARGUMENT_NAMES,
  isArgumentValueValid,
  isArgumentNameValid,
} from "../arguments.js";

import { formatTaskId, isValidActionUrl } from "./utils.js";

export class EmptyTaskDefinitionBuilderImplementation
  implements EmptyTaskDefinitionBuilder
{
  readonly #id: string[];

  #description: string;

  constructor(id: string | string[], description: string = "") {
    if (id.length === 0) {
      throw new HardhatError(
        HardhatError.ERRORS.TASK_DEFINITIONS.EMPTY_TASK_ID,
      );
    }

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
    if (id.length === 0) {
      throw new HardhatError(
        HardhatError.ERRORS.TASK_DEFINITIONS.EMPTY_TASK_ID,
      );
    }

    this.#id = Array.isArray(id) ? id : [id];
    this.#description = description;
  }

  public setDescription(description: string): this {
    this.#description = description;
    return this;
  }

  public setAction(action: NewTaskActionFunction | string): this {
    if (typeof action === "string" && !isValidActionUrl(action)) {
      throw new HardhatError(
        HardhatError.ERRORS.TASK_DEFINITIONS.INVALID_FILE_ACTION,
        {
          action,
        },
      );
    }

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

    if (!isArgumentNameValid(name)) {
      throw new HardhatError(HardhatError.ERRORS.ARGUMENTS.INVALID_NAME, {
        name,
      });
    }

    if (this.#usedNames.has(name)) {
      throw new HardhatError(HardhatError.ERRORS.ARGUMENTS.DUPLICATED_NAME, {
        name,
      });
    }

    if (RESERVED_ARGUMENT_NAMES.has(name)) {
      throw new HardhatError(HardhatError.ERRORS.ARGUMENTS.RESERVED_NAME, {
        name,
      });
    }

    if (!isArgumentValueValid(argumentType, defaultValue)) {
      throw new HardhatError(
        HardhatError.ERRORS.TASK_DEFINITIONS.INVALID_VALUE_FOR_TYPE,
        {
          value: defaultValue,
          name: "defaultValue",
          type: argumentType,
          task: formatTaskId(this.#id),
        },
      );
    }

    this.#usedNames.add(name);

    this.#options[name] = {
      name,
      description,
      type: argumentType,
      defaultValue,
    };

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

    if (!isArgumentNameValid(name)) {
      throw new HardhatError(HardhatError.ERRORS.ARGUMENTS.INVALID_NAME, {
        name,
      });
    }

    if (this.#usedNames.has(name)) {
      throw new HardhatError(HardhatError.ERRORS.ARGUMENTS.DUPLICATED_NAME, {
        name,
      });
    }

    if (RESERVED_ARGUMENT_NAMES.has(name)) {
      throw new HardhatError(HardhatError.ERRORS.ARGUMENTS.RESERVED_NAME, {
        name,
      });
    }

    if (defaultValue !== undefined) {
      if (!isArgumentValueValid(argumentType, defaultValue, isVariadic)) {
        throw new HardhatError(
          HardhatError.ERRORS.TASK_DEFINITIONS.INVALID_VALUE_FOR_TYPE,
          {
            value: defaultValue,
            name: "defaultValue",
            type: argumentType,
            task: formatTaskId(this.#id),
          },
        );
      }
    }

    if (this.#positionalArgs.length > 0) {
      const lastArg = this.#positionalArgs[this.#positionalArgs.length - 1];

      if (lastArg.isVariadic) {
        throw new HardhatError(
          HardhatError.ERRORS.TASK_DEFINITIONS.POSITIONAL_ARG_AFTER_VARIADIC,
          {
            name,
          },
        );
      }

      if (lastArg.defaultValue !== undefined && defaultValue === undefined) {
        throw new HardhatError(
          HardhatError.ERRORS.TASK_DEFINITIONS.REQUIRED_ARG_AFTER_OPTIONAL,
          {
            name,
          },
        );
      }
    }

    this.#usedNames.add(name);

    this.#positionalArgs.push({
      name,
      description,
      type: argumentType,
      defaultValue,
      isVariadic,
    });

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
    if (id.length === 0) {
      throw new HardhatError(
        HardhatError.ERRORS.TASK_DEFINITIONS.EMPTY_TASK_ID,
      );
    }

    this.#id = Array.isArray(id) ? id : [id];
  }

  public setDescription(description: string): this {
    this.#description = description;
    return this;
  }

  public setAction(action: TaskOverrideActionFunction | string): this {
    if (typeof action === "string" && !isValidActionUrl(action)) {
      throw new HardhatError(
        HardhatError.ERRORS.TASK_DEFINITIONS.INVALID_FILE_ACTION,
        {
          action,
        },
      );
    }

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

    if (!isArgumentNameValid(name)) {
      throw new HardhatError(HardhatError.ERRORS.ARGUMENTS.INVALID_NAME, {
        name,
      });
    }

    if (name in this.#options) {
      throw new HardhatError(HardhatError.ERRORS.ARGUMENTS.DUPLICATED_NAME, {
        name,
      });
    }

    if (RESERVED_ARGUMENT_NAMES.has(name)) {
      throw new HardhatError(HardhatError.ERRORS.ARGUMENTS.RESERVED_NAME, {
        name,
      });
    }

    if (!isArgumentValueValid(argumentType, defaultValue)) {
      throw new HardhatError(
        HardhatError.ERRORS.TASK_DEFINITIONS.INVALID_VALUE_FOR_TYPE,
        {
          value: defaultValue,
          name: "defaultValue",
          type: argumentType,
          task: formatTaskId(this.#id),
        },
      );
    }

    this.#options[name] = {
      name,
      description,
      type: argumentType,
      defaultValue,
    };

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
