import { ParameterType } from "../../types/common.js";
import {
  NamedTaskParameter,
  NewTaskActionFunction,
  NewTaskDefinitionBuilder,
  NewTaskDefinition,
  PositionalTaskParameter,
  TaskDefinitionType,
  TaskOverrideActionFunction,
  TaskOverrideDefinitionBuilder,
  TaskOverrideDefinition,
} from "../../types/tasks.js";
import { isValidParamNameCasing } from "../parameters.js";

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
    this.#id = Array.isArray(id) ? id : [id];
    this.#description = description;
  }

  public setDescription(description: string): this {
    this.#description = description;
    return this;
  }

  public setAction(action: NewTaskActionFunction | string): this {
    if (typeof action === "string") {
      if (!action.startsWith("file://") || action === "file://") {
        throw new Error("Invalid action file URL");
      }
    }

    this.#action = action;

    return this;
  }

  public addNamedParameter({
    name,
    description = "",
    type = ParameterType.STRING,
    defaultValue,
  }: {
    name: string;
    description?: string;
    type?: ParameterType;
    defaultValue?: any;
  }): this {
    if (!isValidParamNameCasing(name)) {
      throw new Error("Invalid param name");
    }

    if (this.#usedNames.has(name)) {
      throw new Error(`Parameter ${name} already exists`);
    }

    this.#usedNames.add(name);

    // TODO: Validate that default value matches with type
    // TODO: Validate that the name is not one of the reserved ones in parameters.ts

    this.#namedParams[name] = {
      name,
      description,
      parameterType: type,
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

  public addPositionalParameter({
    name,
    description = "",
    type = ParameterType.STRING,
    defaultValue,
  }: {
    name: string;
    description?: string;
    type?: ParameterType;
    defaultValue?: any;
  }): this {
    if (!isValidParamNameCasing(name)) {
      throw new Error("Invalid param name");
    }

    if (this.#usedNames.has(name)) {
      throw new Error(`Parameter ${name} already exists`);
    }

    this.#usedNames.add(name);

    if (this.#positionalParams.length > 0) {
      const lastParam =
        this.#positionalParams[this.#positionalParams.length - 1];

      if (lastParam.isVariadic) {
        throw new Error("Cannot add positional param after variadic param");
      }

      if (lastParam.defaultValue !== undefined && defaultValue === undefined) {
        throw new Error(
          "Cannot add required positional param after an optional one",
        );
      }
    }

    // TODO: Validate default value matches with type
    // TODO: Validate that the name is not one of the reserved ones in parameters.ts

    this.#positionalParams.push({
      name,
      description,
      parameterType: type,
      defaultValue,
      isVariadic: false,
    });

    return this;
  }

  public addVariadicParameter({
    name,
    description = "",
    type = ParameterType.STRING,
    defaultValue,
  }: {
    name: string;
    description?: string;
    type?: ParameterType;
    defaultValue?: any[];
  }): this {
    if (!isValidParamNameCasing(name)) {
      throw new Error("Invalid param name");
    }

    if (this.#usedNames.has(name)) {
      throw new Error(`Parameter ${name} already exists`);
    }

    this.#usedNames.add(name);

    if (this.#positionalParams.length > 0) {
      const lastParam =
        this.#positionalParams[this.#positionalParams.length - 1];

      if (lastParam.isVariadic) {
        throw new Error("Cannot add positional param after variadic param");
      }

      if (lastParam.defaultValue !== undefined && defaultValue === undefined) {
        throw new Error(
          "Cannot add required positional param after an optional one",
        );
      }
    }

    // TODO: Validate default value is an array where each element matches with type
    // TODO: Validate that the name is not one of the reserved ones in parameters.ts

    this.#positionalParams.push({
      name,
      description,
      parameterType: type,
      defaultValue,
      isVariadic: true,
    });

    return this;
  }

  public build(): NewTaskDefinition {
    if (this.#action === undefined) {
      throw new Error("Missing action");
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
}

export class TaskOverrideDefinitionBuilderImplementation
  implements TaskOverrideDefinitionBuilder
{
  readonly #id: string[];
  readonly #namedParams: Record<string, NamedTaskParameter> = {};
  #action?: TaskOverrideActionFunction | string;
  #description?: string;

  constructor(id: string | string[]) {
    this.#id = Array.isArray(id) ? id : [id];
  }

  public setDescription(description: string): this {
    this.#description = description;
    return this;
  }

  public addNamedParameter({
    name,
    description = "",
    type = ParameterType.STRING,
    defaultValue,
  }: {
    name: string;
    description?: string;
    type?: ParameterType;
    defaultValue: any;
  }): this {
    if (!isValidParamNameCasing(name)) {
      throw new Error("Invalid param name");
    }

    if (name in this.#namedParams) {
      throw new Error(`Parameter ${name} already exists`);
    }

    // TODO: Validate that default value matches with type
    // TODO: Validate that the name is not one of the reserved ones in parameters.ts

    this.#namedParams[name] = {
      name,
      description,
      parameterType: type,
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

  public setAction(action: TaskOverrideActionFunction | string): this {
    if (typeof action === "string") {
      if (!action.startsWith("file://") || action === "file://") {
        throw new Error("Invalid action file URL");
      }
    }

    this.#action = action;

    return this;
  }

  public build(): TaskOverrideDefinition {
    if (this.#action === undefined) {
      throw new Error("Missing action");
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
