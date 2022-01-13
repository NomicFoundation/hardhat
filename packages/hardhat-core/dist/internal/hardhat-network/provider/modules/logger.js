"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModulesLogger = void 0;
const ansi_escapes_1 = __importDefault(require("ansi-escapes"));
const chalk_1 = __importDefault(require("chalk"));
const ethereumjs_util_1 = require("ethereumjs-util");
const util_1 = __importDefault(require("util"));
const errors_1 = require("../../../core/errors");
const errors_2 = require("../../../core/providers/errors");
const wei_values_1 = require("../../../util/wei-values");
const message_trace_1 = require("../../stack-traces/message-trace");
const model_1 = require("../../stack-traces/model");
const solidity_errors_1 = require("../../stack-traces/solidity-errors");
const solidity_stack_trace_1 = require("../../stack-traces/solidity-stack-trace");
function printLine(line) {
    console.log(line);
}
function replaceLastLine(newLine) {
    if (process.stdout.isTTY === true) {
        process.stdout.write(
        // eslint-disable-next-line prefer-template
        ansi_escapes_1.default.cursorHide +
            ansi_escapes_1.default.cursorPrevLine +
            newLine +
            ansi_escapes_1.default.eraseEndLine +
            "\n" +
            ansi_escapes_1.default.cursorShow);
    }
    else {
        process.stdout.write(`${newLine}\n`);
    }
}
/**
 * Handles all the logging made from the Hardhat Network.
 *
 * Methods of this class follow this convention:
 * - Methods that start with `log` add those messages to a list of things to log
 * - Methods that start with `print` print to stdout immediately
 */
class ModulesLogger {
    constructor(_enabled, _printLine = printLine, _replaceLastLine = replaceLastLine) {
        this._enabled = _enabled;
        this._printLine = _printLine;
        this._replaceLastLine = _replaceLastLine;
        this._logs = [];
        this._titleLength = 0;
        this._currentIndent = 0;
        this._emptyMinedBlocksRangeStart = undefined;
        this._methodCollapsedCount = 0;
    }
    isEnabled() {
        return this._enabled;
    }
    setEnabled(enabled) {
        this._enabled = enabled;
    }
    isLoggedError(err) {
        return (err instanceof solidity_errors_1.SolidityError || err instanceof errors_2.TransactionExecutionError);
    }
    logBlockFromAutomine(result, codes, txHashToHighlight) {
        const { block, blockResult, traces } = result;
        const { results } = blockResult;
        (0, errors_1.assertHardhatInvariant)(results.length === codes.length, "The array of codes should have the same length as the array of results");
        this._indent(() => {
            this._logBlockNumber(block);
            this._indent(() => {
                this._logBaseFeePerGas(block);
                for (let i = 0; i < block.transactions.length; i++) {
                    const tx = block.transactions[i];
                    const txGasUsed = results[i].gasUsed.toNumber();
                    const txTrace = traces[i];
                    const code = codes[i];
                    const highlightTxHash = tx.hash().equals(txHashToHighlight);
                    this._logTxInsideBlock(tx, txTrace, code, txGasUsed, {
                        highlightTxHash,
                    });
                    this._logEmptyLineBetweenTransactions(i, block.transactions.length);
                }
            });
        });
    }
    logMinedBlock(result, codes) {
        const { block, blockResult, traces } = result;
        const { results } = blockResult;
        (0, errors_1.assertHardhatInvariant)(results.length === codes.length, "The array of codes should have the same length as the array of results");
        const blockNumber = result.block.header.number.toNumber();
        const isEmpty = result.block.transactions.length === 0;
        this._indent(() => {
            this.logMinedBlockNumber(blockNumber, isEmpty, block.header.baseFeePerGas);
            if (isEmpty) {
                return;
            }
            this._indent(() => {
                this._logBlockHash(block);
                this._indent(() => {
                    this._logBaseFeePerGas(block);
                    for (let i = 0; i < block.transactions.length; i++) {
                        const tx = block.transactions[i];
                        const txGasUsed = results[i].gasUsed.toNumber();
                        const txTrace = traces[i];
                        const code = codes[i];
                        this._logTxInsideBlock(tx, txTrace, code, txGasUsed, {
                            highlightTxHash: false,
                        });
                        this._logEmptyLineBetweenTransactions(i, block.transactions.length);
                    }
                });
            });
        });
    }
    logIntervalMinedBlock(result, codes) {
        const { block, blockResult, traces } = result;
        const { results } = blockResult;
        (0, errors_1.assertHardhatInvariant)(results.length === codes.length, "The array of codes should have the same length as the array of results");
        this._indent(() => {
            this._logBlockHash(block);
            this._indent(() => {
                this._logBaseFeePerGas(block);
                for (let i = 0; i < block.transactions.length; i++) {
                    const tx = block.transactions[i];
                    const txGasUsed = results[i].gasUsed.toNumber();
                    const txTrace = traces[i];
                    const code = codes[i];
                    this._logTxInsideBlock(tx, txTrace, code, txGasUsed, {
                        highlightTxHash: false,
                    });
                    this._logEmptyLineBetweenTransactions(i, block.transactions.length);
                }
            });
        });
    }
    logSingleTransaction(tx, block, txGasUsed, txTrace, code) {
        this._indent(() => {
            var _a;
            this._logContractAndFunctionName(txTrace.trace, code);
            const txHash = (0, ethereumjs_util_1.bufferToHex)(tx.hash());
            this._logWithTitle("Transaction", txHash);
            this._logTxFrom(tx.getSenderAddress().toBuffer());
            this._logTxTo((_a = tx.to) === null || _a === void 0 ? void 0 : _a.toBuffer(), txTrace.trace);
            this._logTxValue(new ethereumjs_util_1.BN(tx.value));
            this._logWithTitle("Gas used", `${txGasUsed} of ${tx.gasLimit.toNumber()}`);
            this._logWithTitle(`Block #${block.header.number.toNumber()}`, (0, ethereumjs_util_1.bufferToHex)(block.hash()));
            this._logConsoleLogMessages(txTrace.consoleLogMessages);
            if (txTrace.error !== undefined) {
                this._logError(txTrace.error);
            }
        });
    }
    logCurrentlySentTransaction(tx, txGasUsed, txTrace, code, block) {
        this._indent(() => {
            var _a;
            this._log("Currently sent transaction:");
            this.logEmptyLine();
            this._logContractAndFunctionName(txTrace.trace, code);
            const txHash = (0, ethereumjs_util_1.bufferToHex)(tx.hash());
            this._logWithTitle("Transaction", txHash);
            this._logTxFrom(tx.getSenderAddress().toBuffer());
            this._logTxTo((_a = tx.to) === null || _a === void 0 ? void 0 : _a.toBuffer(), txTrace.trace);
            this._logTxValue(new ethereumjs_util_1.BN(tx.value));
            this._logWithTitle("Gas used", `${txGasUsed} of ${tx.gasLimit.toNumber()}`);
            this._logWithTitle(`Block #${block.header.number.toNumber()}`, (0, ethereumjs_util_1.bufferToHex)(block.hash()));
            this._logConsoleLogMessages(txTrace.consoleLogMessages);
            if (txTrace.error !== undefined) {
                this._logError(txTrace.error);
            }
        });
    }
    logEstimateGasTrace(callParams, code, trace, consoleLogMessages, error) {
        this._indent(() => {
            this._logContractAndFunctionName(trace, code, {
                printNonContractCalled: true,
            });
            this._logTxFrom(callParams.from);
            this._logTxTo(callParams.to, trace);
            this._logTxValue(new ethereumjs_util_1.BN(callParams.value));
            this._logConsoleLogMessages(consoleLogMessages);
            this._logError(error);
        });
    }
    logCallTrace(callParams, code, trace, consoleLogMessages, error) {
        this._indent(() => {
            this._logContractAndFunctionName(trace, code, {
                printNonContractCalled: true,
            });
            this._logTxFrom(callParams.from);
            this._logTxTo(callParams.to, trace);
            if (callParams.value.gtn(0)) {
                this._logTxValue(callParams.value);
            }
            this._logConsoleLogMessages(consoleLogMessages);
            if (error !== undefined) {
                // TODO: If throwOnCallFailures is false, this will log the error, but the RPC method won't be red
                this._logError(error);
            }
        });
    }
    logMinedBlockNumber(blockNumber, isEmpty, baseFeePerGas) {
        if (isEmpty) {
            this._log(`Mined empty block #${blockNumber}${baseFeePerGas !== undefined ? ` with base fee ${baseFeePerGas}` : ""}`);
            return;
        }
        this._log(`Mined block #${blockNumber}`);
    }
    logMultipleTransactionsWarning() {
        this._indent(() => {
            this._log("There were other pending transactions mined in the same block:");
        });
        this.logEmptyLine();
    }
    logMultipleBlocksWarning() {
        this._indent(() => {
            this._log("There were other pending transactions. More than one block had to be mined:");
        });
        this.logEmptyLine();
    }
    logEmptyLine() {
        this._log("");
    }
    _logBaseFeePerGas(block) {
        if (block.header.baseFeePerGas !== undefined) {
            this._log(`Base fee: ${block.header.baseFeePerGas}`);
        }
    }
    printErrorMessage(errorMessage) {
        this._indent(() => {
            this._print(errorMessage);
        });
    }
    printFailedMethod(method) {
        this._print(method, { color: chalk_1.default.red });
    }
    /**
     * Print all accumulated logs
     */
    printLogs() {
        const logs = this._getLogs();
        if (logs.length === 0) {
            return false;
        }
        for (const msg of logs) {
            this._print(msg);
        }
        this._clearLogs();
        return true;
    }
    printMinedBlockNumber(blockNumber, isEmpty, baseFeePerGas) {
        if (this._emptyMinedBlocksRangeStart !== undefined) {
            this._print(`Mined empty block range #${this._emptyMinedBlocksRangeStart} to #${blockNumber}`, { collapseMinedBlock: true, replaceLastLine: true });
        }
        else {
            this._emptyMinedBlocksRangeStart = blockNumber;
            if (isEmpty) {
                this._print(`Mined empty block #${blockNumber}${baseFeePerGas !== undefined ? ` with base fee ${baseFeePerGas}` : ""}`, {
                    collapseMinedBlock: true,
                });
                return;
            }
            this._print(`Mined block #${blockNumber}`, {
                collapseMinedBlock: true,
            });
        }
    }
    printMetaMaskWarning() {
        const message = "If you are using MetaMask, you can learn how to fix this error here: https://hardhat.org/metamask-issue";
        this._indent(() => {
            this._print(message, { color: chalk_1.default.yellow });
        });
    }
    printMethod(method) {
        if (this._shouldCollapseMethod(method)) {
            this._methodCollapsedCount += 1;
            this._print(chalk_1.default.green(`${method} (${this._methodCollapsedCount})`), {
                collapsePrintedMethod: true,
                replaceLastLine: true,
            });
        }
        else {
            this._startCollapsingMethod(method);
            this._print(method, { color: chalk_1.default.green, collapsePrintedMethod: true });
        }
    }
    printMethodNotSupported(method) {
        this._print(`${method} - Method not supported`, { color: chalk_1.default.red });
    }
    printEmptyLine() {
        this._print("");
    }
    printUnknownError(err) {
        this._indent(() => {
            this._printError(err);
            this.printEmptyLine();
            this._print("If you think this is a bug in Hardhat, please report it here: https://hardhat.org/reportbug");
        });
    }
    _format(msg, { color } = {}) {
        if (msg === "") {
            // don't indent empty lines
            return msg;
        }
        if (this._currentIndent > 0) {
            msg = msg
                .split("\n")
                .map((line) => " ".repeat(this._currentIndent) + line)
                .join("\n");
        }
        if (color !== undefined) {
            return color(msg);
        }
        return msg;
    }
    _indent(cb, enabled = true) {
        if (enabled) {
            this._currentIndent += 2;
        }
        try {
            return cb();
        }
        finally {
            if (enabled) {
                this._currentIndent -= 2;
            }
        }
    }
    _indentSingleLine(message) {
        return " ".repeat(this._currentIndent) + message;
    }
    _log(msg, printOptions = {}) {
        if (printOptions.collapsePrintedMethod !== true) {
            this._stopCollapsingMethod();
        }
        if (printOptions.collapseMinedBlock !== true) {
            this._emptyMinedBlocksRangeStart = undefined;
        }
        const formattedMessage = this._format(msg, printOptions);
        this._logs.push(formattedMessage);
    }
    _logError(err) {
        if (this.isLoggedError(err)) {
            this.logEmptyLine();
            this._log(util_1.default.inspect(err));
        }
    }
    _logTxInsideBlock(tx, txTrace, code, txGasUsed, { highlightTxHash, }) {
        // indentAfterTransactionHash: true,
        // printTxBlockNumber: false,
        // startWithTxHash: true,
        let txHash = (0, ethereumjs_util_1.bufferToHex)(tx.hash());
        if (highlightTxHash) {
            txHash = chalk_1.default.bold(txHash);
        }
        this._logWithTitle("Transaction", txHash);
        this._indent(() => {
            var _a;
            this._logContractAndFunctionName(txTrace.trace, code);
            this._logTxFrom(tx.getSenderAddress().toBuffer());
            this._logTxTo((_a = tx.to) === null || _a === void 0 ? void 0 : _a.toBuffer(), txTrace.trace);
            this._logTxValue(new ethereumjs_util_1.BN(tx.value));
            this._logWithTitle("Gas used", `${txGasUsed} of ${tx.gasLimit.toNumber()}`);
            this._logConsoleLogMessages(txTrace.consoleLogMessages);
            if (txTrace.error !== undefined) {
                this._logError(txTrace.error);
            }
        });
    }
    /**
     *  This should be the only function that calls _printLine and
     *  _replaceLastLine (except for the special console.sol case),
     *  because it's the only function that checks if the logger
     *  is enabled.
     */
    _print(msg, printOptions = {}) {
        if (!this._enabled) {
            return;
        }
        if (printOptions.collapsePrintedMethod !== true) {
            this._stopCollapsingMethod();
        }
        if (printOptions.collapseMinedBlock !== true) {
            this._emptyMinedBlocksRangeStart = undefined;
        }
        const formattedMessage = this._format(msg, printOptions);
        if (printOptions.replaceLastLine === true) {
            this._replaceLastLine(formattedMessage);
        }
        else {
            this._printLine(formattedMessage);
        }
    }
    _printError(err) {
        if (this.isLoggedError(err)) {
            this.printEmptyLine();
            this._print(util_1.default.inspect(err));
        }
    }
    _logContractAndFunctionName(trace, code, { printNonContractCalled = false, } = {}) {
        if (trace === undefined) {
            return;
        }
        if ((0, message_trace_1.isPrecompileTrace)(trace)) {
            this._logWithTitle("Precompile call", `<PrecompileContract ${trace.precompile}>`);
            return;
        }
        if ((0, message_trace_1.isCreateTrace)(trace)) {
            if (trace.bytecode === undefined) {
                this._logWithTitle("Contract deployment", solidity_stack_trace_1.UNRECOGNIZED_CONTRACT_NAME);
            }
            else {
                this._logWithTitle("Contract deployment", trace.bytecode.contract.name);
            }
            if (trace.deployedContract !== undefined && trace.error === undefined) {
                this._logWithTitle("Contract address", (0, ethereumjs_util_1.bufferToHex)(trace.deployedContract));
            }
            return;
        }
        if (code.length === 0) {
            if (printNonContractCalled) {
                this._log(`WARNING: Calling an account which is not a contract`);
            }
            return;
        }
        if (trace.bytecode === undefined) {
            this._logWithTitle("Contract call", solidity_stack_trace_1.UNRECOGNIZED_CONTRACT_NAME);
            return;
        }
        const func = trace.bytecode.contract.getFunctionFromSelector(trace.calldata.slice(0, 4));
        const functionName = func === undefined
            ? solidity_stack_trace_1.UNRECOGNIZED_FUNCTION_NAME
            : func.type === model_1.ContractFunctionType.FALLBACK
                ? solidity_stack_trace_1.FALLBACK_FUNCTION_NAME
                : func.type === model_1.ContractFunctionType.RECEIVE
                    ? solidity_stack_trace_1.RECEIVE_FUNCTION_NAME
                    : func.name;
        this._logWithTitle("Contract call", `${trace.bytecode.contract.name}#${functionName}`);
    }
    _shouldCollapseMethod(method) {
        return (method === this._methodBeingCollapsed &&
            !this._hasLogs() &&
            this._methodCollapsedCount > 0);
    }
    _startCollapsingMethod(method) {
        this._methodBeingCollapsed = method;
        this._methodCollapsedCount = 1;
    }
    _stopCollapsingMethod() {
        this._methodBeingCollapsed = undefined;
        this._methodCollapsedCount = 0;
    }
    _logTxTo(to, trace) {
        if (trace !== undefined && (0, message_trace_1.isCreateTrace)(trace)) {
            return;
        }
        if (to === undefined) {
            // only for the type-checker, since `to` is undefined only when
            // the message is a create trace
            return;
        }
        const toString = (0, ethereumjs_util_1.bufferToHex)(to);
        this._logWithTitle("To", toString);
    }
    _logTxValue(value) {
        this._logWithTitle("Value", (0, wei_values_1.weiToHumanReadableString)(value));
    }
    _logTxFrom(from) {
        this._logWithTitle("From", (0, ethereumjs_util_1.bufferToHex)(from));
    }
    _logBlockNumber(block) {
        this._log(`Block #${block.header.number.toNumber()}: ${(0, ethereumjs_util_1.bufferToHex)(block.hash())}`);
    }
    _logEmptyLineBetweenTransactions(currentIndex, totalTransactions) {
        if (currentIndex + 1 < totalTransactions && totalTransactions > 1) {
            this.logEmptyLine();
        }
    }
    _logBlockHash(block) {
        this._log(`Block: ${(0, ethereumjs_util_1.bufferToHex)(block.hash())}`);
    }
    _logConsoleLogMessages(messages) {
        // This is a especial case, as we always want to print the console.log
        // messages. The difference is how.
        // If we have a logger, we should use that, so that logs are printed in
        // order. If we don't, we just print the messages here.
        if (!this._enabled) {
            for (const msg of messages) {
                this._printLine(msg);
            }
            return;
        }
        if (messages.length === 0) {
            return;
        }
        this.logEmptyLine();
        this._log("console.log:");
        for (const msg of messages) {
            this._log(`  ${msg}`);
        }
    }
    _logWithTitle(title, message) {
        title = this._indentSingleLine(title);
        // We always use the max title length we've seen. Otherwise the value move
        // a lot with each tx/call.
        if (title.length > this._titleLength) {
            this._titleLength = title.length;
        }
        this._logs.push([title, message]);
    }
    _clearLogs() {
        this._logs = [];
    }
    _hasLogs() {
        return this._logs.length > 0;
    }
    _getLogs() {
        return this._logs.map((l) => {
            if (typeof l === "string") {
                return l;
            }
            const title = `${l[0]}:`;
            return `${title.padEnd(this._titleLength + 1)} ${l[1]}`;
        });
    }
}
exports.ModulesLogger = ModulesLogger;
//# sourceMappingURL=logger.js.map