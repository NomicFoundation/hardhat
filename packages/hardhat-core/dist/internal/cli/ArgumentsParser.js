"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArgumentsParser = void 0;
const errors_1 = require("../core/errors");
const errors_list_1 = require("../core/errors-list");
class ArgumentsParser {
    static paramNameToCLA(paramName) {
        return (ArgumentsParser.PARAM_PREFIX +
            paramName
                .split(/(?=[A-Z])/g)
                .map((s) => s.toLowerCase())
                .join("-"));
    }
    static cLAToParamName(cLA) {
        if (cLA.toLowerCase() !== cLA) {
            throw new errors_1.HardhatError(errors_list_1.ERRORS.ARGUMENTS.PARAM_NAME_INVALID_CASING, {
                param: cLA,
            });
        }
        const parts = cLA
            .slice(ArgumentsParser.PARAM_PREFIX.length)
            .split("-")
            .filter((x) => x.length > 0);
        return (parts[0] +
            parts
                .slice(1)
                .map((s) => s[0].toUpperCase() + s.slice(1))
                .join(""));
    }
    parseHardhatArguments(hardhatParamDefinitions, envVariableArguments, rawCLAs) {
        const hardhatArguments = {};
        let taskName;
        const unparsedCLAs = [];
        for (let i = 0; i < rawCLAs.length; i++) {
            const arg = rawCLAs[i];
            if (taskName === undefined) {
                if (!this._hasCLAParamNameFormat(arg)) {
                    taskName = arg;
                    continue;
                }
                if (!this._isCLAParamName(arg, hardhatParamDefinitions)) {
                    throw new errors_1.HardhatError(errors_list_1.ERRORS.ARGUMENTS.UNRECOGNIZED_COMMAND_LINE_ARG, { argument: arg });
                }
                i = this._parseArgumentAt(rawCLAs, i, hardhatParamDefinitions, hardhatArguments);
            }
            else {
                if (!this._isCLAParamName(arg, hardhatParamDefinitions)) {
                    unparsedCLAs.push(arg);
                    continue;
                }
                i = this._parseArgumentAt(rawCLAs, i, hardhatParamDefinitions, hardhatArguments);
            }
        }
        return {
            hardhatArguments: this._addHardhatDefaultArguments(hardhatParamDefinitions, envVariableArguments, hardhatArguments),
            taskName,
            unparsedCLAs,
        };
    }
    parseTaskArguments(taskDefinition, rawCLAs) {
        const { paramArguments, rawPositionalArguments } = this._parseTaskParamArguments(taskDefinition, rawCLAs);
        const positionalArguments = this._parsePositionalParamArgs(rawPositionalArguments, taskDefinition.positionalParamDefinitions);
        return Object.assign(Object.assign({}, paramArguments), positionalArguments);
    }
    _parseTaskParamArguments(taskDefinition, rawCLAs) {
        const paramArguments = {};
        const rawPositionalArguments = [];
        for (let i = 0; i < rawCLAs.length; i++) {
            const arg = rawCLAs[i];
            if (!this._hasCLAParamNameFormat(arg)) {
                rawPositionalArguments.push(arg);
                continue;
            }
            if (!this._isCLAParamName(arg, taskDefinition.paramDefinitions)) {
                throw new errors_1.HardhatError(errors_list_1.ERRORS.ARGUMENTS.UNRECOGNIZED_PARAM_NAME, {
                    param: arg,
                });
            }
            i = this._parseArgumentAt(rawCLAs, i, taskDefinition.paramDefinitions, paramArguments);
        }
        this._addTaskDefaultArguments(taskDefinition, paramArguments);
        return { paramArguments, rawPositionalArguments };
    }
    _addHardhatDefaultArguments(hardhatParamDefinitions, envVariableArguments, hardhatArguments) {
        return Object.assign(Object.assign({}, envVariableArguments), hardhatArguments);
    }
    _addTaskDefaultArguments(taskDefinition, taskArguments) {
        for (const paramName of Object.keys(taskDefinition.paramDefinitions)) {
            const definition = taskDefinition.paramDefinitions[paramName];
            if (taskArguments[paramName] !== undefined) {
                continue;
            }
            if (!definition.isOptional) {
                throw new errors_1.HardhatError(errors_list_1.ERRORS.ARGUMENTS.MISSING_TASK_ARGUMENT, {
                    param: ArgumentsParser.paramNameToCLA(paramName),
                });
            }
            taskArguments[paramName] = definition.defaultValue;
        }
    }
    _isCLAParamName(str, paramDefinitions) {
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
            throw new errors_1.HardhatError(errors_list_1.ERRORS.ARGUMENTS.REPEATED_PARAM, {
                param: claArg,
            });
        }
        if (definition.isFlag) {
            parsedArguments[paramName] = true;
        }
        else {
            index++;
            const value = rawCLAs[index];
            if (value === undefined) {
                throw new errors_1.HardhatError(errors_list_1.ERRORS.ARGUMENTS.MISSING_TASK_ARGUMENT, {
                    param: ArgumentsParser.paramNameToCLA(paramName),
                });
            }
            // We only parse the arguments of non-subtasks, and those only
            // accept CLIArgumentTypes.
            const type = definition.type;
            parsedArguments[paramName] = type.parse(paramName, value);
        }
        return index;
    }
    _parsePositionalParamArgs(rawPositionalParamArgs, positionalParamDefinitions) {
        const args = {};
        for (let i = 0; i < positionalParamDefinitions.length; i++) {
            const definition = positionalParamDefinitions[i];
            // We only parse the arguments of non-subtasks, and those only
            // accept CLIArgumentTypes.
            const type = definition.type;
            const rawArg = rawPositionalParamArgs[i];
            if (rawArg === undefined) {
                if (!definition.isOptional) {
                    throw new errors_1.HardhatError(errors_list_1.ERRORS.ARGUMENTS.MISSING_POSITIONAL_ARG, {
                        param: definition.name,
                    });
                }
                args[definition.name] = definition.defaultValue;
            }
            else if (!definition.isVariadic) {
                args[definition.name] = type.parse(definition.name, rawArg);
            }
            else {
                args[definition.name] = rawPositionalParamArgs
                    .slice(i)
                    .map((raw) => type.parse(definition.name, raw));
            }
        }
        const lastDefinition = positionalParamDefinitions[positionalParamDefinitions.length - 1];
        const hasVariadicParam = lastDefinition !== undefined && lastDefinition.isVariadic;
        if (!hasVariadicParam &&
            rawPositionalParamArgs.length > positionalParamDefinitions.length) {
            throw new errors_1.HardhatError(errors_list_1.ERRORS.ARGUMENTS.UNRECOGNIZED_POSITIONAL_ARG, {
                argument: rawPositionalParamArgs[positionalParamDefinitions.length],
            });
        }
        return args;
    }
}
exports.ArgumentsParser = ArgumentsParser;
ArgumentsParser.PARAM_PREFIX = "--";
//# sourceMappingURL=ArgumentsParser.js.map