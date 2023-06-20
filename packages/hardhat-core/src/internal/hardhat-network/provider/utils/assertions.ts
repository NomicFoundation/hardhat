import { Block } from "@nomicfoundation/ethereumjs-block";
import { Log } from "@nomicfoundation/ethereumjs-evm";
import { TypedTransaction } from "@nomicfoundation/ethereumjs-tx";
import { bufferToHex } from "@nomicfoundation/ethereumjs-util";
import { InternalError } from "../../../core/providers/errors";
import { ExitCode } from "../vm/exit";
import { RunTxResult } from "../vm/vm-adapter";

export function assertHardhatNetworkInvariant(
  invariant: boolean,
  description: string
): asserts invariant {
  if (!invariant) {
    // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
    throw new InternalError(
      `Internal Hardhat Network invariant was violated: ${description}`
    );
  }
}

/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */
/* eslint-disable @typescript-eslint/restrict-template-expressions */

export function assertEqualBlocks(ethereumJSBlock: Block, rethnetBlock: Block) {
  const differences: string[] = [];

  const ethereumJSHeader = ethereumJSBlock.header;
  const rethnetHeader = rethnetBlock.header;

  if (ethereumJSHeader.baseFeePerGas !== rethnetHeader.baseFeePerGas) {
    console.log(
      `Different baseFeePerGas: ${ethereumJSHeader.baseFeePerGas} (ethereumjs) !== ${rethnetHeader.baseFeePerGas} (rethnet)`
    );
    differences.push("baseFeePerGas");
  }

  if (!ethereumJSHeader.coinbase.equals(rethnetHeader.coinbase)) {
    console.log(
      `Different coinbase: ${bufferToHex(
        ethereumJSHeader.coinbase.buf
      )} (ethereumjs) !== ${bufferToHex(rethnetHeader.coinbase.buf)} (rethnet)`
    );
    differences.push("coinbase");
  }

  if (ethereumJSHeader.difficulty !== rethnetHeader.difficulty) {
    console.log(
      `Different difficulty: ${ethereumJSHeader.difficulty} (ethereumjs) !== ${rethnetHeader.difficulty} (rethnet)`
    );
    differences.push("difficulty");
  }

  if (!ethereumJSHeader.extraData.equals(rethnetHeader.extraData)) {
    console.log(
      `Different extraData: ${bufferToHex(
        ethereumJSHeader.extraData
      )} (ethereumjs) !== ${bufferToHex(rethnetHeader.extraData)} (rethnet)`
    );
    differences.push("extraData");
  }

  if (ethereumJSHeader.gasLimit !== rethnetHeader.gasLimit) {
    console.log(
      `Different gasLimit: ${ethereumJSHeader.gasLimit} (ethereumjs) !== ${rethnetHeader.gasLimit} (rethnet)`
    );
    differences.push("gasLimit");
  }

  if (ethereumJSHeader.gasUsed !== rethnetHeader.gasUsed) {
    console.log(
      `Different gasUsed: ${ethereumJSHeader.gasUsed} (ethereumjs) !== ${rethnetHeader.gasUsed} (rethnet)`
    );
    differences.push("gasUsed");
  }

  if (!ethereumJSHeader.logsBloom.equals(rethnetHeader.logsBloom)) {
    console.log(
      `Different logsBloom: ${bufferToHex(
        ethereumJSHeader.logsBloom
      )} (ethereumjs) !== ${bufferToHex(rethnetHeader.logsBloom)} (rethnet)`
    );
    differences.push("logsBloom");
  }

  if (!ethereumJSHeader.mixHash.equals(rethnetHeader.mixHash)) {
    console.log(
      `Different mixHash: ${bufferToHex(
        ethereumJSHeader.mixHash
      )} (ethereumjs) !== ${bufferToHex(rethnetHeader.mixHash)} (rethnet)`
    );
    differences.push("mixHash");
  }

  if (!ethereumJSHeader.nonce.equals(rethnetHeader.nonce)) {
    console.log(
      `Different nonce: ${bufferToHex(
        ethereumJSHeader.nonce
      )} (ethereumjs) !== ${bufferToHex(rethnetHeader.nonce)} (rethnet)`
    );
    differences.push("nonce");
  }

  if (ethereumJSHeader.number !== rethnetHeader.number) {
    console.log(
      `Different number: ${ethereumJSHeader.number} (ethereumjs) !== ${rethnetHeader.number} (rethnet)`
    );
    differences.push("number");
  }

  if (!ethereumJSHeader.parentHash.equals(rethnetHeader.parentHash)) {
    console.log(
      `Different parentHash: ${bufferToHex(
        ethereumJSHeader.parentHash
      )} (ethereumjs) !== ${bufferToHex(rethnetHeader.parentHash)} (rethnet)`
    );
    differences.push("parentHash");
  }

  if (!ethereumJSHeader.receiptTrie.equals(rethnetHeader.receiptTrie)) {
    console.log(
      `Different receiptTrie: ${bufferToHex(
        ethereumJSHeader.receiptTrie
      )} (ethereumjs) !== ${bufferToHex(rethnetHeader.receiptTrie)} (rethnet)`
    );
    differences.push("receiptTrie");
  }

  if (!ethereumJSHeader.stateRoot.equals(rethnetHeader.stateRoot)) {
    console.log(
      `Different stateRoot: ${bufferToHex(
        ethereumJSHeader.stateRoot
      )} (ethereumjs) !== ${bufferToHex(rethnetHeader.stateRoot)} (rethnet)`
    );
    differences.push("stateRoot");
  }

  if (ethereumJSHeader.timestamp !== rethnetHeader.timestamp) {
    console.log(
      `Different timestamp: ${ethereumJSHeader.timestamp} (ethereumjs) !== ${rethnetHeader.timestamp} (rethnet)`
    );
    differences.push("timestamp");
  }

  if (
    !ethereumJSHeader.transactionsTrie.equals(rethnetHeader.transactionsTrie)
  ) {
    console.log(
      `Different transactionsTrie: ${bufferToHex(
        ethereumJSHeader.transactionsTrie
      )} (ethereumjs) !== ${bufferToHex(
        rethnetHeader.transactionsTrie
      )} (rethnet)`
    );
    differences.push("transactionsTrie");
  }

  if (!ethereumJSHeader.uncleHash.equals(rethnetHeader.uncleHash)) {
    console.log(
      `Different uncleHash: ${bufferToHex(
        ethereumJSHeader.uncleHash
      )} (ethereumjs) !== ${bufferToHex(rethnetHeader.uncleHash)} (rethnet)`
    );
    differences.push("uncleHash");
  }

  if (
    ethereumJSBlock.transactions.length !== rethnetBlock.transactions.length
  ) {
    console.log(
      `Different transactions length: ${ethereumJSBlock.transactions.length} (ethereumjs) !== ${rethnetBlock.transactions.length} (rethnet)`
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
      rethnetBlock.transactions[transactionIdx]
    );

    if (txDifferences.length > 0) {
      console.log(
        `Different transaction[${transactionIdx}]: ${transactionDifferences}`
      );
      differences.push("transactions");
    }
  }

  if (differences.length !== 0) {
    throw new Error(`Different blocks: ${differences}`);
  }
}

function transactionDifferences(
  ethereumJSTransaction: TypedTransaction,
  rethnetTransaction: TypedTransaction
): string[] {
  const differences: string[] = [];

  if (!ethereumJSTransaction.data.equals(rethnetTransaction.data)) {
    console.log(
      `Different data: ${ethereumJSTransaction.data} (ethereumjs) !== ${rethnetTransaction.data} (rethnet)`
    );
    differences.push("data");
  }

  if (ethereumJSTransaction.gasLimit !== rethnetTransaction.gasLimit) {
    console.log(
      `Different gasLimit: ${ethereumJSTransaction.gasLimit} (ethereumjs) !== ${rethnetTransaction.gasLimit} (rethnet)`
    );
    differences.push("gasLimit");
  }

  if (ethereumJSTransaction.nonce !== rethnetTransaction.nonce) {
    console.log(
      `Different nonce: ${ethereumJSTransaction.nonce} (ethereumjs) !== ${rethnetTransaction.nonce} (rethnet)`
    );
    differences.push("nonce");
  }

  if (ethereumJSTransaction.to === undefined) {
    if (rethnetTransaction.to !== undefined) {
      console.log(
        "ethereumJSTransaction.to is undefined but rethnetTransaction.to is defined"
      );
      differences.push("to");
    }
  } else {
    if (rethnetTransaction.to === undefined) {
      throw new Error(
        "ethereumJSTransaction.to is defined but rethnetTransaction.to is undefined"
      );
    }

    // Both traces contain to
    if (!ethereumJSTransaction.to.equals(rethnetTransaction.to)) {
      console.log(
        `Different to: ${ethereumJSTransaction.to} (ethereumjs) !== ${rethnetTransaction.to} (rethnet)`
      );
      differences.push("to");
    }
  }

  if (ethereumJSTransaction.type !== rethnetTransaction.type) {
    console.log(
      `Different type: ${ethereumJSTransaction.type} (ethereumjs) !== ${rethnetTransaction.type} (rethnet)`
    );
    differences.push("type");
  }

  if (ethereumJSTransaction.value !== rethnetTransaction.value) {
    console.log(
      `Different value: ${ethereumJSTransaction.value} (ethereumjs) !== ${rethnetTransaction.value} (rethnet)`
    );
    differences.push("value");
  }

  if (ethereumJSTransaction.r !== rethnetTransaction.r) {
    console.log(
      `Different r: ${ethereumJSTransaction.r} (ethereumjs) !== ${rethnetTransaction.r} (rethnet)`
    );
    differences.push("r");
  }

  if (ethereumJSTransaction.s !== rethnetTransaction.s) {
    console.log(
      `Different s: ${ethereumJSTransaction.s} (ethereumjs) !== ${rethnetTransaction.s} (rethnet)`
    );
    differences.push("s");
  }

  if (ethereumJSTransaction.v !== rethnetTransaction.v) {
    console.log(
      `Different v: ${ethereumJSTransaction.v} (ethereumjs) !== ${rethnetTransaction.v} (rethnet)`
    );
    differences.push("v");
  }

  return differences;
}

export function assertEqualRunTxResults(
  ethereumJSResult: RunTxResult,
  rethnetResult: RunTxResult
) {
  const differences: string[] = [];

  if (ethereumJSResult.exit.kind !== rethnetResult.exit.kind) {
    console.trace(
      `Different exceptionError.error: ${ethereumJSResult.exit.kind} (ethereumjs) !== ${rethnetResult.exit.kind} (rethnet)`
    );
    differences.push("exceptionError.error");
  }

  if (ethereumJSResult.gasUsed !== rethnetResult.gasUsed) {
    console.trace(
      `Different totalGasSpent: ${ethereumJSResult.gasUsed} (ethereumjs) !== ${rethnetResult.gasUsed} (rethnet)`
    );
    differences.push("totalGasSpent");
  }

  const exitCode = ethereumJSResult.exit.kind;
  if (exitCode === ExitCode.SUCCESS || exitCode === ExitCode.REVERT) {
    // TODO: we only compare the return values when a contract was *not* created,
    // because sometimes ethereumjs has the created bytecode in the return value
    // and rethnet doesn't
    // if (ethereumJSResult.createdAddress === undefined) {
    if (
      ethereumJSResult.returnValue.toString("hex") !==
      rethnetResult.returnValue.toString("hex")
    ) {
      console.trace(
        `Different returnValue: ${ethereumJSResult.returnValue.toString(
          "hex"
        )} (ethereumjs) !== ${rethnetResult.returnValue.toString(
          "hex"
        )} (rethnet)`
      );
      differences.push("returnValue");
    }
    // }

    if (!ethereumJSResult.bloom.equals(rethnetResult.bloom)) {
      console.trace(
        `Different bloom: ${ethereumJSResult.bloom} (ethereumjs) !== ${rethnetResult.bloom} (rethnet)`
      );
      differences.push("bloom");
    }

    if (
      !ethereumJSResult.receipt.bitvector.equals(
        rethnetResult.receipt.bitvector
      )
    ) {
      console.trace(
        `Different receipt bitvector: ${ethereumJSResult.receipt.bitvector} (ethereumjs) !== ${rethnetResult.receipt.bitvector} (rethnet)`
      );
      differences.push("receipt.bitvector");
    }

    if (
      ethereumJSResult.receipt.cumulativeBlockGasUsed !==
      rethnetResult.receipt.cumulativeBlockGasUsed
    ) {
      console.trace(
        `Different receipt cumulativeBlockGasUsed: ${ethereumJSResult.receipt.cumulativeBlockGasUsed} (ethereumjs) !== ${rethnetResult.receipt.cumulativeBlockGasUsed} (rethnet)`
      );
      differences.push("receipt.cumulativeBlockGasUsed");
    }

    assertEqualLogs(ethereumJSResult.receipt.logs, rethnetResult.receipt.logs);
  }

  if (exitCode === ExitCode.SUCCESS) {
    if (
      ethereumJSResult.createdAddress?.toString() !==
        rethnetResult.createdAddress?.toString() &&
      // ethereumjs returns a createdAddress, even when reverting
      !(
        rethnetResult.createdAddress === undefined &&
        ethereumJSResult.exit.kind !== ExitCode.SUCCESS
      )
    ) {
      console.trace(
        `Different createdAddress: ${ethereumJSResult.createdAddress?.toString()} (ethereumjs) !== ${rethnetResult.createdAddress?.toString()} (rethnet)`
      );
      differences.push("createdAddress");
    }
  }

  if (differences.length !== 0) {
    throw new Error(`Different result fields: ${differences}`);
  }
}

function assertEqualLogs(ethereumJSLogs: Log[], rethnetLogs: Log[]) {
  const differences: string[] = [];

  if (ethereumJSLogs.length !== rethnetLogs.length) {
    console.trace(
      `Different logs length: ${ethereumJSLogs.length} (ethereumjs) !== ${rethnetLogs.length} (rethnet)`
    );
    differences.push("length");
  }

  for (let logIdx = 0; logIdx < ethereumJSLogs.length; ++logIdx) {
    if (!ethereumJSLogs[logIdx][0].equals(rethnetLogs[logIdx][0])) {
      console.trace(
        `Different log[${logIdx}] address: ${ethereumJSLogs[logIdx][0]} (ethereumjs) !== ${rethnetLogs[logIdx][0]} (rethnet)`
      );
      differences.push("address");
    }

    const ethereumJSTopics = ethereumJSLogs[logIdx][1];
    const rethnetTopics = rethnetLogs[logIdx][1];
    if (ethereumJSTopics.length !== rethnetTopics.length) {
      console.trace(
        `Different log[${logIdx}] topics length: ${ethereumJSTopics.length} (ethereumjs) !== ${rethnetTopics.length} (rethnet)`
      );
      differences.push("topics length");
    }

    for (let topicIdx = 0; topicIdx < ethereumJSTopics.length; ++topicIdx) {
      if (!ethereumJSTopics[topicIdx].equals(rethnetTopics[topicIdx])) {
        console.trace(
          `Different log[${logIdx}] topic[${topicIdx}]: ${ethereumJSTopics[topicIdx]} (ethereumjs) !== ${rethnetTopics[topicIdx]} (rethnet)`
        );
        differences.push("topic");
      }
    }

    if (!ethereumJSLogs[logIdx][2].equals(rethnetLogs[logIdx][2])) {
      console.trace(
        `Different log[${logIdx}] data: ${ethereumJSLogs[logIdx][2]} (ethereumjs) !== ${rethnetLogs[logIdx][2]} (rethnet)`
      );
      differences.push("data");
    }
  }

  if (differences.length !== 0) {
    throw new Error(`Different log fields: ${differences}`);
  }
}
