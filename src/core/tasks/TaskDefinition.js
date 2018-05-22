"use strict";

const types = require("../types");
const { BUIDLER_CLI_PARAM_DEFINITIONS } = require("../params/buidler-params");
const { BuidlerError, ERRORS } = require("../errors");

class TaskDefinition {
  constructor(name, isInternal) {
    this.name = name;
    this.isInternal = isInternal;
    this.paramDefinitions = {};
    this.positionalParamDefinitions = [];
    this._positionalParamNames = new Set();
    this._hasVariadicParam = false;
    this._hasOptionalPositionalParam = false;
  }

  setDescription(description) {
    this.description = description;
    return this;
  }

  addParam(
    name,
    description,
    defaultValue = undefined,
    type = types.string,
    isOptional = defaultValue !== undefined
  ) {
    if (this._isType(defaultValue)) {
      type = defaultValue;
      defaultValue = undefined;
      isOptional = type !== undefined ? type : false;
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
    defaultValue = undefined,
    type = types.string,
    isOptional = defaultValue !== undefined
  ) {
    if (this._isType(defaultValue)) {
      type = defaultValue;
      defaultValue = undefined;
      isOptional = type !== undefined ? type : false;
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

  addVariadicPositionalParam(
    name,
    description,
    defaultValue = undefined,
    type = types.string,
    isOptional = defaultValue !== undefined
  ) {
    if (this._isType(defaultValue)) {
      type = defaultValue;
      defaultValue = undefined;
      isOptional = type !== undefined ? type : false;
    }

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

  setAction(action) {
    this.action = action;

    return this;
  }

  _validateNotAfterVariadicParam(name) {
    if (this._hasVariadicParam) {
      throw new BuidlerError(
        ERRORS.TASKS_DEFINITION_PARAM_AFTER_VARIADIC,
        name,
        taskName
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

  _isType(obj) {
    return (
      obj !== undefined &&
      typeof obj.name === "string" &&
      obj.parse instanceof Function
    );
  }
}

class OverloadedTaskDefinition {
  constructor(parentTaskDefinition, isInternal) {
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
    this._throwNoParamsOverloadError();
  }

  addPositionalParam(
    name,
    description,
    defaultValue = undefined,
    type = types.string
  ) {
    this._throwNoParamsOverloadError();
  }

  addVariadicPositionalParam(
    name,
    description,
    defaultValue = undefined,
    type = types.string
  ) {
    this._throwNoParamsOverloadError();
  }

  addFlag(name, description) {
    this._throwNoParamsOverloadError();
  }

  _throwNoParamsOverloadError() {
    throw new BuidlerError(
      ERRORS.TASKS_DEFINITION_OVERLOAD_NO_PARAMS,
      this.name
    );
  }
}

module.exports = { TaskDefinition, OverloadedTaskDefinition };
