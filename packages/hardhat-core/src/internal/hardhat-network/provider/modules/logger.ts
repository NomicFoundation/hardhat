import { Block } from "@nomicfoundation/ethereumjs-block";
import { TypedTransaction } from "@nomicfoundation/ethereumjs-tx";
import {
  bytesToHex as bufferToHex,
  equalsBytes,
} from "@nomicfoundation/ethereumjs-util";
import ansiEscapes from "ansi-escapes";
import chalk, { Chalk } from "chalk";
import util from "util";

import { assertHardhatInvariant } from "../../../core/errors";
import { TransactionExecutionError } from "../../../core/providers/errors";
import { weiToHumanReadableString } from "../../../util/wei-values";
import {
  isCreateTrace,
  isPrecompileTrace,
  MessageTrace,
} from "../../stack-traces/message-trace";
import { ContractFunctionType } from "../../stack-traces/model";
import { SolidityError } from "../../stack-traces/solidity-errors";
import {
  FALLBACK_FUNCTION_NAME,
  RECEIVE_FUNCTION_NAME,
  UNRECOGNIZED_CONTRACT_NAME,
  UNRECOGNIZED_FUNCTION_NAME,
} from "../../stack-traces/solidity-stack-trace";
import { CallParams, GatherTracesResult, MineBlockResult } from "../node-types";

interface PrintOptions {
  color?: Chalk;
  replaceLastLine?: boolean;
  collapsePrintedMethod?: boolean;
  collapseIntervalMinedBlock?: boolean;
  collapseHardhatMinedBlock?: boolean;
}

function printLine(line: string) {
  console.log(line);
}

function replaceLastLine(newLine: string) {
  if (process.stdout.isTTY === true) {
    process.stdout.write(
      // eslint-disable-next-line prefer-template
      ansiEscapes.cursorHide +
        ansiEscapes.cursorPrevLine +
        newLine +
        ansiEscapes.eraseEndLine +
        "\n" +
        ansiEscapes.cursorShow
    );
  } else {
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
export class ModulesLogger {
  private _logs: Array<string | [string, string]> = [];
  private _titleLength = 0;
  private _currentIndent = 0;
  private _emptyIntervalMinedBlocksRangeStart: bigint | undefined = undefined;
  private _emptyHardhatMinedBlocksRangeStart: bigint | undefined = undefined;
  private _methodBeingCollapsed?: string;
  private _methodCollapsedCount: number = 0;

  constructor(
    private _enabled: boolean,
    private _printLine = printLine,
    private _replaceLastLine = replaceLastLine
  ) {}

  public isEnabled() {
    return this._enabled;
  }

  public setEnabled(enabled: boolean) {
    this._enabled = enabled;
  }

  public isLoggedError(err: Error) {
    return (
      err instanceof SolidityError || err instanceof TransactionExecutionError
    );
  }

  public logBlockFromAutomine(
    result: MineBlockResult,
    codes: Uint8Array[],
    txHashToHighlight: Uint8Array
  ) {
    const { block, blockResult, traces } = result;
    const { results } = blockResult;

    assertHardhatInvariant(
      results.length === codes.length,
      "The array of codes should have the same length as the array of results"
    );

    this._indent(() => {
      this._logBlockNumber(block);

      this._indent(() => {
        this._logBaseFeePerGas(block);

        for (let i = 0; i < block.transactions.length; i++) {
          const tx = block.transactions[i];

          const txGasUsed = results[i].totalGasSpent;
          const txTrace = traces[i];
          const code = codes[i];

          const highlightTxHash = equalsBytes(tx.hash(), txHashToHighlight);

          this._logTxInsideBlock(tx, txTrace, code, txGasUsed, {
            highlightTxHash,
          });

          this._logEmptyLineBetweenTransactions(i, block.transactions.length);
        }
      });
    });
  }

  public logMinedBlock(result: MineBlockResult, codes: Buffer[]) {
    const { block, blockResult, traces } = result;
    const { results } = blockResult;

    assertHardhatInvariant(
      results.length === codes.length,
      "The array of codes should have the same length as the array of results"
    );

    const blockNumber = result.block.header.number;
    const isEmpty = result.block.transactions.length === 0;

    this._indent(() => {
      this.logMinedBlockNumber(
        blockNumber,
        isEmpty,
        block.header.baseFeePerGas
      );

      if (isEmpty) {
        return;
      }

      this._indent(() => {
        this._logBlockHash(block);

        this._indent(() => {
          this._logBaseFeePerGas(block);

          for (let i = 0; i < block.transactions.length; i++) {
            const tx = block.transactions[i];
            const txGasUsed = results[i].totalGasSpent;
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

  public logIntervalMinedBlock(result: MineBlockResult, codes: Buffer[]) {
    const { block, blockResult, traces } = result;
    const { results } = blockResult;

    assertHardhatInvariant(
      results.length === codes.length,
      "The array of codes should have the same length as the array of results"
    );

    this._indent(() => {
      this._logBlockHash(block);

      this._indent(() => {
        this._logBaseFeePerGas(block);

        for (let i = 0; i < block.transactions.length; i++) {
          const tx = block.transactions[i];
          const txGasUsed = results[i].totalGasSpent;
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

  public logSingleTransaction(
    tx: TypedTransaction,
    block: Block,
    txGasUsed: bigint,
    txTrace: GatherTracesResult,
    code: Buffer
  ) {
    this._indent(() => {
      this._logContractAndFunctionName(txTrace.trace, code);

      const txHash = bufferToHex(tx.hash());

      this._logWithTitle("Transaction", txHash);

      this._logTxFrom(Buffer.from(tx.getSenderAddress().toBytes()));
      this._logTxTo(tx.to?.toBytes(), txTrace.trace);
      this._logTxValue(tx.value);
      this._logWithTitle("Gas used", `${txGasUsed} of ${tx.gasLimit}`);

      this._logWithTitle(
        `Block #${block.header.number}`,
        bufferToHex(block.hash())
      );

      this._logConsoleLogMessages(txTrace.consoleLogMessages);

      if (txTrace.error !== undefined) {
        this._logError(txTrace.error);
      }
    });
  }

  public logCurrentlySentTransaction(
    tx: TypedTransaction,
    txGasUsed: bigint,
    txTrace: GatherTracesResult,
    code: Buffer,
    block: Block
  ) {
    this._indent(() => {
      this._log("Currently sent transaction:");
      this.logEmptyLine();

      this._logContractAndFunctionName(txTrace.trace, code);

      const txHash = bufferToHex(tx.hash());

      this._logWithTitle("Transaction", txHash);

      this._logTxFrom(tx.getSenderAddress().toBytes());
      this._logTxTo(tx.to?.toBytes(), txTrace.trace);
      this._logTxValue(tx.value);
      this._logWithTitle("Gas used", `${txGasUsed} of ${tx.gasLimit}`);

      this._logWithTitle(
        `Block #${block.header.number}`,
        bufferToHex(block.hash())
      );

      this._logConsoleLogMessages(txTrace.consoleLogMessages);

      if (txTrace.error !== undefined) {
        this._logError(txTrace.error);
      }
    });
  }

  public logEstimateGasTrace(
    callParams: CallParams,
    code: Buffer,
    trace: MessageTrace | undefined,
    consoleLogMessages: string[],
    error: Error
  ) {
    this._indent(() => {
      this._logContractAndFunctionName(trace, code, {
        printNonContractCalled: true,
      });

      this._logTxFrom(callParams.from);
      this._logTxTo(callParams.to, trace);
      this._logTxValue(callParams.value);

      this._logConsoleLogMessages(consoleLogMessages);

      this._logError(error);
    });
  }

  public logCallTrace(
    callParams: CallParams,
    code: Buffer,
    trace: MessageTrace | undefined,
    consoleLogMessages: string[],
    error: Error | undefined
  ) {
    this._indent(() => {
      this._logContractAndFunctionName(trace, code, {
        printNonContractCalled: true,
      });

      this._logTxFrom(callParams.from);
      this._logTxTo(callParams.to, trace);
      if (callParams.value > 0n) {
        this._logTxValue(callParams.value);
      }

      this._logConsoleLogMessages(consoleLogMessages);

      if (error !== undefined) {
        // TODO: If throwOnCallFailures is false, this will log the error, but the RPC method won't be red
        this._logError(error);
      }
    });
  }

  public logMinedBlockNumber(
    blockNumber: bigint,
    isEmpty: boolean,
    baseFeePerGas?: bigint
  ) {
    if (isEmpty) {
      this._log(
        `Mined empty block #${blockNumber}${
          baseFeePerGas !== undefined
            ? ` with base fee ${baseFeePerGas.toString()}`
            : ""
        }`
      );

      return;
    }

    this._log(`Mined block #${blockNumber}`);
  }

  public logMultipleTransactionsWarning() {
    this._indent(() => {
      this._log(
        "There were other pending transactions mined in the same block:"
      );
    });
    this.logEmptyLine();
  }

  public logMultipleBlocksWarning() {
    this._indent(() => {
      this._log(
        "There were other pending transactions. More than one block had to be mined:"
      );
    });
    this.logEmptyLine();
  }

  public logEmptyLine() {
    this._log("");
  }

  private _logBaseFeePerGas(block: Block) {
    if (block.header.baseFeePerGas !== undefined) {
      this._log(`Base fee: ${block.header.baseFeePerGas.toString()}`);
    }
  }

  public printErrorMessage(errorMessage: string) {
    this._indent(() => {
      this._print(errorMessage);
    });
  }

  public printFailedMethod(method: string) {
    this._print(method, { color: chalk.red });
  }

  /**
   * Print all accumulated logs
   */
  public printLogs(): boolean {
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

  public printIntervalMinedBlockNumber(
    blockNumber: bigint,
    isEmpty: boolean,
    baseFeePerGas?: bigint
  ) {
    if (this._emptyIntervalMinedBlocksRangeStart !== undefined) {
      this._print(
        `Mined empty block range #${this._emptyIntervalMinedBlocksRangeStart} to #${blockNumber}`,
        { collapseIntervalMinedBlock: true, replaceLastLine: true }
      );
    } else {
      this._emptyIntervalMinedBlocksRangeStart = blockNumber;

      if (isEmpty) {
        this._print(
          `Mined empty block #${blockNumber}${
            baseFeePerGas !== undefined
              ? ` with base fee ${baseFeePerGas.toString()}`
              : ""
          }`,
          {
            collapseIntervalMinedBlock: true,
          }
        );

        return;
      }

      this._print(`Mined block #${blockNumber}`, {
        collapseIntervalMinedBlock: true,
      });
    }
  }

  public logEmptyHardhatMinedBlock(
    blockNumber: bigint,
    baseFeePerGas?: bigint
  ) {
    this._indent(() => {
      if (this._emptyHardhatMinedBlocksRangeStart !== undefined) {
        this._log(
          `Mined empty block range #${this._emptyHardhatMinedBlocksRangeStart} to #${blockNumber}`,
          { collapseHardhatMinedBlock: true, replaceLastLine: true }
        );
      } else {
        this._emptyHardhatMinedBlocksRangeStart = blockNumber;

        this._log(
          `Mined empty block #${blockNumber}${
            baseFeePerGas !== undefined
              ? ` with base fee ${baseFeePerGas.toString()}`
              : ""
          }`,
          {
            collapseHardhatMinedBlock: true,
          }
        );

        return;
      }
    });
  }

  public printMetaMaskWarning() {
    const message =
      "If you are using MetaMask, you can learn how to fix this error here: https://hardhat.org/metamask-issue";

    this._indent(() => {
      this._print(message, { color: chalk.yellow });
    });
  }

  public printMethod(method: string) {
    if (this._shouldCollapseMethod(method)) {
      this._methodCollapsedCount += 1;

      this._print(chalk.green(`${method} (${this._methodCollapsedCount})`), {
        collapsePrintedMethod: true,
        replaceLastLine: true,
      });
    } else {
      this._startCollapsingMethod(method);
      this._print(method, { color: chalk.green, collapsePrintedMethod: true });
    }
  }

  public printMethodNotSupported(method: string) {
    this._print(`${method} - Method not supported`, { color: chalk.red });
  }

  public printEmptyLine() {
    this._print("");
  }

  public printUnknownError(err: Error) {
    this._indent(() => {
      this._printError(err);
      this.printEmptyLine();

      this._print(
        "If you think this is a bug in Hardhat, please report it here: https://hardhat.org/report-bug"
      );
    });
  }

  private _format(msg: string, { color }: PrintOptions = {}): string {
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

  private _indent<T>(cb: () => T, enabled = true) {
    if (enabled) {
      this._currentIndent += 2;
    }
    try {
      return cb();
    } finally {
      if (enabled) {
        this._currentIndent -= 2;
      }
    }
  }

  private _indentSingleLine(message: string): string {
    return " ".repeat(this._currentIndent) + message;
  }

  private _log(msg: string, printOptions: PrintOptions = {}) {
    if (printOptions.collapsePrintedMethod !== true) {
      this._stopCollapsingMethod();
    }
    if (printOptions.collapseIntervalMinedBlock !== true) {
      this._emptyIntervalMinedBlocksRangeStart = undefined;
    }
    if (printOptions.collapseHardhatMinedBlock !== true) {
      this._emptyHardhatMinedBlocksRangeStart = undefined;
    }
    const formattedMessage = this._format(msg, printOptions);

    if (printOptions.replaceLastLine === true) {
      this._logs[this._logs.length - 1] = formattedMessage;
    } else {
      this._logs.push(formattedMessage);
    }
  }

  private _logError(err: Error) {
    if (this.isLoggedError(err)) {
      this.logEmptyLine();
      this._log(util.inspect(err));
    }
  }

  private _logTxInsideBlock(
    tx: TypedTransaction,
    txTrace: GatherTracesResult,
    code: Uint8Array,
    txGasUsed: bigint,
    {
      highlightTxHash,
    }: {
      highlightTxHash: boolean;
    }
  ) {
    // indentAfterTransactionHash: true,
    // printTxBlockNumber: false,
    // startWithTxHash: true,
    let txHash = bufferToHex(tx.hash());

    if (highlightTxHash) {
      txHash = chalk.bold(txHash);
    }

    this._logWithTitle("Transaction", txHash);

    this._indent(() => {
      this._logContractAndFunctionName(txTrace.trace, code);
      this._logTxFrom(tx.getSenderAddress().toBytes());
      this._logTxTo(tx.to?.toBytes(), txTrace.trace);
      this._logTxValue(tx.value);
      this._logWithTitle("Gas used", `${txGasUsed} of ${tx.gasLimit}`);

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
  private _print(msg: string, printOptions: PrintOptions = {}) {
    if (!this._enabled) {
      return;
    }

    if (printOptions.collapsePrintedMethod !== true) {
      this._stopCollapsingMethod();
    }
    if (printOptions.collapseIntervalMinedBlock !== true) {
      this._emptyIntervalMinedBlocksRangeStart = undefined;
    }
    if (printOptions.collapseHardhatMinedBlock !== true) {
      this._emptyHardhatMinedBlocksRangeStart = undefined;
    }
    const formattedMessage = this._format(msg, printOptions);

    if (printOptions.replaceLastLine === true) {
      this._replaceLastLine(formattedMessage);
    } else {
      this._printLine(formattedMessage);
    }
  }

  private _printError(err: Error) {
    if (this.isLoggedError(err)) {
      this.printEmptyLine();
      this._print(util.inspect(err));
    }
  }

  private _logContractAndFunctionName(
    trace: MessageTrace | undefined,
    code: Uint8Array,
    {
      printNonContractCalled = false,
    }: { printNonContractCalled?: boolean } = {}
  ) {
    if (trace === undefined) {
      return;
    }

    if (isPrecompileTrace(trace)) {
      this._logWithTitle(
        "Precompile call",
        `<PrecompileContract ${trace.precompile}>`
      );
      return;
    }

    if (isCreateTrace(trace)) {
      if (trace.bytecode === undefined) {
        this._logWithTitle("Contract deployment", UNRECOGNIZED_CONTRACT_NAME);
      } else {
        this._logWithTitle("Contract deployment", trace.bytecode.contract.name);
      }

      if (trace.deployedContract !== undefined && trace.error === undefined) {
        this._logWithTitle(
          "Contract address",
          bufferToHex(trace.deployedContract)
        );
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
      this._logWithTitle("Contract call", UNRECOGNIZED_CONTRACT_NAME);
      return;
    }

    const func = trace.bytecode.contract.getFunctionFromSelector(
      trace.calldata.slice(0, 4)
    );

    const functionName: string =
      func === undefined
        ? UNRECOGNIZED_FUNCTION_NAME
        : func.type === ContractFunctionType.FALLBACK
        ? FALLBACK_FUNCTION_NAME
        : func.type === ContractFunctionType.RECEIVE
        ? RECEIVE_FUNCTION_NAME
        : func.name;

    this._logWithTitle(
      "Contract call",
      `${trace.bytecode.contract.name}#${functionName}`
    );
  }

  private _shouldCollapseMethod(method: string) {
    return (
      method === this._methodBeingCollapsed &&
      !this._hasLogs() &&
      this._methodCollapsedCount > 0
    );
  }

  private _startCollapsingMethod(method: string) {
    this._methodBeingCollapsed = method;
    this._methodCollapsedCount = 1;
  }

  private _stopCollapsingMethod() {
    this._methodBeingCollapsed = undefined;
    this._methodCollapsedCount = 0;
  }

  private _logTxTo(to: Uint8Array | undefined, trace?: MessageTrace) {
    if (trace !== undefined && isCreateTrace(trace)) {
      return;
    }
    if (to === undefined) {
      // only for the type-checker, since `to` is undefined only when
      // the message is a create trace
      return;
    }

    const toString = bufferToHex(to);

    this._logWithTitle("To", toString);
  }

  private _logTxValue(value: bigint) {
    this._logWithTitle("Value", weiToHumanReadableString(value));
  }

  private _logTxFrom(from: Uint8Array) {
    this._logWithTitle("From", bufferToHex(from));
  }

  private _logBlockNumber(block: Block) {
    this._log(`Block #${block.header.number}: ${bufferToHex(block.hash())}`);
  }

  private _logEmptyLineBetweenTransactions(
    currentIndex: number,
    totalTransactions: number
  ) {
    if (currentIndex + 1 < totalTransactions && totalTransactions > 1) {
      this.logEmptyLine();
    }
  }

  private _logBlockHash(block: Block) {
    this._log(`Block: ${bufferToHex(block.hash())}`);
  }

  private _logConsoleLogMessages(messages: string[]) {
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

  private _logWithTitle(title: string, message: string) {
    title = this._indentSingleLine(title);

    // We always use the max title length we've seen. Otherwise the value move
    // a lot with each tx/call.
    if (title.length > this._titleLength) {
      this._titleLength = title.length;
    }

    this._logs.push([title, message]);
  }

  private _clearLogs() {
    this._logs = [];
  }

  private _hasLogs(): boolean {
    return this._logs.length > 0;
  }

  private _getLogs(): string[] {
    return this._logs.map((l) => {
      if (typeof l === "string") {
        return l;
      }

      const title = `${l[0]}:`;

      return `${title.padEnd(this._titleLength + 1)} ${l[1]}`;
    });
  }
}
