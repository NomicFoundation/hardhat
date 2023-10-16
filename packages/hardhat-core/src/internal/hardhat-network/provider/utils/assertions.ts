import { Block } from "@nomicfoundation/ethereumjs-block";
import { Log } from "@nomicfoundation/ethereumjs-evm";
import { TypedTransaction } from "@nomicfoundation/ethereumjs-tx";
import { bufferToHex } from "@nomicfoundation/ethereumjs-util";
import { TxReceipt } from "@nomicfoundation/ethereumjs-vm";
import { InternalError } from "../../../core/providers/errors";
import { ExitCode } from "../vm/exit";
import { RunBlockResult, RunTxResult } from "../vm/vm-adapter";
import { RpcLogOutput, RpcReceiptOutput } from "../output";

export function assertHardhatNetworkInvariant(
  invariant: boolean,
  description: string
): asserts invariant {
  if (!invariant) {
    // eslint-disable-next-line @nomicfoundation/hardhat-internal-rules/only-hardhat-error
    throw new InternalError(
      `Internal Hardhat Network invariant was violated: ${description}`
    );
  }
}

/* eslint-disable @nomicfoundation/hardhat-internal-rules/only-hardhat-error */
/* eslint-disable @typescript-eslint/restrict-template-expressions */

export function assertEqualOptionalBlocks(
  hardhatBlock: Block | undefined,
  edrBlock: Block | undefined
) {
  if (hardhatBlock === undefined) {
    if (edrBlock !== undefined) {
      console.log("hardhatBlock is undefined but edrBlock is defined");
      throw new Error("hardhatBlock is undefined but edrBlock is defined");
    }
  } else {
    if (edrBlock === undefined) {
      console.log("hardhatBlock is defined but edrBlock is undefined");
      throw new Error("hardhatBlock is defined but edrBlock is undefined");
    }

    assertEqualBlocks(hardhatBlock, edrBlock);
  }
}

export function assertEqualBlocks(ethereumJSBlock: Block, edrBlock: Block) {
  const differences: string[] = [];

  const ethereumJSHeader = ethereumJSBlock.header;
  const edrHeader = edrBlock.header;

  if (ethereumJSHeader.baseFeePerGas !== edrHeader.baseFeePerGas) {
    console.log(
      `Different baseFeePerGas: ${ethereumJSHeader.baseFeePerGas} (ethereumjs) !== ${edrHeader.baseFeePerGas} (edr)`
    );
    differences.push("baseFeePerGas");
  }

  if (!ethereumJSHeader.coinbase.equals(edrHeader.coinbase)) {
    console.log(
      `Different coinbase: ${bufferToHex(
        ethereumJSHeader.coinbase.buf
      )} (ethereumjs) !== ${bufferToHex(edrHeader.coinbase.buf)} (edr)`
    );
    differences.push("coinbase");
  }

  if (ethereumJSHeader.difficulty !== edrHeader.difficulty) {
    console.log(
      `Different difficulty: ${ethereumJSHeader.difficulty} (ethereumjs) !== ${edrHeader.difficulty} (edr)`
    );
    differences.push("difficulty");
  }

  if (!ethereumJSHeader.extraData.equals(edrHeader.extraData)) {
    console.log(
      `Different extraData: ${bufferToHex(
        ethereumJSHeader.extraData
      )} (ethereumjs) !== ${bufferToHex(edrHeader.extraData)} (edr)`
    );
    differences.push("extraData");
  }

  if (ethereumJSHeader.gasLimit !== edrHeader.gasLimit) {
    console.log(
      `Different gasLimit: ${ethereumJSHeader.gasLimit} (ethereumjs) !== ${edrHeader.gasLimit} (edr)`
    );
    differences.push("gasLimit");
  }

  if (ethereumJSHeader.gasUsed !== edrHeader.gasUsed) {
    console.log(
      `Different gasUsed: ${ethereumJSHeader.gasUsed} (ethereumjs) !== ${edrHeader.gasUsed} (edr)`
    );
    differences.push("gasUsed");
  }

  if (!ethereumJSHeader.logsBloom.equals(edrHeader.logsBloom)) {
    console.log(
      `Different logsBloom: ${bufferToHex(
        ethereumJSHeader.logsBloom
      )} (ethereumjs) !== ${bufferToHex(edrHeader.logsBloom)} (edr)`
    );
    differences.push("logsBloom");
  }

  if (!ethereumJSHeader.mixHash.equals(edrHeader.mixHash)) {
    console.log(
      `Different mixHash: ${bufferToHex(
        ethereumJSHeader.mixHash
      )} (ethereumjs) !== ${bufferToHex(edrHeader.mixHash)} (edr)`
    );
    differences.push("mixHash");
  }

  if (!ethereumJSHeader.nonce.equals(edrHeader.nonce)) {
    console.log(
      `Different nonce: ${bufferToHex(
        ethereumJSHeader.nonce
      )} (ethereumjs) !== ${bufferToHex(edrHeader.nonce)} (edr)`
    );
    differences.push("nonce");
  }

  if (ethereumJSHeader.number !== edrHeader.number) {
    console.log(
      `Different number: ${ethereumJSHeader.number} (ethereumjs) !== ${edrHeader.number} (edr)`
    );
    differences.push("number");
  }

  if (!ethereumJSHeader.parentHash.equals(edrHeader.parentHash)) {
    console.log(
      `Different parentHash: ${bufferToHex(
        ethereumJSHeader.parentHash
      )} (ethereumjs) !== ${bufferToHex(edrHeader.parentHash)} (edr)`
    );
    differences.push("parentHash");
  }

  if (!ethereumJSHeader.receiptTrie.equals(edrHeader.receiptTrie)) {
    console.log(
      `Different receiptTrie: ${bufferToHex(
        ethereumJSHeader.receiptTrie
      )} (ethereumjs) !== ${bufferToHex(edrHeader.receiptTrie)} (edr)`
    );
    differences.push("receiptTrie");
  }

  if (!ethereumJSHeader.stateRoot.equals(edrHeader.stateRoot)) {
    console.log(
      `Different stateRoot: ${bufferToHex(
        ethereumJSHeader.stateRoot
      )} (ethereumjs) !== ${bufferToHex(edrHeader.stateRoot)} (edr)`
    );
    differences.push("stateRoot");
  }

  if (ethereumJSHeader.timestamp !== edrHeader.timestamp) {
    console.log(
      `Different timestamp: ${ethereumJSHeader.timestamp} (ethereumjs) !== ${edrHeader.timestamp} (edr)`
    );
    differences.push("timestamp");
  }

  if (!ethereumJSHeader.transactionsTrie.equals(edrHeader.transactionsTrie)) {
    console.log(
      `Different transactionsTrie: ${bufferToHex(
        ethereumJSHeader.transactionsTrie
      )} (ethereumjs) !== ${bufferToHex(edrHeader.transactionsTrie)} (edr)`
    );
    differences.push("transactionsTrie");
  }

  if (!ethereumJSHeader.uncleHash.equals(edrHeader.uncleHash)) {
    console.log(
      `Different uncleHash: ${bufferToHex(
        ethereumJSHeader.uncleHash
      )} (ethereumjs) !== ${bufferToHex(edrHeader.uncleHash)} (edr)`
    );
    differences.push("uncleHash");
  }

  if (
    !areOptionalBuffersEqual(
      ethereumJSHeader.withdrawalsRoot,
      edrHeader.withdrawalsRoot,
      "withdrawalsRoot"
    )
  ) {
    differences.push("withdrawalsRoot");
  }

  if (ethereumJSBlock.transactions.length !== edrBlock.transactions.length) {
    console.log(
      `Different transactions length: ${ethereumJSBlock.transactions.length} (ethereumjs) !== ${edrBlock.transactions.length} (edr)`
    );
    differences.push("transactions.length");
  }

  for (
    let transactionIdx = 0;
    transactionIdx < ethereumJSBlock.transactions.length;
    ++transactionIdx
  ) {
    const txDifferences = transactionDifferences(
      ethereumJSBlock.transactions[transactionIdx],
      edrBlock.transactions[transactionIdx]
    );

    if (txDifferences.length > 0) {
      console.log(`Different transaction[${transactionIdx}]: ${txDifferences}`);
      differences.push(`transaction[${transactionIdx}]`);
    }
  }

  if (differences.length !== 0) {
    console.trace(`Different blocks: ${differences}`);
    throw new Error(`Different blocks: ${differences}`);
  }
}

export function transactionDifferences(
  ethereumJSTransaction: TypedTransaction,
  edrTransaction: TypedTransaction
): string[] {
  const differences: string[] = [];

  if (!ethereumJSTransaction.data.equals(edrTransaction.data)) {
    console.log(
      `Different data: ${ethereumJSTransaction.data} (ethereumjs) !== ${edrTransaction.data} (edr)`
    );
    differences.push("data");
  }

  if (ethereumJSTransaction.gasLimit !== edrTransaction.gasLimit) {
    console.log(
      `Different gasLimit: ${ethereumJSTransaction.gasLimit} (ethereumjs) !== ${edrTransaction.gasLimit} (edr)`
    );
    differences.push("gasLimit");
  }

  if (ethereumJSTransaction.nonce !== edrTransaction.nonce) {
    console.log(
      `Different nonce: ${ethereumJSTransaction.nonce} (ethereumjs) !== ${edrTransaction.nonce} (edr)`
    );
    differences.push("nonce");
  }

  if (ethereumJSTransaction.to === undefined) {
    if (edrTransaction.to !== undefined) {
      console.log(
        "ethereumJSTransaction.to is undefined but edrTransaction.to is defined"
      );
      differences.push("to");
    }
  } else {
    if (edrTransaction.to === undefined) {
      throw new Error(
        "ethereumJSTransaction.to is defined but edrTransaction.to is undefined"
      );
    }

    // Both traces contain to
    if (!ethereumJSTransaction.to.equals(edrTransaction.to)) {
      console.log(
        `Different to: ${ethereumJSTransaction.to} (ethereumjs) !== ${edrTransaction.to} (edr)`
      );
      differences.push("to");
    }
  }

  if (ethereumJSTransaction.type !== edrTransaction.type) {
    console.log(
      `Different type: ${ethereumJSTransaction.type} (ethereumjs) !== ${edrTransaction.type} (edr)`
    );
    differences.push("type");
  }

  if (ethereumJSTransaction.value !== edrTransaction.value) {
    console.log(
      `Different value: ${ethereumJSTransaction.value} (ethereumjs) !== ${edrTransaction.value} (edr)`
    );
    differences.push("value");
  }

  if (ethereumJSTransaction.r !== edrTransaction.r) {
    console.log(
      `Different r: ${ethereumJSTransaction.r} (ethereumjs) !== ${edrTransaction.r} (edr)`
    );
    differences.push("r");
  }

  if (ethereumJSTransaction.s !== edrTransaction.s) {
    console.log(
      `Different s: ${ethereumJSTransaction.s} (ethereumjs) !== ${edrTransaction.s} (edr)`
    );
    differences.push("s");
  }

  if (ethereumJSTransaction.v !== edrTransaction.v) {
    console.log(
      `Different v: ${ethereumJSTransaction.v} (ethereumjs) !== ${edrTransaction.v} (edr)`
    );
    differences.push("v");
  }

  return differences;
}

export function assertEqualRunBlockResults(
  ethereumJSResult: RunBlockResult,
  edrResult: RunBlockResult
) {
  const differences: string[] = [];

  if (ethereumJSResult.results.length !== edrResult.results.length) {
    console.log(
      `Different results length: ${ethereumJSResult.results.length} (ethereumjs) !== ${edrResult.results.length} (edr)`
    );
    differences.push("length");
  }

  for (
    let resultIdx = 0;
    resultIdx < ethereumJSResult.results.length;
    ++resultIdx
  ) {
    const resultDifferences = runTxResultDifferences(
      ethereumJSResult.results[resultIdx],
      edrResult.results[resultIdx]
    );

    if (resultDifferences.length > 0) {
      differences.push(`results[${resultIdx}]: ${resultDifferences}`);
    }
  }

  for (
    let receiptIdx = 0;
    receiptIdx < ethereumJSResult.receipts.length;
    ++receiptIdx
  ) {
    const receiptDifferences = txReceiptDifferences(
      ethereumJSResult.receipts[receiptIdx],
      edrResult.receipts[receiptIdx]
    );

    if (receiptDifferences.length > 0) {
      differences.push(`receipts[${receiptIdx}]: ${receiptDifferences}`);
    }
  }

  if (!ethereumJSResult.stateRoot.equals(edrResult.stateRoot)) {
    console.log(
      `Different stateRoot: ${ethereumJSResult.stateRoot} (ethereumjs) !== ${edrResult.stateRoot} (edr)`
    );
    differences.push("stateRoot");
  }

  if (!ethereumJSResult.logsBloom.equals(edrResult.logsBloom)) {
    console.log(
      `Different logsBloom: ${ethereumJSResult.logsBloom} (ethereumjs) !== ${edrResult.logsBloom} (edr)`
    );
    differences.push("logsBloom");
  }

  if (!ethereumJSResult.receiptsRoot.equals(edrResult.receiptsRoot)) {
    console.log(
      `Different receiptsRoot: ${ethereumJSResult.receiptsRoot} (ethereumjs) !== ${edrResult.receiptsRoot} (edr)`
    );
    differences.push("receiptsRoot");
  }

  if (ethereumJSResult.gasUsed !== edrResult.gasUsed) {
    console.log(
      `Different gasUsed: ${ethereumJSResult.gasUsed} (ethereumjs) !== ${edrResult.gasUsed} (edr)`
    );
    differences.push("gasUsed");
  }

  if (differences.length !== 0) {
    console.trace(`Different RunBlockResults: ${differences}`);
    throw new Error(`Different RunBlockResults: ${differences}`);
  }
}

export function assertEqualRunTxResults(
  ethereumJSResult: RunTxResult,
  edrResult: RunTxResult
) {
  const differences = runTxResultDifferences(ethereumJSResult, edrResult);

  if (differences.length !== 0) {
    throw new Error(`Different result fields: ${differences}`);
  }
}

function runTxResultDifferences(
  ethereumJSResult: RunTxResult,
  edrResult: RunTxResult
): string[] {
  const differences: string[] = [];

  if (ethereumJSResult.exit.kind !== edrResult.exit.kind) {
    console.log(
      `Different exceptionError.error: ${ethereumJSResult.exit.kind} (ethereumjs) !== ${edrResult.exit.kind} (edr)`
    );
    differences.push("exceptionError.error");
  }

  if (ethereumJSResult.gasUsed !== edrResult.gasUsed) {
    console.log(
      `Different totalGasSpent: ${ethereumJSResult.gasUsed} (ethereumjs) !== ${edrResult.gasUsed} (edr)`
    );
    differences.push("totalGasSpent");
  }

  const exitCode = ethereumJSResult.exit.kind;
  if (exitCode === ExitCode.SUCCESS || exitCode === ExitCode.REVERT) {
    // TODO: we only compare the return values when a contract was *not* created,
    // because sometimes ethereumjs has the created bytecode in the return value
    // and edr doesn't
    // if (ethereumJSResult.createdAddress === undefined) {
    if (
      ethereumJSResult.returnValue.toString("hex") !==
      edrResult.returnValue.toString("hex")
    ) {
      console.log(
        `Different returnValue: ${ethereumJSResult.returnValue.toString(
          "hex"
        )} (ethereumjs) !== ${edrResult.returnValue.toString("hex")} (edr)`
      );
      differences.push("returnValue");
    }
    // }

    if (!ethereumJSResult.bloom.equals(edrResult.bloom)) {
      console.log(
        `Different bloom: ${ethereumJSResult.bloom} (ethereumjs) !== ${edrResult.bloom} (edr)`
      );
      differences.push("bloom");
    }

    if (
      !ethereumJSResult.receipt.bitvector.equals(edrResult.receipt.bitvector)
    ) {
      console.log(
        `Different receipt bitvector: ${ethereumJSResult.receipt.bitvector} (ethereumjs) !== ${edrResult.receipt.bitvector} (edr)`
      );
      differences.push("receipt.bitvector");
    }

    if (
      ethereumJSResult.receipt.cumulativeBlockGasUsed !==
      edrResult.receipt.cumulativeBlockGasUsed
    ) {
      console.log(
        `Different receipt cumulativeBlockGasUsed: ${ethereumJSResult.receipt.cumulativeBlockGasUsed} (ethereumjs) !== ${edrResult.receipt.cumulativeBlockGasUsed} (edr)`
      );
      differences.push("receipt.cumulativeBlockGasUsed");
    }

    const logsDifferences = executionLogsDifferences(
      ethereumJSResult.receipt.logs,
      edrResult.receipt.logs
    );
    if (logsDifferences.length > 0) {
      differences.push(`receipt.logs: ${logsDifferences}`);
    }
  }

  if (exitCode === ExitCode.SUCCESS) {
    if (
      ethereumJSResult.createdAddress?.toString() !==
        edrResult.createdAddress?.toString() &&
      // ethereumjs returns a createdAddress, even when reverting
      !(
        edrResult.createdAddress === undefined &&
        ethereumJSResult.exit.kind !== ExitCode.SUCCESS
      )
    ) {
      console.log(
        `Different createdAddress: ${ethereumJSResult.createdAddress?.toString()} (ethereumjs) !== ${edrResult.createdAddress?.toString()} (edr)`
      );
      differences.push("createdAddress");
    }
  }

  return differences;
}

function executionLogsDifferences(
  ethereumJSLogs: Log[],
  edrLogs: Log[]
): string[] {
  const differences: string[] = [];

  if (ethereumJSLogs.length !== edrLogs.length) {
    console.log(
      `Different logs length: ${ethereumJSLogs.length} (ethereumjs) !== ${edrLogs.length} (edr)`
    );
    differences.push("length");
  }

  for (let logIdx = 0; logIdx < ethereumJSLogs.length; ++logIdx) {
    if (!ethereumJSLogs[logIdx][0].equals(edrLogs[logIdx][0])) {
      console.log(
        `Different log[${logIdx}] address: ${ethereumJSLogs[logIdx][0]} (ethereumjs) !== ${edrLogs[logIdx][0]} (edr)`
      );
      differences.push("address");
    }

    const ethereumJSTopics = ethereumJSLogs[logIdx][1];
    const edrTopics = edrLogs[logIdx][1];
    if (ethereumJSTopics.length !== edrTopics.length) {
      console.log(
        `Different log[${logIdx}] topics length: ${ethereumJSTopics.length} (ethereumjs) !== ${edrTopics.length} (edr)`
      );
      differences.push("topics length");
    }

    for (let topicIdx = 0; topicIdx < ethereumJSTopics.length; ++topicIdx) {
      if (!ethereumJSTopics[topicIdx].equals(edrTopics[topicIdx])) {
        console.log(
          `Different log[${logIdx}] topic[${topicIdx}]: ${ethereumJSTopics[topicIdx]} (ethereumjs) !== ${edrTopics[topicIdx]} (edr)`
        );
        differences.push("topic");
      }
    }

    if (!ethereumJSLogs[logIdx][2].equals(edrLogs[logIdx][2])) {
      console.log(
        `Different log[${logIdx}] data: ${ethereumJSLogs[logIdx][2]} (ethereumjs) !== ${edrLogs[logIdx][2]} (edr)`
      );
      differences.push("data");
    }
  }

  return differences;
}

function txReceiptDifferences(
  hardhatReceipt: TxReceipt,
  edrReceipt: TxReceipt
) {
  const differences: string[] = [];
  // TODO: check stateRoot and status

  if (!hardhatReceipt.bitvector.equals(edrReceipt.bitvector)) {
    console.log(
      `Different bitvector: ${hardhatReceipt.bitvector} (hardhat) !== ${edrReceipt.bitvector} (edr)`
    );
    differences.push("bitvector");
  }

  if (
    hardhatReceipt.cumulativeBlockGasUsed !== edrReceipt.cumulativeBlockGasUsed
  ) {
    console.log(
      `Different cumulativeBlockGasUsed: ${hardhatReceipt.cumulativeBlockGasUsed} (hardhat) !== ${edrReceipt.cumulativeBlockGasUsed} (edr)`
    );
    differences.push("cumulativeBlockGasUsed");
  }

  const logsDifferences = executionLogsDifferences(
    hardhatReceipt.logs,
    edrReceipt.logs
  );
  if (logsDifferences.length > 0) {
    throw new Error(`logs: ${differences}`);
  }

  return differences;
}

function areOptionalBuffersEqual(
  hardhat: Buffer | undefined,
  edr: Buffer | undefined,
  description: string
): boolean {
  if (hardhat === undefined) {
    if (edr !== undefined) {
      console.log(
        `${description} (hardhat) is undefined but ${description} (edr) is defined`
      );
      return false;
    }

    return true;
  } else {
    if (edr === undefined) {
      console.log(
        `${description} (hardhat) is defined but ${description} (edr) is undefined`
      );
      return false;
    }

    return areBuffersEqual(hardhat, edr, description);
  }
}

function areBuffersEqual(
  hardhat: Buffer,
  edr: Buffer,
  description: string
): boolean {
  const areEqual = hardhat.equals(edr);
  if (!areEqual) {
    console.log(
      `Different ${description}: ${bufferToHex(
        hardhat
      )} (hardhat) !== ${bufferToHex(edr)} (edr)`
    );
  }

  return areEqual;
}

export function assertEqualOptionalReceipts(
  hardhatReceipt: RpcReceiptOutput | undefined,
  edrReceipt: RpcReceiptOutput | undefined
) {
  if (hardhatReceipt === undefined) {
    if (edrReceipt !== undefined) {
      console.log("hardhatReceipt is undefined but edrReceipt is defined");
      throw new Error("hardhatReceipt is undefined but edrReceipt is defined");
    }

    return [];
  } else {
    if (edrReceipt === undefined) {
      console.log("hardhatReceipt is defined but edrReceipt is undefined");
      throw new Error("hardhatReceipt is defined but edrReceipt is undefined");
    }

    assertEqualReceipts(hardhatReceipt, edrReceipt);
  }
}

export function assertEqualReceipts(
  hardhatReceipt: RpcReceiptOutput,
  edrReceipt: RpcReceiptOutput
) {
  const differences: string[] = [];

  if (hardhatReceipt.blockHash !== edrReceipt.blockHash) {
    console.log(
      `Different blockHash: ${hardhatReceipt.blockHash} (hardhat) !== ${edrReceipt.blockHash} (edr)`
    );
    differences.push("blockHash");
  }

  if (hardhatReceipt.blockNumber !== edrReceipt.blockNumber) {
    console.log(
      `Different blockNumber: ${hardhatReceipt.blockNumber} (hardhat) !== ${edrReceipt.blockNumber} (edr)`
    );
    differences.push("blockNumber");
  }

  if (hardhatReceipt.contractAddress !== edrReceipt.contractAddress) {
    console.log(
      `Different contractAddress: ${hardhatReceipt.contractAddress} (hardhat) !== ${edrReceipt.contractAddress} (edr)`
    );
    differences.push("contractAddress");
  }

  if (hardhatReceipt.cumulativeGasUsed !== edrReceipt.cumulativeGasUsed) {
    console.log(
      `Different cumulativeGasUsed: ${hardhatReceipt.cumulativeGasUsed} (hardhat) !== ${edrReceipt.cumulativeGasUsed} (edr)`
    );
    differences.push("cumulativeGasUsed");
  }

  if (hardhatReceipt.from !== edrReceipt.from) {
    console.log(
      `Different from: ${hardhatReceipt.from} (hardhat) !== ${edrReceipt.from} (edr)`
    );
    differences.push("from");
  }

  if (hardhatReceipt.gasUsed !== edrReceipt.gasUsed) {
    console.log(
      `Different gasUsed: ${hardhatReceipt.gasUsed} (hardhat) !== ${edrReceipt.gasUsed} (edr)`
    );
    differences.push("gasUsed");
  }

  if (hardhatReceipt.logs.length !== edrReceipt.logs.length) {
    console.log(
      `Different logs length: ${hardhatReceipt.logs.length} (hardhat) !== ${edrReceipt.logs.length} (edr)`
    );
    differences.push("logs length");
  }

  for (let logIdx = 0; logIdx < hardhatReceipt.logs.length; ++logIdx) {
    const logDifferences = rpcLogDifferences(
      hardhatReceipt.logs[logIdx],
      edrReceipt.logs[logIdx]
    );

    if (logDifferences.length > 0) {
      differences.push(`logs[${logIdx}]: ${logDifferences}`);
    }
  }

  if (hardhatReceipt.logsBloom !== edrReceipt.logsBloom) {
    console.log(
      `Different logsBloom: ${hardhatReceipt.logsBloom} (hardhat) !== ${edrReceipt.logsBloom} (edr)`
    );
    differences.push("logsBloom");
  }

  if (hardhatReceipt.to !== edrReceipt.to) {
    console.log(
      `Different to: ${hardhatReceipt.to} (hardhat) !== ${edrReceipt.to} (edr)`
    );
    differences.push("to");
  }

  if (hardhatReceipt.transactionHash !== edrReceipt.transactionHash) {
    console.log(
      `Different transactionHash: ${hardhatReceipt.transactionHash} (hardhat) !== ${edrReceipt.transactionHash} (edr)`
    );
    differences.push("transactionHash");
  }

  if (hardhatReceipt.transactionIndex !== edrReceipt.transactionIndex) {
    console.log(
      `Different transactionIndex: ${hardhatReceipt.transactionIndex} (hardhat) !== ${edrReceipt.transactionIndex} (edr)`
    );
    differences.push("transactionIndex");
  }

  if (hardhatReceipt.status !== edrReceipt.status) {
    console.log(
      `Different status: ${hardhatReceipt.status} (hardhat) !== ${edrReceipt.status} (edr)`
    );
    differences.push("status");
  }

  if (hardhatReceipt.root !== edrReceipt.root) {
    console.log(
      `Different root: ${hardhatReceipt.root} (hardhat) !== ${edrReceipt.root} (edr)`
    );
    differences.push("root");
  }

  if (hardhatReceipt.type !== edrReceipt.type) {
    console.log(
      `Different type: ${hardhatReceipt.type} (hardhat) !== ${edrReceipt.type} (edr)`
    );
    differences.push("type");
  }

  if (hardhatReceipt.effectiveGasPrice !== edrReceipt.effectiveGasPrice) {
    console.log(
      `Different effectiveGasPrice: ${hardhatReceipt.effectiveGasPrice} (hardhat) !== ${edrReceipt.effectiveGasPrice} (edr)`
    );
    differences.push("effectiveGasPrice");
  }

  if (differences.length !== 0) {
    console.trace(`Different receipts: ${differences}`);
    throw new Error(`Different receipts: ${differences}`);
  }
}

export function rpcLogDifferences(
  hardhatLog: RpcLogOutput,
  edrLog: RpcLogOutput
): string[] {
  const differences: string[] = [];

  if (hardhatLog.address !== edrLog.address) {
    console.log(
      `Different address: ${hardhatLog.address} (hardhat) !== ${edrLog.address} (edr)`
    );
    differences.push("address");
  }

  if (hardhatLog.blockHash !== edrLog.blockHash) {
    console.log(
      `Different blockHash: ${hardhatLog.blockHash} (hardhat) !== ${edrLog.blockHash} (edr)`
    );
    differences.push("blockHash");
  }

  if (hardhatLog.blockNumber !== edrLog.blockNumber) {
    console.log(
      `Different blockNumber: ${hardhatLog.blockNumber} (hardhat) !== ${edrLog.blockNumber} (edr)`
    );
    differences.push("blockNumber");
  }

  if (hardhatLog.data !== edrLog.data) {
    console.log(
      `Different data: ${hardhatLog.data} (hardhat) !== ${edrLog.data} (edr)`
    );
    differences.push("data");
  }

  if (hardhatLog.logIndex !== edrLog.logIndex) {
    console.log(
      `Different logIndex: ${hardhatLog.logIndex} (hardhat) !== ${edrLog.logIndex} (edr)`
    );
    differences.push("logIndex");
  }

  if (hardhatLog.removed !== edrLog.removed) {
    console.log(
      `Different removed: ${hardhatLog.removed} (hardhat) !== ${edrLog.removed} (edr)`
    );
    differences.push("removed");
  }

  if (hardhatLog.topics.length !== edrLog.topics.length) {
    console.log(
      `Different topics length: ${hardhatLog.topics.length} (hardhat) !== ${edrLog.topics.length} (edr)`
    );
    differences.push("topics length");
  }

  for (let topicIdx = 0; topicIdx < hardhatLog.topics.length; ++topicIdx) {
    if (hardhatLog.topics[topicIdx] !== edrLog.topics[topicIdx]) {
      console.log(
        `Different topics[${topicIdx}]: ${hardhatLog.topics[topicIdx]} (hardhat) !== ${edrLog.topics[topicIdx]} (edr)`
      );
      differences.push(`topics[${topicIdx}]`);
    }
  }

  if (hardhatLog.transactionHash !== edrLog.transactionHash) {
    console.log(
      `Different transactionHash: ${hardhatLog.transactionHash} (hardhat) !== ${edrLog.transactionHash} (edr)`
    );
    differences.push("transactionHash");
  }

  if (hardhatLog.transactionIndex !== edrLog.transactionIndex) {
    console.log(
      `Different transactionIndex: ${hardhatLog.transactionIndex} (hardhat) !== ${edrLog.transactionIndex} (edr)`
    );
    differences.push("transactionIndex");
  }

  return differences;
}
