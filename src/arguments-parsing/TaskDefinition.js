const types = require("./types");

class TaskDefinition {
  constructor(name, isInternal) {
    this.name = name;
    this.isInternal = isInternal;
    this.paramDefintions = {};
    this.positionalParamDefinitions = [];
    this.positionalParamNames = new Set();
    this.hasVariadicParam = false;
    this.hasOptionalPositionalParam = false;
  }

  setDescription(description) {
    this.description = description;
    return this;
  }

  addParam(name, description, defaultValue, type = types.string) {
    this._validateNameNotUsed(name);

    this.paramDefintions[name] = {
      name,
      defaultValue,
      type,
      description
    };

    return this;
  }

  addPositionalParam(name, description, defaultValue, type = types.string) {
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
    defaultValue,
    type = types.string
  ) {
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
      this.hasVariadicParam = true;
    }

    if (definition.defaultValue !== undefined) {
      this.hasOptionalPositionalParam = true;
    }

    this.positionalParamNames.add(definition.name);
    this.positionalParamDefinitions.push(definition);
  }

  setAction(action) {
    this.action = action;

    return this;
  }

  _validateNotAfterVariadicParam(name) {
    if (this.hasVariadicParam) {
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
      this.paramDefintions[name] !== undefined ||
      this.positionalParamNames.has(name)
    );
  }

  _validateNoMandatoryParamAfterOptionalOnes(name, defaultValue) {
    if (defaultValue === undefined && this.hasOptionalPositionalParam) {
      throw new Error(
        `Could not set positional param ${name} for task ${
          this.name
        } because it is mandatory and it was added after an optional positional param.`
      );
    }
  }
}

module.exports = { TaskDefinition };
