import type { ArgumentTypeToValueType } from "../../types/arguments.js";
import type {
  TaskOption,
  NewTaskActionFunction,
  NewTaskDefinitionBuilder,
  NewTaskDefinition,
  PositionalTaskParameter,
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
  RESERVED_PARAMETER_NAMES,
  isParameterValueValid,
  isValidParamNameCasing,
} from "../parameters.js";

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

  readonly #options: Record<string, TaskOption> = {};
  readonly #positionalParams: PositionalTaskParameter[] = [];

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
    defaultValue?: ArgumentTypeToValueType<T>;
  }): this {
    const parameterType = type ?? ArgumentType.STRING;

    if (!isValidParamNameCasing(name)) {
      throw new HardhatError(HardhatError.ERRORS.ARGUMENTS.INVALID_NAME, {
        name,
      });
    }

    if (this.#usedNames.has(name)) {
      throw new HardhatError(HardhatError.ERRORS.ARGUMENTS.DUPLICATED_NAME, {
        name,
      });
    }

    if (RESERVED_PARAMETER_NAMES.has(name)) {
      throw new HardhatError(HardhatError.ERRORS.ARGUMENTS.RESERVED_NAME, {
        name,
      });
    }

    if (
      defaultValue !== undefined &&
      !isParameterValueValid(parameterType, defaultValue)
    ) {
      throw new HardhatError(
        HardhatError.ERRORS.TASK_DEFINITIONS.INVALID_VALUE_FOR_TYPE,
        {
          value: defaultValue,
          name: "defaultValue",
          type: parameterType,
          task: formatTaskId(this.#id),
        },
      );
    }

    this.#usedNames.add(name);

    this.#options[name] = {
      name,
      description,
      type: parameterType,
      defaultValue,
    };

    return this;
  }

  public addFlag(paramOptions: { name: string; description?: string }): this {
    return this.addOption({
      ...paramOptions,
      type: ArgumentType.BOOLEAN,
      defaultValue: false,
    });
  }

  public addPositionalParameter<T extends ArgumentType>({
    name,
    description,
    type,
    defaultValue,
  }: {
    name: string;
    description?: string;
    type?: T;
    defaultValue?: ArgumentTypeToValueType<T>;
  }): this {
    return this.#addPositionalParameter({
      name,
      description,
      type,
      defaultValue,
      isVariadic: false,
    });
  }

  public addVariadicParameter<T extends ArgumentType>({
    name,
    description,
    type,
    defaultValue,
  }: {
    name: string;
    description?: string;
    type?: T;
    defaultValue?: Array<ArgumentTypeToValueType<T>>;
  }): this {
    return this.#addPositionalParameter({
      name,
      description,
      type,
      defaultValue,
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
      positionalParameters: this.#positionalParams,
    };
  }

  #addPositionalParameter<T extends ArgumentType>({
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
    const parameterType = type ?? ArgumentType.STRING;

    if (!isValidParamNameCasing(name)) {
      throw new HardhatError(HardhatError.ERRORS.ARGUMENTS.INVALID_NAME, {
        name,
      });
    }

    if (this.#usedNames.has(name)) {
      throw new HardhatError(HardhatError.ERRORS.ARGUMENTS.DUPLICATED_NAME, {
        name,
      });
    }

    if (RESERVED_PARAMETER_NAMES.has(name)) {
      throw new HardhatError(HardhatError.ERRORS.ARGUMENTS.RESERVED_NAME, {
        name,
      });
    }

    if (defaultValue !== undefined) {
      if (!isParameterValueValid(parameterType, defaultValue, isVariadic)) {
        throw new HardhatError(
          HardhatError.ERRORS.TASK_DEFINITIONS.INVALID_VALUE_FOR_TYPE,
          {
            value: defaultValue,
            name: "defaultValue",
            type: parameterType,
            task: formatTaskId(this.#id),
          },
        );
      }
    }

    if (this.#positionalParams.length > 0) {
      const lastParam =
        this.#positionalParams[this.#positionalParams.length - 1];

      if (lastParam.isVariadic) {
        throw new HardhatError(
          HardhatError.ERRORS.TASK_DEFINITIONS.POSITIONAL_PARAM_AFTER_VARIADIC,
          {
            name,
          },
        );
      }

      if (lastParam.defaultValue !== undefined && defaultValue === undefined) {
        throw new HardhatError(
          HardhatError.ERRORS.TASK_DEFINITIONS.REQUIRED_PARAM_AFTER_OPTIONAL,
          {
            name,
          },
        );
      }
    }

    this.#usedNames.add(name);

    this.#positionalParams.push({
      name,
      description,
      type: parameterType,
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

  readonly #options: Record<string, TaskOption> = {};

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
    defaultValue?: ArgumentTypeToValueType<T>;
  }): this {
    const parameterType = type ?? ArgumentType.STRING;

    if (!isValidParamNameCasing(name)) {
      throw new HardhatError(HardhatError.ERRORS.ARGUMENTS.INVALID_NAME, {
        name,
      });
    }

    if (name in this.#options) {
      throw new HardhatError(HardhatError.ERRORS.ARGUMENTS.DUPLICATED_NAME, {
        name,
      });
    }

    if (RESERVED_PARAMETER_NAMES.has(name)) {
      throw new HardhatError(HardhatError.ERRORS.ARGUMENTS.RESERVED_NAME, {
        name,
      });
    }

    if (
      defaultValue !== undefined &&
      !isParameterValueValid(parameterType, defaultValue)
    ) {
      throw new HardhatError(
        HardhatError.ERRORS.TASK_DEFINITIONS.INVALID_VALUE_FOR_TYPE,
        {
          value: defaultValue,
          name: "defaultValue",
          type: parameterType,
          task: formatTaskId(this.#id),
        },
      );
    }

    this.#options[name] = {
      name,
      description,
      type: parameterType,
      defaultValue,
    };

    return this;
  }

  public addFlag(paramOptions: { name: string; description?: string }): this {
    return this.addOption({
      ...paramOptions,
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
