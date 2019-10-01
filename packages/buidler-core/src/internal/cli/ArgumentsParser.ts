import {
  BuidlerArguments,
  BuidlerParamDefinitions,
  ParamDefinition,
  ParamDefinitionsMap,
  TaskArguments,
  TaskDefinition
} from "../../types";
import { BuidlerError } from "../core/errors";
import { ERRORS } from "../core/errors-list";
import { unsafeObjectKeys } from "../util/unsafe";

export class ArgumentsParser {
  public static readonly PARAM_PREFIX = "--";

  public static paramNameToCLA(paramName: string): string {
    return (
      ArgumentsParser.PARAM_PREFIX +
      paramName
        .split(/(?=[A-Z])/g)
        .map(s => s.toLowerCase())
        .join("-")
    );
  }

  public static cLAToParamName(cLA: string): string {
    if (cLA.toLowerCase() !== cLA) {
      throw new BuidlerError(ERRORS.ARGUMENTS.PARAM_NAME_INVALID_CASING, {
        param: cLA
      });
    }

    const parts = cLA.slice(ArgumentsParser.PARAM_PREFIX.length).split("-");

    return (
      parts[0] +
      parts
        .slice(1)
        .map(s => s[0].toUpperCase() + s.slice(1))
        .join("")
    );
  }

  public parseBuidlerArguments(
    buidlerParamDefinitions: BuidlerParamDefinitions,
    envVariableArguments: BuidlerArguments,
    rawCLAs: string[]
  ): {
    buidlerArguments: BuidlerArguments;
    taskName?: string;
    unparsedCLAs: string[];
  } {
    const buidlerArguments: Partial<BuidlerArguments> = {};
    let taskName: string | undefined;
    const unparsedCLAs: string[] = [];

    for (let i = 0; i < rawCLAs.length; i++) {
      const arg = rawCLAs[i];

      if (taskName === undefined) {
        if (!this._hasCLAParamNameFormat(arg)) {
          taskName = arg;
          continue;
        }

        if (!this._isCLAParamName(arg, buidlerParamDefinitions)) {
          throw new BuidlerError(
            ERRORS.ARGUMENTS.UNRECOGNIZED_COMMAND_LINE_ARG,
            { argument: arg }
          );
        }

        i = this._parseArgumentAt(
          rawCLAs,
          i,
          buidlerParamDefinitions,
          buidlerArguments
        );
      } else {
        if (!this._isCLAParamName(arg, buidlerParamDefinitions)) {
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

    return {
      buidlerArguments: this._addBuidlerDefaultArguments(
        buidlerParamDefinitions,
        envVariableArguments,
        buidlerArguments
      ),
      taskName,
      unparsedCLAs
    };
  }

  public parseTaskArguments(
    taskDefinition: TaskDefinition,
    rawCLAs: string[]
  ): TaskArguments {
    const {
      paramArguments,
      rawPositionalArguments
    } = this._parseTaskParamArguments(taskDefinition, rawCLAs);

    const positionalArguments = this._parsePositionalParamArgs(
      rawPositionalArguments,
      taskDefinition.positionalParamDefinitions
    );

    return { ...paramArguments, ...positionalArguments };
  }

  public _parseTaskParamArguments(
    taskDefinition: TaskDefinition,
    rawCLAs: string[]
  ) {
    const paramArguments = {};
    const rawPositionalArguments: string[] = [];

    for (let i = 0; i < rawCLAs.length; i++) {
      const arg = rawCLAs[i];

      if (!this._hasCLAParamNameFormat(arg)) {
        rawPositionalArguments.push(arg);
        continue;
      }

      if (!this._isCLAParamName(arg, taskDefinition.paramDefinitions)) {
        throw new BuidlerError(ERRORS.ARGUMENTS.UNRECOGNIZED_PARAM_NAME, {
          param: arg
        });
      }

      i = this._parseArgumentAt(
        rawCLAs,
        i,
        taskDefinition.paramDefinitions,
        paramArguments
      );
    }

    this._addTaskDefaultArguments(taskDefinition, paramArguments);

    return { paramArguments, rawPositionalArguments };
  }

  public _addBuidlerDefaultArguments(
    buidlerParamDefinitions: BuidlerParamDefinitions,
    envVariableArguments: BuidlerArguments,
    buidlerArguments: Partial<BuidlerArguments>
  ): BuidlerArguments {
    return {
      ...envVariableArguments,
      ...buidlerArguments
    };
  }

  public _addTaskDefaultArguments(
    taskDefinition: TaskDefinition,
    taskArguments: TaskArguments
  ) {
    for (const paramName of Object.keys(taskDefinition.paramDefinitions)) {
      const definition = taskDefinition.paramDefinitions[paramName];

      if (taskArguments[paramName] === undefined) {
        if (definition.isOptional) {
          taskArguments[paramName] = definition.defaultValue;
        } else {
          throw new BuidlerError(ERRORS.ARGUMENTS.MISSING_TASK_ARGUMENT, {
            param: ArgumentsParser.paramNameToCLA(paramName)
          });
        }
      }
    }
  }

  public _isCLAParamName(str: string, paramDefinitions: ParamDefinitionsMap) {
    if (!this._hasCLAParamNameFormat(str)) {
      return false;
    }

    const name = ArgumentsParser.cLAToParamName(str);
    return paramDefinitions[name] !== undefined;
  }

  public _hasCLAParamNameFormat(str: string) {
    return str.startsWith(ArgumentsParser.PARAM_PREFIX);
  }

  public _parseArgumentAt(
    rawCLAs: string[],
    index: number,
    paramDefinitions: ParamDefinitionsMap,
    parsedArguments: TaskArguments
  ) {
    const claArg = rawCLAs[index];
    const paramName = ArgumentsParser.cLAToParamName(claArg);
    const definition = paramDefinitions[paramName];

    if (parsedArguments[paramName] !== undefined) {
      throw new BuidlerError(ERRORS.ARGUMENTS.REPEATED_PARAM, {
        param: claArg
      });
    }

    if (definition.isFlag) {
      parsedArguments[paramName] = true;
    } else {
      index++;
      const value = rawCLAs[index];

      if (value === undefined) {
        throw new BuidlerError(ERRORS.ARGUMENTS.MISSING_TASK_ARGUMENT, {
          param: ArgumentsParser.paramNameToCLA(paramName)
        });
      }

      parsedArguments[paramName] = definition.type.parse(paramName, value);
    }

    return index;
  }

  public _parsePositionalParamArgs(
    rawPositionalParamArgs: string[],
    positionalParamDefinitions: Array<ParamDefinition<any>>
  ): TaskArguments {
    const args: TaskArguments = {};

    for (let i = 0; i < positionalParamDefinitions.length; i++) {
      const definition = positionalParamDefinitions[i];

      const rawArg = rawPositionalParamArgs[i];

      if (rawArg === undefined) {
        if (!definition.isOptional) {
          throw new BuidlerError(ERRORS.ARGUMENTS.MISSING_POSITIONAL_ARG, {
            param: definition.name
          });
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
      throw new BuidlerError(ERRORS.ARGUMENTS.UNRECOGNIZED_POSITIONAL_ARG, {
        argument: rawPositionalParamArgs[positionalParamDefinitions.length]
      });
    }

    return args;
  }
}
