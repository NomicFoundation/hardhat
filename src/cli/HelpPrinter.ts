import { BuidlerError, ERRORS } from "../core/errors";
import { BuidlerParamDefinitons } from "../core/params/buidler-params";
import {
  ParamDefinition,
  ParamDefinitionsMap
} from "../core/tasks/task-definitions";
import { TasksMap } from "../types";

import { ArgumentsParser } from "./ArgumentsParser";

export class HelpPrinter {
  constructor(
    private readonly programName: string,
    private readonly version: string,
    private readonly buidlerParamDefinitions: BuidlerParamDefinitons,
    private readonly tasks: TasksMap
  ) {}

  public printGlobalHelp(includeInternalTasks = false) {
    console.log(`${this.programName} version ${this.version}\n`);

    console.log(
      `Usage: ${this.programName} [GLOBAL OPTIONS] <TASK> [TASK OPTIONS]\n`
    );

    console.log("GLOBAL OPTIONS:\n");

    this._printParamDetails(this.buidlerParamDefinitions);

    console.log("\n\nAVAILABLE TASKS:\n");

    const tasksToShow: TasksMap = {};
    for (const [taskName, taskDefinition] of Object.entries(this.tasks)) {
      if (includeInternalTasks || !taskDefinition.isInternal) {
        tasksToShow[taskName] = taskDefinition;
      }
    }

    const nameLength = Object.keys(tasksToShow)
      .map(n => n.length)
      .reduce((a, b) => Math.max(a, b), 0);

    for (const name of Object.keys(tasksToShow).sort()) {
      const description = this.tasks[name].description || "";
      console.log(`  ${name.padEnd(nameLength)}\t${description}`);
    }

    console.log("");

    console.log(
      `For tasks' specific help run: ${this.programName} help [task]\n`
    );
  }

  public printTaskHelp(taskName: string) {
    const taskDefinition = this.tasks[taskName];

    if (taskDefinition === undefined) {
      throw new BuidlerError(ERRORS.HELP_PRINTER_UNRECOGNIZED_TASK, taskName);
    }

    const description = taskDefinition.description || "";

    console.log(`${this.programName} version ${this.version}\n`);

    console.log(
      `Usage: ${this.programName} [GLOBAL OPTIONS] ${
        taskDefinition.name
      }${this._getParamsList(
        taskDefinition.paramDefinitions
      )}${this._getPositionalParamsList(
        taskDefinition.positionalParamDefinitions
      )}\n`
    );

    if (Object.keys(taskDefinition.paramDefinitions).length > 0) {
      console.log("OPTIONS:\n");

      this._printParamDetails(taskDefinition.paramDefinitions);

      console.log("");
    }

    if (taskDefinition.positionalParamDefinitions.length > 0) {
      console.log("POSITIONAL ARGUMENTS:\n");

      this._printPositionalParamDetails(
        taskDefinition.positionalParamDefinitions
      );

      console.log("");
    }

    console.log(`Help for task ${taskDefinition.name}: ${description}\n`);

    console.log(`For global options help run: ${this.programName} help\n`);
  }

  public _getParamValueDescription<T>(paramDefinition: ParamDefinition<T>) {
    return `<${paramDefinition.type.name.toUpperCase()}>`;
  }

  public _getParamsList(paramDefinitions: ParamDefinitionsMap) {
    let paramsList = "";

    for (const name of Object.keys(paramDefinitions).sort()) {
      const definition = paramDefinitions[name];

      paramsList += " ";

      if (definition.defaultValue !== undefined) {
        paramsList += "[";
      }

      paramsList += `${ArgumentsParser.paramNameToCLA(name)}`;

      if (!definition.isFlag) {
        paramsList += ` ${this._getParamValueDescription(definition)}`;
      }

      if (definition.defaultValue !== undefined) {
        paramsList += "]";
      }
    }

    return paramsList;
  }

  public _getPositionalParamsList(
    positionalParamDefinitions: Array<ParamDefinition<any>>
  ) {
    let paramsList = "";

    for (const definition of positionalParamDefinitions) {
      paramsList += " ";

      if (definition.defaultValue !== undefined) {
        paramsList += "[";
      }

      if (definition.isVariadic) {
        paramsList += "...";
      }

      paramsList += definition.name;

      if (definition.defaultValue !== undefined) {
        paramsList += "]";
      }
    }

    return paramsList;
  }

  public _printParamDetails(paramDefinitions: ParamDefinitionsMap) {
    const paramsNameLength = Object.keys(paramDefinitions)
      .map(n => ArgumentsParser.paramNameToCLA(n).length)
      .reduce((a, b) => Math.max(a, b), 0);

    for (const name of Object.keys(paramDefinitions).sort()) {
      const definition = paramDefinitions[name];
      const description = definition.description;
      const defaultValue = definition.defaultValue;

      let msg = `  ${ArgumentsParser.paramNameToCLA(name).padEnd(
        paramsNameLength
      )}\t`;

      if (description !== undefined) {
        msg += `${description} `;
      }

      if (
        definition.isOptional &&
        defaultValue !== undefined &&
        !definition.isFlag
      ) {
        msg += `(default: ${JSON.stringify(defaultValue)})`;
      }

      console.log(msg);
    }
  }

  public _printPositionalParamDetails(
    positionalParamDefinitions: Array<ParamDefinition<any>>
  ) {
    const paramsNameLength = positionalParamDefinitions
      .map(d => d.name.length)
      .reduce((a, b) => Math.max(a, b), 0);

    for (const definition of positionalParamDefinitions) {
      const name = definition.name;
      const description = definition.description;

      let msg = `  ${name.padEnd(paramsNameLength)}\t`;

      if (description !== undefined) {
        msg += `${description} `;
      }

      if (definition.isOptional && definition.defaultValue !== undefined) {
        msg += `(default: ${JSON.stringify(definition.defaultValue)})`;
      }

      console.log(msg);
    }
  }
}
