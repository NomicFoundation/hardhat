import {
  HardhatParamDefinitions,
  ParamDefinition,
  ParamDefinitionsMap,
  TasksMap,
} from "../../types";
import { HardhatError } from "../core/errors";
import { ERRORS } from "../core/errors-list";

import { ArgumentsParser } from "./ArgumentsParser";

export class HelpPrinter {
  constructor(
    private readonly _programName: string,
    private readonly _executableName: string,
    private readonly _version: string,
    private readonly _hardhatParamDefinitions: HardhatParamDefinitions,
    private readonly _tasks: TasksMap
  ) {}

  public printGlobalHelp(includeSubtasks = false) {
    console.log(`${this._programName} version ${this._version}\n`);

    console.log(
      `Usage: ${this._executableName} [GLOBAL OPTIONS] <TASK> [TASK OPTIONS]\n`
    );

    console.log("GLOBAL OPTIONS:\n");

    this._printParamDetails(this._hardhatParamDefinitions);

    console.log("\n\nAVAILABLE TASKS:\n");

    const tasksToShow: TasksMap = {};
    for (const [taskName, taskDefinition] of Object.entries(this._tasks)) {
      if (includeSubtasks || !taskDefinition.isSubtask) {
        tasksToShow[taskName] = taskDefinition;
      }
    }

    const nameLength = Object.keys(tasksToShow)
      .map((n) => n.length)
      .reduce((a, b) => Math.max(a, b), 0);

    for (const name of Object.keys(tasksToShow).sort()) {
      const { description = "" } = this._tasks[name];

      console.log(`  ${name.padEnd(nameLength)}\t${description}`);
    }

    console.log("");

    console.log(
      `To get help for a specific task run: npx ${this._executableName} help [task]\n`
    );
  }

  public printTaskHelp(taskName: string) {
    const taskDefinition = this._tasks[taskName];

    if (taskDefinition === undefined) {
      throw new HardhatError(ERRORS.ARGUMENTS.UNRECOGNIZED_TASK, {
        task: taskName,
      });
    }

    const {
      description = "",
      name,
      paramDefinitions,
      positionalParamDefinitions,
    } = taskDefinition;

    console.log(`${this._programName} version ${this._version}\n`);

    const paramsList = this._getParamsList(paramDefinitions);
    const positionalParamsList = this._getPositionalParamsList(
      positionalParamDefinitions
    );

    console.log(
      `Usage: ${this._executableName} [GLOBAL OPTIONS] ${name}${paramsList}${positionalParamsList}\n`
    );

    if (Object.keys(paramDefinitions).length > 0) {
      console.log("OPTIONS:\n");

      this._printParamDetails(paramDefinitions);

      console.log("");
    }

    if (positionalParamDefinitions.length > 0) {
      console.log("POSITIONAL ARGUMENTS:\n");

      this._printPositionalParamDetails(positionalParamDefinitions);

      console.log("");
    }

    console.log(`${name}: ${description}\n`);

    console.log(`For global options help run: ${this._executableName} help\n`);
  }

  private _getParamValueDescription<T>(paramDefinition: ParamDefinition<T>) {
    return `<${paramDefinition.type.name.toUpperCase()}>`;
  }

  private _getParamsList(paramDefinitions: ParamDefinitionsMap) {
    let paramsList = "";

    for (const name of Object.keys(paramDefinitions).sort()) {
      const definition = paramDefinitions[name];
      const { defaultValue, isFlag } = definition;

      paramsList += " ";

      if (defaultValue !== undefined) {
        paramsList += "[";
      }

      paramsList += `${ArgumentsParser.paramNameToCLA(name)}`;

      if (!isFlag) {
        paramsList += ` ${this._getParamValueDescription(definition)}`;
      }

      if (defaultValue !== undefined) {
        paramsList += "]";
      }
    }

    return paramsList;
  }

  private _getPositionalParamsList(
    positionalParamDefinitions: Array<ParamDefinition<any>>
  ) {
    let paramsList = "";

    for (const definition of positionalParamDefinitions) {
      const { defaultValue, isVariadic, name } = definition;

      paramsList += " ";

      if (defaultValue !== undefined) {
        paramsList += "[";
      }

      if (isVariadic) {
        paramsList += "...";
      }

      paramsList += name;

      if (defaultValue !== undefined) {
        paramsList += "]";
      }
    }

    return paramsList;
  }

  private _printParamDetails(paramDefinitions: ParamDefinitionsMap) {
    const paramsNameLength = Object.keys(paramDefinitions)
      .map((n) => ArgumentsParser.paramNameToCLA(n).length)
      .reduce((a, b) => Math.max(a, b), 0);

    for (const name of Object.keys(paramDefinitions).sort()) {
      const {
        description,
        defaultValue,
        isOptional,
        isFlag,
      } = paramDefinitions[name];

      let msg = `  ${ArgumentsParser.paramNameToCLA(name).padEnd(
        paramsNameLength
      )}\t`;

      if (description !== undefined) {
        msg += `${description} `;
      }

      if (isOptional && defaultValue !== undefined && !isFlag) {
        msg += `(default: ${JSON.stringify(defaultValue)})`;
      }

      console.log(msg);
    }
  }

  private _printPositionalParamDetails(
    positionalParamDefinitions: Array<ParamDefinition<any>>
  ) {
    const paramsNameLength = positionalParamDefinitions
      .map((d) => d.name.length)
      .reduce((a, b) => Math.max(a, b), 0);

    for (const definition of positionalParamDefinitions) {
      const { name, description, isOptional, defaultValue } = definition;

      let msg = `  ${name.padEnd(paramsNameLength)}\t`;

      if (description !== undefined) {
        msg += `${description} `;
      }

      if (isOptional && defaultValue !== undefined) {
        msg += `(default: ${JSON.stringify(defaultValue)})`;
      }

      console.log(msg);
    }
  }
}
