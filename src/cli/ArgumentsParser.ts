import { BuidlerError, ERRORS } from "../core/errors";

export class ArgumentsParser {
  static readonly PARAM_PREFIX = "--";

  static paramNameToCLA(paramName: string): string {
    return (
      ArgumentsParser.PARAM_PREFIX +
      paramName
        .split(/(?=[A-Z])/g)
        .map(s => s.toLowerCase())
        .join("-")
    );
  }

  static cLAToParamName(cLa: string): string {
    const parts = cLa.slice(ArgumentsParser.PARAM_PREFIX.length).split("-");

    return (
      parts[0] +
      parts
        .slice(1)
        .map(s => s[0].toUpperCase() + s.slice(1))
        .join("")
    );
  }

  parseBuidlerArgumetns(
    buidlerParamDefinitions,
    envVariableArguments: { [varName: string]: string },
    rawCLAs: string[]
  ) {
    const buidlerArguments = {};
    let taskName: string | undefined = undefined;
    const unparsedCLAs: string[] = [];

    for (let i = 0; i < rawCLAs.length; i++) {
      const arg = rawCLAs[i];

      if (taskName === undefined) {
        if (!this._hasCLAParamNameFormat(arg)) {
          taskName = arg;
          continue;
        }

        if (!this._isParamName(arg, buidlerParamDefinitions)) {
          throw new BuidlerError(
            ERRORS.ARGUMENT_PARSER_UNRECOGNIZED_COMMAND_LINE_ARG,
            arg
          );
        }

        i = this._parseArgumentAt(
          rawCLAs,
          i,
          buidlerParamDefinitions,
          buidlerArguments
        );
      } else {
        if (!this._isParamName(arg, buidlerParamDefinitions)) {
          unparsedCLAs.push(arg);
          continue;
        }

        i = this._parseArgumentAt(
          rawCLAs,
          i,
          buidlerParamDefinitions,
          buidlerArguments
        );
      }
    }

    this._addBuidlerDefaultArguments(
      buidlerParamDefinitions,
      envVariableArguments,
      buidlerArguments
    );

    return { buidlerArguments, taskName, unparsedCLAs };
  }

  parseTaskArguments(taskDefintion, rawCLAs) {
    const {
      paramArguments,
      rawPositionalArguments
    } = this._parseTaskParamArguments(taskDefintion, rawCLAs);

    const positionalArguments = this._parsePositionalParamArgs(
      rawPositionalArguments,
      taskDefintion.positionalParamDefinitions
    );

    return { ...paramArguments, ...positionalArguments };
  }

  _parseTaskParamArguments(taskDefintion, rawCLAs: string[]) {
    const paramArguments = {};
    const rawPositionalArguments: string[] = [];

    for (let i = 0; i < rawCLAs.length; i++) {
      const arg = rawCLAs[i];

      if (!this._hasCLAParamNameFormat(arg)) {
        rawPositionalArguments.push(arg);
        continue;
      }

      if (!this._isParamName(arg, taskDefintion.paramDefinitions)) {
        throw new BuidlerError(
          ERRORS.ARGUMENT_PARSER_UNRECOGNIZED_PARAM_NAME,
          arg
        );
      }

      i = this._parseArgumentAt(
        rawCLAs,
        i,
        taskDefintion.paramDefinitions,
        paramArguments
      );
    }

    this._addTaskDefaultArguments(taskDefintion, paramArguments);

    return { paramArguments, rawPositionalArguments };
  }

  _addBuidlerDefaultArguments(
    buidlerParamDefinitions,
    envVariableArguments,
    buidlerArguments
  ) {
    for (const paramName of Object.keys(buidlerParamDefinitions)) {
      const definition = buidlerParamDefinitions[paramName];
      const envVarArgument = envVariableArguments[paramName];

      if (buidlerArguments[paramName] === undefined) {
        if (envVarArgument !== undefined) {
          buidlerArguments[paramName] = envVarArgument;
        } else if (definition.isOptional) {
          buidlerArguments[paramName] = definition.defaultValue;
        } else {
          throw new BuidlerError(
            ERRORS.ARGUMENT_PARSER_MISSING_BUIDLER_ARGUMENT,
            paramName
          );
        }
      }
    }
  }

  _addTaskDefaultArguments(taskDefintion, taskArguments) {
    for (const paramName of Object.keys(taskDefintion.paramDefinitions)) {
      const definition = taskDefintion.paramDefinitions[paramName];

      if (taskArguments[paramName] === undefined) {
        if (definition.isOptional) {
          taskArguments[paramName] = definition.defaultValue;
        } else {
          throw new BuidlerError(
            ERRORS.ARGUMENT_PARSER_MISSING_TASK_ARGUMENT,
            paramName
          );
        }
      }
    }
  }

  _isParamName(str, paramDefinitions) {
    if (!this._hasCLAParamNameFormat(str)) {
      return false;
    }

    const name = ArgumentsParser.cLAToParamName(str);
    return paramDefinitions[name] !== undefined;
  }

  _hasCLAParamNameFormat(str) {
    return str.startsWith(ArgumentsParser.PARAM_PREFIX);
  }

  _parseArgumentAt(rawCLAs, index, paramDefinitions, parsedArguments) {
    const claArg = rawCLAs[index];
    const paramName = ArgumentsParser.cLAToParamName(claArg);
    const definition = paramDefinitions[paramName];

    if (parsedArguments[paramName] !== undefined) {
      throw new BuidlerError(ERRORS.ARGUMENT_PARSER_REPEATED_PARAM, claArg);
    }

    if (definition.isFlag) {
      parsedArguments[paramName] = true;
    } else {
      index++;
      const value = rawCLAs[index];
      parsedArguments[paramName] = definition.type.parse(paramName, value);
    }

    return index;
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
        if (!definition.isOptional) {
          throw new BuidlerError(
            ERRORS.ARGUMENT_PARSER_MISSING_POSITIONAL_ARG,
            definition.name
          );
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
      throw new BuidlerError(
        ERRORS.ARGUMENT_PARSER_UNRECOGNIZED_POSITIONAL_ARG,
        rawPositionalParamArgs[positionalParamDefinitions.length]
      );
    }

    return args;
  }
}
