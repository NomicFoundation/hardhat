"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HelpPrinter = void 0;
const errors_1 = require("../core/errors");
const errors_list_1 = require("../core/errors-list");
const ArgumentsParser_1 = require("./ArgumentsParser");
class HelpPrinter {
    constructor(_programName, _executableName, _version, _hardhatParamDefinitions, _tasks) {
        this._programName = _programName;
        this._executableName = _executableName;
        this._version = _version;
        this._hardhatParamDefinitions = _hardhatParamDefinitions;
        this._tasks = _tasks;
    }
    printGlobalHelp(includeSubtasks = false) {
        console.log(`${this._programName} version ${this._version}\n`);
        console.log(`Usage: ${this._executableName} [GLOBAL OPTIONS] <TASK> [TASK OPTIONS]\n`);
        console.log("GLOBAL OPTIONS:\n");
        this._printParamDetails(this._hardhatParamDefinitions);
        console.log("\n\nAVAILABLE TASKS:\n");
        const tasksToShow = {};
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
        console.log(`To get help for a specific task run: npx ${this._executableName} help [task]\n`);
    }
    printTaskHelp(taskName) {
        const taskDefinition = this._tasks[taskName];
        if (taskDefinition === undefined) {
            throw new errors_1.HardhatError(errors_list_1.ERRORS.ARGUMENTS.UNRECOGNIZED_TASK, {
                task: taskName,
            });
        }
        const { description = "", name, paramDefinitions, positionalParamDefinitions, } = taskDefinition;
        console.log(`${this._programName} version ${this._version}\n`);
        const paramsList = this._getParamsList(paramDefinitions);
        const positionalParamsList = this._getPositionalParamsList(positionalParamDefinitions);
        console.log(`Usage: ${this._executableName} [GLOBAL OPTIONS] ${name}${paramsList}${positionalParamsList}\n`);
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
    _getParamValueDescription(paramDefinition) {
        return `<${paramDefinition.type.name.toUpperCase()}>`;
    }
    _getParamsList(paramDefinitions) {
        let paramsList = "";
        for (const name of Object.keys(paramDefinitions).sort()) {
            const definition = paramDefinitions[name];
            const { defaultValue, isFlag } = definition;
            paramsList += " ";
            if (defaultValue !== undefined) {
                paramsList += "[";
            }
            paramsList += `${ArgumentsParser_1.ArgumentsParser.paramNameToCLA(name)}`;
            if (!isFlag) {
                paramsList += ` ${this._getParamValueDescription(definition)}`;
            }
            if (defaultValue !== undefined) {
                paramsList += "]";
            }
        }
        return paramsList;
    }
    _getPositionalParamsList(positionalParamDefinitions) {
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
    _printParamDetails(paramDefinitions) {
        const paramsNameLength = Object.keys(paramDefinitions)
            .map((n) => ArgumentsParser_1.ArgumentsParser.paramNameToCLA(n).length)
            .reduce((a, b) => Math.max(a, b), 0);
        for (const name of Object.keys(paramDefinitions).sort()) {
            const { description, defaultValue, isOptional, isFlag } = paramDefinitions[name];
            let msg = `  ${ArgumentsParser_1.ArgumentsParser.paramNameToCLA(name).padEnd(paramsNameLength)}\t`;
            if (description !== undefined) {
                msg += `${description} `;
            }
            if (isOptional && defaultValue !== undefined && !isFlag) {
                msg += `(default: ${JSON.stringify(defaultValue)})`;
            }
            console.log(msg);
        }
    }
    _printPositionalParamDetails(positionalParamDefinitions) {
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
exports.HelpPrinter = HelpPrinter;
//# sourceMappingURL=HelpPrinter.js.map