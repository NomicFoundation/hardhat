import type { ParameterTypeToValueType } from "../../types/common.js";
import type {
  NamedTaskParameter,
  NewTaskActionFunction,
  NewTaskDefinitionBuilder,
  NewTaskDefinition,
  PositionalTaskParameter,
  TaskOverrideActionFunction,
  TaskOverrideDefinitionBuilder,
  TaskOverrideDefinition,
} from "../../types/tasks.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

import { ParameterType, isParameterValueValid } from "../../types/common.js";
import { TaskDefinitionType } from "../../types/tasks.js";
import {
  RESERVED_PARAMETER_NAMES,
  isValidParamNameCasing,
} from "../parameters.js";

import { formatTaskId, isValidActionUrl } from "./utils.js";

export class NewTaskDefinitionBuilderImplementation
  implements NewTaskDefinitionBuilder
{
  readonly #id: string[];
  readonly #usedNames: Set<string> = new Set();

  readonly #namedParams: Record<string, NamedTaskParameter> = {};
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

  public addNamedParameter<T extends ParameterType>({
    name,
    description = "",
    type,
    defaultValue,
  }: {
    name: string;
    description?: string;
    type?: T;
    defaultValue?: ParameterTypeToValueType<T>;
  }): this {
    const parameterType = type ?? ParameterType.STRING;

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

    this.#namedParams[name] = {
      name,
      description,
      parameterType,
      defaultValue,
    };

    return this;
  }

  public addFlag(paramOptions: { name: string; description?: string }): this {
    return this.addNamedParameter({
      ...paramOptions,
      type: ParameterType.BOOLEAN,
      defaultValue: false,
    });
  }

  public addPositionalParameter<T extends ParameterType>({
    name,
    description,
    type,
    defaultValue,
  }: {
    name: string;
    description?: string;
    type?: T;
    defaultValue?: ParameterTypeToValueType<T>;
  }): this {
    return this.#addPositionalParameter({
      name,
      description,
      type,
      defaultValue,
      isVariadic: false,
    });
  }

  public addVariadicParameter<T extends ParameterType>({
    name,
    description,
    type,
    defaultValue,
  }: {
    name: string;
    description?: string;
    type?: T;
    defaultValue?: Array<ParameterTypeToValueType<T>>;
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
      namedParameters: this.#namedParams,
      positionalParameters: this.#positionalParams,
    };
  }

  #addPositionalParameter<T extends ParameterType>({
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
      | ParameterTypeToValueType<T>
      | Array<ParameterTypeToValueType<T>>;
    isVariadic: boolean;
  }): this {
    const parameterType = type ?? ParameterType.STRING;

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
      parameterType,
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

  readonly #namedParams: Record<string, NamedTaskParameter> = {};

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

  public addNamedParameter<T extends ParameterType>({
    name,
    description = "",
    type,
    defaultValue,
  }: {
    name: string;
    description?: string;
    type?: T;
    defaultValue?: ParameterTypeToValueType<T>;
  }): this {
    const parameterType = type ?? ParameterType.STRING;

    if (!isValidParamNameCasing(name)) {
      throw new HardhatError(HardhatError.ERRORS.ARGUMENTS.INVALID_NAME, {
        name,
      });
    }

    if (name in this.#namedParams) {
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

    this.#namedParams[name] = {
      name,
      description,
      parameterType,
      defaultValue,
    };

    return this;
  }

  public addFlag(paramOptions: { name: string; description?: string }): this {
    return this.addNamedParameter({
      ...paramOptions,
      type: ParameterType.BOOLEAN,
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
      namedParameters: this.#namedParams,
    };
  }
}
