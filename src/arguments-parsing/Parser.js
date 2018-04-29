const { PARAM_PREFIX } = require("./constants");

class Parser {
  constructor(globalParamDefinitions, tasks, defaultTaskName) {
    this.globalParamDefinitions = globalParamDefinitions;
    this.tasks = tasks;
    this.defaultTask = defaultTaskName;
  }

  parse(rawArgs) {
    const taskIndex = this._getTaskNameIndex(rawArgs);

    const taskName = rawArgs[taskIndex] || this.defaultTask;

    const selectedTask = this.tasks[taskName];

    if (selectedTask === undefined) {
      throw new Error(`Unrecognized task ${taskName}`);
    }

    const rawGlobalParamArgs =
      taskIndex === undefined ? rawArgs : rawArgs.slice(0, taskIndex);

    const rawTaskArgs =
      taskIndex === undefined ? [] : rawArgs.slice(taskIndex + 1);

    const {
      rawParamArguments,
      rawPositionalParamArguments
    } = this._splitArguments(rawTaskArgs);

    const globalArguments = this._parseParamArgs(
      rawGlobalParamArgs,
      this.globalParamDefinitions
    );

    const taskParamArguments = this._parseParamArgs(
      rawParamArguments,
      selectedTask.paramDefintions
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
    return str.startsWith(PARAM_PREFIX);
  }

  _extractParamName(str) {
    return str.slice(PARAM_PREFIX.length);
  }

  _getTaskNameIndex(rawArgs) {
    for (let i = 0; i < rawArgs.length; i++) {
      if (!this._isParamName(rawArgs[i])) {
        return i;
      }

      i++;
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
      const paramName = this._extractParamName(rawParamArgs[i]);

      i++;

      const rawParamArg = rawParamArgs[i];

      const definition = paramDefinitions[paramName];
      if (definition === undefined) {
        throw new Error(`Unrecognized param ${rawParamName}.`);
      }

      if (rawParamArg === undefined) {
        if (definition.defaultValue === undefined) {
          throw new Error(`Missing value for param ${rawParamName}.`);
        }
      } else {
        args[paramName] = definition.type(paramName, rawParamArg);
      }
    }

    // Add default values
    Object.values(paramDefinitions)
      .filter(o => o.defaultValue !== undefined)
      .filter(o => args[o.name] === undefined)
      .forEach(o => (args[o.name] = o.defaultValue));

    // Validate required paramDefintions
    const missingParam = Object.values(paramDefinitions)
      .filter(o => o.defaultValue === undefined)
      .find(o => args[o.name] === undefined);

    if (missingParam !== undefined) {
      throw new Error(`Missing param ${PARAM_PREFIX}${missingParam.name}`);
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
        args[definition.name] = definition.type(definition.name, rawArg);
      } else {
        args[definition.name] = rawPositionalParamArgs
          .slice(i)
          .map(raw => definition.type(definition.name, raw));
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

  _splitArguments(rawArgs) {
    const rawPositionalParamArguments = [];
    const rawParamArguments = [];

    for (let i = 0; i < rawArgs.length; i++) {
      if (!this._isParamName(rawArgs[i])) {
        rawPositionalParamArguments.push(rawArgs[i]);
        continue;
      }

      rawParamArguments.push(rawArgs[i]);

      i++;

      if (rawArgs[i] !== undefined) {
        rawParamArguments.push(rawArgs[i]);
      }
    }

    return { rawPositionalParamArguments, rawParamArguments };
  }
}

module.exports = { Parser };
