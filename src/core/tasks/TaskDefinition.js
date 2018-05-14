"use strict";

const types = require("../types");

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

  addParam(name, description, defaultValue = undefined, type = types.string) {
    if (this._isType(defaultValue)) {
      type = defaultValue;
      defaultValue = undefined;
    }

    this._validateNameNotUsed(name);

    this.paramDefinitions[name] = {
      name,
      defaultValue,
      type,
      description
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
      isFlag: true
    };

    return this;
  }

  addPositionalParam(
    name,
    description,
    defaultValue = undefined,
    type = types.string
  ) {
    if (this._isType(defaultValue)) {
      type = defaultValue;
      defaultValue = undefined;
    }

    this._validateNameNotUsed(name);
    this._validateNotAfterVariadicParam(name);
    this._validateNoMandatoryParamAfterOptionalOnes(name, defaultValue);

    const definition = {
      name,
      defaultValue,
      type,
      description,
      isVariadic: false
    };

    this._addPositionalParamDefinition(definition);

    return this;
  }

  addVariadicPositionalParam(
    name,
    description,
    defaultValue = undefined,
    type = types.string
  ) {
    if (this._isType(defaultValue)) {
      type = defaultValue;
      defaultValue = undefined;
    }

    this._validateNameNotUsed(name);
    this._validateNotAfterVariadicParam(name);
    this._validateNoMandatoryParamAfterOptionalOnes(name, defaultValue);

    if (defaultValue !== undefined && !Array.isArray(defaultValue)) {
      defaultValue = [defaultValue];
    }

    const definition = {
      name,
      defaultValue,
      type,
      description,
      isVariadic: true
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
      throw new Error(
        `Could not set positional param ${name} for task ${
          this.name
        } because there's already a variadic positional param and it has to be the last positional one.`
      );
    }
  }

  _validateNameNotUsed(name) {
    if (this._hasParamDefined(name)) {
      throw new Error(
        `Could not set param ${name} for task ${
          this.name
        } because its name is already used.`
      );
    }
  }

  _hasParamDefined(name) {
    return (
      this.paramDefinitions[name] !== undefined ||
      this._positionalParamNames.has(name)
    );
  }

  _validateNoMandatoryParamAfterOptionalOnes(name, defaultValue) {
    if (defaultValue === undefined && this._hasOptionalPositionalParam) {
      throw new Error(
        `Could not set positional param ${name} for task ${
          this.name
        } because it is mandatory and it was added after an optional positional param.`
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
    throw new Error(
      `Task redefinition ${
        this.name
      } failed. You can't change param definitions in an overloaded task.`
    );
  }
}

module.exports = { TaskDefinition, OverloadedTaskDefinition };
