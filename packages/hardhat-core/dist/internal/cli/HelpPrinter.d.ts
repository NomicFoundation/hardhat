import { HardhatParamDefinitions, TasksMap } from "../../types";
export declare class HelpPrinter {
    private readonly _programName;
    private readonly _executableName;
    private readonly _version;
    private readonly _hardhatParamDefinitions;
    private readonly _tasks;
    constructor(_programName: string, _executableName: string, _version: string, _hardhatParamDefinitions: HardhatParamDefinitions, _tasks: TasksMap);
    printGlobalHelp(includeSubtasks?: boolean): void;
    printTaskHelp(taskName: string): void;
    private _getParamValueDescription;
    private _getParamsList;
    private _getPositionalParamsList;
    private _printParamDetails;
    private _printPositionalParamDetails;
}
//# sourceMappingURL=HelpPrinter.d.ts.map