import { MessageTrace } from "./message-trace";
interface ConsoleLogArray extends Array<ConsoleLogEntry> {
}
export declare type ConsoleLogEntry = string | ConsoleLogArray;
export declare type ConsoleLogs = ConsoleLogEntry[];
export declare class ConsoleLogger {
    private readonly _consoleLogs;
    constructor();
    getLogMessages(maybeDecodedMessageTrace: MessageTrace): string[];
    getExecutionLogs(maybeDecodedMessageTrace: MessageTrace): ConsoleLogs[];
    private _collectExecutionLogs;
    private _maybeConsoleLog;
    private _decode;
}
export {};
//# sourceMappingURL=consoleLogger.d.ts.map