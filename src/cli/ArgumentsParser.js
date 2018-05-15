"use strict";

class ArgumentsParser {
  constructor(globalParamDefinitions, tasks, defaultTaskName) {
    this.globalParamDefinitions = globalParamDefinitions;
    this.tasks = tasks;
    this.defaultTask = defaultTaskName;
  }

  parse(rawArgs) {
    const taskIndex = this._getTaskNameIndex(rawArgs);

    const rawGlobalParamArgs =
      taskIndex === undefined ? rawArgs : rawArgs.slice(0, taskIndex);

    if (Object.keys(this.tasks).length === 0) {
      return {
        globalArguments: this._parseParamArgs(
          rawGlobalParamArgs,
          this.globalParamDefinitions
        )
      };
    }

    const taskName = rawArgs[taskIndex] || this.defaultTask;

    const selectedTask = this.tasks[taskName];

    if (selectedTask === undefined) {
      throw new Error(`Unrecognized task ${taskName}`);
    }

    const rawTaskArgs =
      taskIndex === undefined ? [] : rawArgs.slice(taskIndex + 1);

    const {
      rawParamArguments,
      rawPositionalParamArguments
    } = this._splitArgumentsForTask(rawTaskArgs, selectedTask);

    const globalArguments = this._parseParamArgs(
      rawGlobalParamArgs,
      this.globalParamDefinitions
    );

    const taskParamArguments = this._parseParamArgs(
      rawParamArguments,
      selectedTask.paramDefinitions
    );

    const taskPositionalParamArguments = this._parsePositionalParamArgs(
      rawPositionalParamArguments,
      selectedTask.positionalParamDefinitions
    );

    return {
      taskName,
      globalArguments,
      taskArguments: { ...taskParamArguments, ...taskPositionalParamArguments }
    };
  }

  _isParamName(str) {
    return str.startsWith(ArgumentsParser.PARAM_PREFIX);
  }

  _getTaskNameIndex(rawArgs) {
    for (let i = 0; i < rawArgs.length; i++) {
      if (!this._isParamName(rawArgs[i])) {
        return i;
      }

      if (!this._isFlagName(rawArgs[i], this.globalParamDefinitions)) {
        i++;
      }
    }
  }

  _parseParamArgs(rawParamArgs, paramDefinitions) {
    const args = {};

    for (let i = 0; i < rawParamArgs.length; i++) {
      if (!this._isParamName(rawParamArgs[i])) {
        throw new Error(
          `Unrecognised command line argument ${
            rawParamArgs[i]
          }. This is probably a bug, please report it.`
        );
      }

      const rawParamName = rawParamArgs[i];
      const paramName = ArgumentsParser.cLAToParamName(rawParamArgs[i]);

      const definition = paramDefinitions[paramName];
      if (definition === undefined) {
        throw new Error(`Unrecognized param ${rawParamName}.`);
      }

      if (definition.isFlag) {
        args[paramName] = true;
        continue;
      }

      i++;

      const rawParamArg = rawParamArgs[i];

      if (rawParamArg === undefined) {
        if (definition.defaultValue === undefined) {
          throw new Error(`Missing value for param ${rawParamName}.`);
        }
      } else {
        args[paramName] = definition.type.parse(paramName, rawParamArg);
      }
    }

    // Add default values
    Object.values(paramDefinitions)
      .filter(o => o.defaultValue !== undefined)
      .filter(o => args[o.name] === undefined)
      .forEach(o => (args[o.name] = o.defaultValue));

    // Validate required paramDefinitions
    const missingParam = Object.values(paramDefinitions)
      .filter(o => o.defaultValue === undefined)
      .find(o => args[o.name] === undefined);

    if (missingParam !== undefined) {
      throw new Error(
        `Missing param ${ArgumentsParser.paramNameToCLA(missingParam.name)}`
      );
    }

    return args;
  }

  _parsePositionalParamArgs(
    rawPositionalParamArgs,
    positionalParamDefinitions
  ) {
    const args = {};

    for (let i = 0; i < positionalParamDefinitions.length; i++) {
      const definition = positionalParamDefinitions[i];

      const rawArg = rawPositionalParamArgs[i];

      if (rawArg === undefined) {
        if (definition.defaultValue === undefined) {
          throw new Error(`Missing positional argument ${definition.name}`);
        }

        args[definition.name] = definition.defaultValue;
      } else if (!definition.isVariadic) {
        args[definition.name] = definition.type.parse(definition.name, rawArg);
      } else {
        args[definition.name] = rawPositionalParamArgs
          .slice(i)
          .map(raw => definition.type.parse(definition.name, raw));
      }
    }

    const lastDefinition =
      positionalParamDefinitions[positionalParamDefinitions.length - 1];

    const hasVariadicParam =
      lastDefinition !== undefined && lastDefinition.isVariadic;

    if (
      !hasVariadicParam &&
      rawPositionalParamArgs.length > positionalParamDefinitions.length
    ) {
      throw new Error(
        `Unrecognized positional argument ${
          rawPositionalParamArgs[positionalParamDefinitions.length]
        }`
      );
    }

    return args;
  }

  _splitArgumentsForTask(rawArgs, selectedTask) {
    const rawPositionalParamArguments = [];
    const rawParamArguments = [];

    for (let i = 0; i < rawArgs.length; i++) {
      if (!this._isParamName(rawArgs[i])) {
        rawPositionalParamArguments.push(rawArgs[i]);
        continue;
      }

      rawParamArguments.push(rawArgs[i]);

      if (!this._isFlagName(rawArgs[i], selectedTask.paramDefinitions)) {
        i++;

        if (rawArgs[i] !== undefined) {
          rawParamArguments.push(rawArgs[i]);
        }
      }
    }

    return { rawPositionalParamArguments, rawParamArguments };
  }

  _isFlagName(rawArg, paramDefinitions) {
    const name = ArgumentsParser.cLAToParamName(rawArg);
    const definition = paramDefinitions[name];
    return definition !== undefined && definition.isFlag;
  }
}

ArgumentsParser.PARAM_PREFIX = "--";

ArgumentsParser.paramNameToCLA = paramName =>
  ArgumentsParser.PARAM_PREFIX +
  paramName
    .split(/(?=[A-Z])/g)
    .map(s => s.toLowerCase())
    .join("-");

ArgumentsParser.cLAToParamName = cLa => {
  const parts = cLa.slice(ArgumentsParser.PARAM_PREFIX.length).split("-");

  return (
    parts[0] +
    parts
      .slice(1)
      .map(s => s[0].toUpperCase() + s.slice(1))
      .join("")
  );
};

module.exports = { ArgumentsParser };
