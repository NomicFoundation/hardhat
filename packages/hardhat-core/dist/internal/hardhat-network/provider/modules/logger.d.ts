/// <reference types="node" />
import { Block } from "@ethereumjs/block";
import { TypedTransaction } from "@ethereumjs/tx";
import { BN } from "ethereumjs-util";
import { MessageTrace } from "../../stack-traces/message-trace";
import { CallParams, GatherTracesResult, MineBlockResult } from "../node-types";
declare function printLine(line: string): void;
declare function replaceLastLine(newLine: string): void;
/**
 * Handles all the logging made from the Hardhat Network.
 *
 * Methods of this class follow this convention:
 * - Methods that start with `log` add those messages to a list of things to log
 * - Methods that start with `print` print to stdout immediately
 */
export declare class ModulesLogger {
    private _enabled;
    private _printLine;
    private _replaceLastLine;
    private _logs;
    private _titleLength;
    private _currentIndent;
    private _emptyMinedBlocksRangeStart;
    private _methodBeingCollapsed?;
    private _methodCollapsedCount;
    constructor(_enabled: boolean, _printLine?: typeof printLine, _replaceLastLine?: typeof replaceLastLine);
    isEnabled(): boolean;
    setEnabled(enabled: boolean): void;
    isLoggedError(err: Error): boolean;
    logBlockFromAutomine(result: MineBlockResult, codes: Buffer[], txHashToHighlight: Buffer): void;
    logMinedBlock(result: MineBlockResult, codes: Buffer[]): void;
    logIntervalMinedBlock(result: MineBlockResult, codes: Buffer[]): void;
    logSingleTransaction(tx: TypedTransaction, block: Block, txGasUsed: number, txTrace: GatherTracesResult, code: Buffer): void;
    logCurrentlySentTransaction(tx: TypedTransaction, txGasUsed: number, txTrace: GatherTracesResult, code: Buffer, block: Block): void;
    logEstimateGasTrace(callParams: CallParams, code: Buffer, trace: MessageTrace | undefined, consoleLogMessages: string[], error: Error): void;
    logCallTrace(callParams: CallParams, code: Buffer, trace: MessageTrace | undefined, consoleLogMessages: string[], error: Error | undefined): void;
    logMinedBlockNumber(blockNumber: number, isEmpty: boolean, baseFeePerGas?: BN): void;
    logMultipleTransactionsWarning(): void;
    logMultipleBlocksWarning(): void;
    logEmptyLine(): void;
    private _logBaseFeePerGas;
    printErrorMessage(errorMessage: string): void;
    printFailedMethod(method: string): void;
    /**
     * Print all accumulated logs
     */
    printLogs(): boolean;
    printMinedBlockNumber(blockNumber: number, isEmpty: boolean, baseFeePerGas?: BN): void;
    printMetaMaskWarning(): void;
    printMethod(method: string): void;
    printMethodNotSupported(method: string): void;
    printEmptyLine(): void;
    printUnknownError(err: Error): void;
    private _format;
    private _indent;
    private _indentSingleLine;
    private _log;
    private _logError;
    private _logTxInsideBlock;
    /**
     *  This should be the only function that calls _printLine and
     *  _replaceLastLine (except for the special console.sol case),
     *  because it's the only function that checks if the logger
     *  is enabled.
     */
    private _print;
    private _printError;
    private _logContractAndFunctionName;
    private _shouldCollapseMethod;
    private _startCollapsingMethod;
    private _stopCollapsingMethod;
    private _logTxTo;
    private _logTxValue;
    private _logTxFrom;
    private _logBlockNumber;
    private _logEmptyLineBetweenTransactions;
    private _logBlockHash;
    private _logConsoleLogMessages;
    private _logWithTitle;
    private _clearLogs;
    private _hasLogs;
    private _getLogs;
}
export {};
//# sourceMappingURL=logger.d.ts.map