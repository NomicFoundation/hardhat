import types from "../types";
import { BUIDLER_CLI_PARAM_DEFINITIONS } from "../params/buidler-params";
import { BuidlerError, ERRORS } from "../errors";
import { ActionType } from "../../types";

interface ParamDefinition {
  name: string;
  defaultValue: any;
  type: any;
  description?: string;
  isOptional?: boolean;
  isFlag?: boolean;
}

type ParamDefinitionsMap = { [paramName: string]: ParamDefinition };

export interface ITaskDefinition {
  readonly name: string;
  readonly description?: string;
  readonly action?: ActionType;
  readonly isInternal: boolean;

  readonly paramDefinitions: ParamDefinitionsMap;
  readonly positionalParamDefinitions: ParamDefinition[];

  setDescription(description: string): this;
  setAction(action: ActionType): this;
  addParam(name, description, defaultValue?: any, type?: any): this;
  addOptionalParam(name, description, defaultValue?: any, type?: any): this;
  addPositionalParam(name, description, defaultValue?: any, type?: any): this;
  addOptionalPositionalParam(
    name,
    description,
    defaultValue?: any,
    type?: any
  ): this;
  addVariadicPositionalParam(
    name,
    description,
    defaultValue?: any,
    type?: any
  ): this;
  addOptionalVariadicPositionalParam(
    name,
    description,
    defaultValue,
    type?: any
  ): this;
  addFlag(name, description): this;
}

export class TaskDefinition implements ITaskDefinition {
  public readonly paramDefinitions: ParamDefinitionsMap = {};
  public readonly positionalParamDefinitions: ParamDefinition[] = [];

  private _positionalParamNames: Set<string>;
  private _hasVariadicParam: boolean;
  private _hasOptionalPositionalParam: boolean;
  private _description?: string;
  private _action?: ActionType;

  constructor(
    public readonly name: string,
    public readonly isInternal: boolean
  ) {
    this._positionalParamNames = new Set();
    this._hasVariadicParam = false;
    this._hasOptionalPositionalParam = false;
  }

  get description() {
    return this._description;
  }

  get action() {
    return this._action;
  }

  setDescription(description) {
    this._description = description;
    return this;
  }

  setAction(action) {
    this._action = action;
    return this;
  }

  addParam(
    name,
    description,
    type = types.string,
    defaultValue = undefined,
    isOptional = defaultValue !== undefined
  ) {
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

  addOptionalParam(name, description, defaultValue, type = types.string) {
    return this.addParam(name, description, type, defaultValue, true);
  }

  addFlag(name, description) {
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

  addPositionalParam(
    name,
    description,
    type = types.string,
    defaultValue = undefined,
    isOptional = defaultValue !== undefined
  ) {
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

  addOptionalPositionalParam(
    name,
    description,
    defaultValue,
    type = types.string
  ) {
    return this.addPositionalParam(name, description, type, defaultValue, true);
  }

  addVariadicPositionalParam(
    name,
    description,
    type = types.string,
    defaultValue?: any[],
    isOptional = defaultValue !== undefined
  ) {
    this._validateNameNotUsed(name);
    this._validateNotAfterVariadicParam(name);
    this._validateNoMandatoryParamAfterOptionalOnes(name, isOptional);

    if (defaultValue !== undefined && !Array.isArray(defaultValue)) {
      defaultValue = [defaultValue];
    }

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

  addOptionalVariadicPositionalParam(
    name,
    description,
    defaultValue,
    type = types.string
  ) {
    return this.addVariadicPositionalParam(
      name,
      description,
      type,
      defaultValue,
      true
    );
  }

  _addPositionalParamDefinition(definition) {
    if (definition.isVariadic) {
      this._hasVariadicParam = true;
    }

    if (definition.defaultValue !== undefined) {
      this._hasOptionalPositionalParam = true;
    }

    this._positionalParamNames.add(definition.name);
    this.positionalParamDefinitions.push(definition);
  }

  _validateNotAfterVariadicParam(name) {
    if (this._hasVariadicParam) {
      throw new BuidlerError(
        ERRORS.TASKS_DEFINITION_PARAM_AFTER_VARIADIC,
        name,
        this.name
      );
    }
  }

  _validateNameNotUsed(name) {
    if (this._hasParamDefined(name)) {
      throw new BuidlerError(
        ERRORS.TASKS_DEFINITION_PARAM_ALREADY_DEFINED,
        name,
        this.name
      );
    }

    if (BUIDLER_CLI_PARAM_DEFINITIONS[name] !== undefined) {
      throw new BuidlerError(
        ERRORS.TASKS_DEFINITION_PARAM_CLASHES_WITH_GLOBAL,
        name,
        this.name
      );
    }
  }

  _hasParamDefined(name) {
    return (
      this.paramDefinitions[name] !== undefined ||
      this._positionalParamNames.has(name)
    );
  }

  _validateNoMandatoryParamAfterOptionalOnes(name, isOptional) {
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
  private _action?: ActionType;

  constructor(
    public readonly parentTaskDefinition: ITaskDefinition,
    public readonly isInternal: boolean
  ) {
    this.isInternal = isInternal;
    this.parentTaskDefinition = parentTaskDefinition;
  }

  setDescription(description) {
    this._description = description;
    return this;
  }

  setAction(action) {
    this._action = action;
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

  addParam(name, description, defaultValue = undefined, type = types.string) {
    return this._throwNoParamsOverloadError();
  }

  addOptionalParam(name, description, defaultValue, type = types.string) {
    return this._throwNoParamsOverloadError();
  }

  addPositionalParam(
    name,
    description,
    defaultValue = undefined,
    type = types.string
  ) {
    return this._throwNoParamsOverloadError();
  }

  addOptionalPositionalParam(
    name,
    description,
    defaultValue,
    type = types.string
  ) {
    return this._throwNoParamsOverloadError();
  }

  addVariadicPositionalParam(
    name,
    description,
    defaultValue = undefined,
    type = types.string
  ) {
    return this._throwNoParamsOverloadError();
  }

  addOptionalVariadicPositionalParam(
    name,
    description,
    defaultValue,
    type = types.string
  ) {
    return this._throwNoParamsOverloadError();
  }

  addFlag(name, description) {
    return this._throwNoParamsOverloadError();
  }

  _throwNoParamsOverloadError(): never {
    throw new BuidlerError(
      ERRORS.TASKS_DEFINITION_OVERLOAD_NO_PARAMS,
      this.name
    );
  }
}
