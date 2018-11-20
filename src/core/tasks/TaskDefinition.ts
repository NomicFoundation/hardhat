import * as types from "../argumentTypes";
import { BuidlerError, ERRORS } from "../errors";
import { ArgumentType } from "../argumentTypes";
import { ActionType, TaskArguments } from "../../types";
import { BUIDLER_PARAM_DEFINITIONS } from "../params/buidler-params";

export interface ParamDefinition<T> {
  name: string;
  defaultValue?: T;
  type: ArgumentType<T>;
  description?: string;
  isOptional?: boolean;
  isFlag?: boolean;
  isVariadic?: boolean;
}

export type ParamDefinitionsMap = { [paramName: string]: ParamDefinition<any> };

export interface ITaskDefinition {
  readonly name: string;
  readonly description?: string;
  readonly action: ActionType<TaskArguments>;
  readonly isInternal: boolean;
  readonly paramDefinitions: ParamDefinitionsMap;
  readonly positionalParamDefinitions: ParamDefinition<any>[];

  setDescription(description: string): this;

  setAction<ArgsT>(action: ActionType<ArgsT>): this;

  addParam<T>(
    name: string,
    description: string,
    defaultValue?: T,
    type?: ArgumentType<T>,
    isOptional?: boolean
  ): this;

  addOptionalParam<T>(
    name: string,
    description: string,
    defaultValue?: T,
    type?: ArgumentType<T>
  ): this;

  addPositionalParam<T>(
    name: string,
    description: string,
    defaultValue?: T,
    type?: ArgumentType<T>,
    isOptional?: boolean
  ): this;

  addOptionalPositionalParam<T>(
    name: string,
    description: string,
    defaultValue?: T,
    type?: ArgumentType<T>
  ): this;

  addVariadicPositionalParam<T>(
    name: string,
    description: string,
    defaultValue?: T[],
    type?: ArgumentType<T>,
    isOptional?: boolean
  ): this;

  addOptionalVariadicPositionalParam<T>(
    name: string,
    description: string,
    defaultValue?: T[],
    type?: ArgumentType<T>
  ): this;

  addFlag(name: string, description: string): this;
}

export class TaskDefinition implements ITaskDefinition {
  public readonly paramDefinitions: ParamDefinitionsMap = {};
  public readonly positionalParamDefinitions: ParamDefinition<any>[] = [];

  private _positionalParamNames: Set<string>;
  private _hasVariadicParam: boolean;
  private _hasOptionalPositionalParam: boolean;
  private _description?: string;
  public action: ActionType<TaskArguments>;

  constructor(
    public readonly name: string,
    public readonly isInternal: boolean = false
  ) {
    this._positionalParamNames = new Set();
    this._hasVariadicParam = false;
    this._hasOptionalPositionalParam = false;
    this.action = () => {
      throw new BuidlerError(ERRORS.TASKS_DEFINITION_NO_ACTION, name);
    };
  }

  get description() {
    return this._description;
  }

  setDescription(description: string) {
    this._description = description;
    return this;
  }

  setAction<ArgsT>(action: ActionType<ArgsT>) {
    // TODO: There's probably something bad here. See types.ts for more info.
    this.action = action as ActionType<TaskArguments>;
    return this;
  }

  addParam<T>(
    name: string,
    description: string,
    defaultValue?: T,
    type?: ArgumentType<T>,
    isOptional: boolean = defaultValue !== undefined
  ): this {
    if (type === undefined) {
      return this.addParam(
        name,
        description,
        defaultValue && defaultValue.toString(),
        types.string,
        isOptional
      );
    }

    this._validateNameNotUsed(name);

    this.paramDefinitions[name] = {
      name,
      defaultValue,
      type,
      description,
      isOptional
    };

    return this;
  }

  addOptionalParam<T>(
    name: string,
    description: string,
    defaultValue?: T,
    type?: ArgumentType<T>
  ): this {
    return this.addParam(name, description, defaultValue, type, true);
  }

  addFlag(name: string, description: string) {
    this._validateNameNotUsed(name);

    this.paramDefinitions[name] = {
      name,
      defaultValue: false,
      type: types.boolean,
      description,
      isFlag: true,
      isOptional: true
    };

    return this;
  }

  addPositionalParam<T>(
    name: string,
    description: string,
    defaultValue?: T,
    type?: ArgumentType<T>,
    isOptional = defaultValue !== undefined
  ): this {
    if (type === undefined) {
      return this.addPositionalParam(
        name,
        description,
        defaultValue && defaultValue.toString(),
        types.string,
        isOptional
      );
    }

    this._validateNameNotUsed(name);
    this._validateNotAfterVariadicParam(name);
    this._validateNoMandatoryParamAfterOptionalOnes(name, isOptional);

    const definition = {
      name,
      defaultValue,
      type,
      description,
      isVariadic: false,
      isOptional
    };

    this._addPositionalParamDefinition(definition);

    return this;
  }

  addOptionalPositionalParam<T>(
    name: string,
    description: string,
    defaultValue?: T,
    type?: ArgumentType<T>
  ): this {
    return this.addPositionalParam(name, description, defaultValue, type, true);
  }

  addVariadicPositionalParam<T>(
    name: string,
    description: string,
    defaultValue?: T[] | T,
    type?: ArgumentType<T>,
    isOptional = defaultValue !== undefined
  ): this {
    if (defaultValue !== undefined && !Array.isArray(defaultValue)) {
      defaultValue = [defaultValue];
    }

    if (type == undefined) {
      return this.addVariadicPositionalParam(
        name,
        description,
        defaultValue && defaultValue.map(v => v.toString()),
        types.string,
        isOptional
      );
    }

    this._validateNameNotUsed(name);
    this._validateNotAfterVariadicParam(name);
    this._validateNoMandatoryParamAfterOptionalOnes(name, isOptional);

    const definition = {
      name,
      defaultValue,
      type,
      description,
      isVariadic: true,
      isOptional
    };

    this._addPositionalParamDefinition(definition);

    return this;
  }

  addOptionalVariadicPositionalParam<T>(
    name: string,
    description: string,
    defaultValue?: T[],
    type?: ArgumentType<T>
  ): this {
    return this.addVariadicPositionalParam(
      name,
      description,
      defaultValue,
      type,
      true
    );
  }

  _addPositionalParamDefinition(definition: ParamDefinition<any>) {
    if (definition.isVariadic) {
      this._hasVariadicParam = true;
    }

    if (definition.defaultValue !== undefined) {
      this._hasOptionalPositionalParam = true;
    }

    this._positionalParamNames.add(definition.name);
    this.positionalParamDefinitions.push(definition);
  }

  _validateNotAfterVariadicParam(name: string) {
    if (this._hasVariadicParam) {
      throw new BuidlerError(
        ERRORS.TASKS_DEFINITION_PARAM_AFTER_VARIADIC,
        name,
        this.name
      );
    }
  }

  _validateNameNotUsed(name: string) {
    if (this._hasParamDefined(name)) {
      throw new BuidlerError(
        ERRORS.TASKS_DEFINITION_PARAM_ALREADY_DEFINED,
        name,
        this.name
      );
    }

    if (Object.keys(BUIDLER_PARAM_DEFINITIONS).includes(name)) {
      throw new BuidlerError(
        ERRORS.TASKS_DEFINITION_PARAM_CLASHES_WITH_GLOBAL,
        name,
        this.name
      );
    }
  }

  _hasParamDefined(name: string) {
    return (
      this.paramDefinitions[name] !== undefined ||
      this._positionalParamNames.has(name)
    );
  }

  _validateNoMandatoryParamAfterOptionalOnes(
    name: string,
    isOptional: boolean
  ) {
    if (!isOptional && this._hasOptionalPositionalParam) {
      throw new BuidlerError(
        ERRORS.TASKS_DEFINITION_MANDATORY_PARAM_AFTER_OPTIONAL,
        name,
        this.name
      );
    }
  }
}

export class OverloadedTaskDefinition implements ITaskDefinition {
  private _description?: string;
  private _action?: ActionType<TaskArguments>;

  constructor(
    public readonly parentTaskDefinition: ITaskDefinition,
    public readonly isInternal: boolean = false
  ) {
    this.isInternal = isInternal;
    this.parentTaskDefinition = parentTaskDefinition;
  }

  setDescription(description: string) {
    this._description = description;
    return this;
  }

  setAction<ArgsT>(action: ActionType<ArgsT>) {
    // TODO: There's probably something bad here. See types.ts for more info.
    this._action = action as ActionType<TaskArguments>;
    return this;
  }

  get name() {
    return this.parentTaskDefinition.name;
  }

  get description() {
    if (this._description !== undefined) {
      return this._description;
    }

    return this.parentTaskDefinition.description;
  }

  get action() {
    if (this._action !== undefined) {
      return this._action;
    }

    return this.parentTaskDefinition.action;
  }

  get paramDefinitions() {
    return this.parentTaskDefinition.paramDefinitions;
  }

  get positionalParamDefinitions() {
    return this.parentTaskDefinition.positionalParamDefinitions;
  }

  addParam<T>(
    name: string,
    description: string,
    defaultValue?: T,
    type?: ArgumentType<T>,
    isOptional?: boolean
  ): this {
    return this._throwNoParamsOverloadError();
  }

  addOptionalParam<T>(
    name: string,
    description: string,
    defaultValue?: T,
    type?: ArgumentType<T>
  ): this {
    return this._throwNoParamsOverloadError();
  }

  addPositionalParam<T>(
    name: string,
    description: string,
    defaultValue?: T,
    type?: ArgumentType<T>,
    isOptional?: boolean
  ): this {
    return this._throwNoParamsOverloadError();
  }

  addOptionalPositionalParam<T>(
    name: string,
    description: string,
    defaultValue?: T,
    type?: ArgumentType<T>
  ): this {
    return this._throwNoParamsOverloadError();
  }

  addVariadicPositionalParam<T>(
    name: string,
    description: string,
    defaultValue?: T[],
    type?: ArgumentType<T>,
    isOptional?: boolean
  ): this {
    return this._throwNoParamsOverloadError();
  }

  addOptionalVariadicPositionalParam<T>(
    name: string,
    description: string,
    defaultValue?: T[],
    type?: ArgumentType<T>
  ): this {
    return this._throwNoParamsOverloadError();
  }

  addFlag(name: string, description: string): this {
    return this._throwNoParamsOverloadError();
  }

  _throwNoParamsOverloadError(): never {
    throw new BuidlerError(
      ERRORS.TASKS_DEFINITION_OVERLOAD_NO_PARAMS,
      this.name
    );
  }
}
