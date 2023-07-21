import {
  BlockData,
  Block as EthereumJSBlock,
  BlockHeader as EthereumJSBlockHeader,
  HeaderData as EthereumJSHeaderData,
} from "@nomicfoundation/ethereumjs-block";
import { Common } from "@nomicfoundation/ethereumjs-common";
import {
  AccessListEIP2930Transaction,
  FeeMarketEIP1559Transaction,
  TypedTransaction,
} from "@nomicfoundation/ethereumjs-tx";
import {
  Address,
  BufferLike,
  setLengthLeft,
  toBuffer,
} from "@nomicfoundation/ethereumjs-util";
import { PostByzantiumTxReceipt } from "@nomicfoundation/ethereumjs-vm";
import {
  Block as RethnetBlock,
  BlockConfig,
  BlockHeader as RethnetBlockHeader,
  BlockOptions,
  ExecutionResult,
  Log,
  SpecId,
  TransactionRequest,
  LegacySignedTransaction,
  Eip1559SignedTransaction,
  Eip2930SignedTransaction,
  Receipt as RethnetReceipt,
} from "rethnet-evm";
import { fromBigIntLike } from "../../../util/bigint";
import { HardforkName } from "../../../util/hardforks";
import {
  isCreateOutput,
  isHaltResult,
  isRevertResult,
  isSuccessResult,
} from "../../stack-traces/message-trace";
import { Exit, ExitCode } from "../vm/exit";
import { RunTxResult } from "../vm/vm-adapter";
import { FakeSenderEIP1559Transaction } from "../transactions/FakeSenderEIP1559Transaction";
import { FakeSenderAccessListEIP2930Transaction } from "../transactions/FakeSenderAccessListEIP2930Transaction";
import { FakeSenderTransaction } from "../transactions/FakeSenderTransaction";
import { Bloom } from "./bloom";

/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */

export function ethereumjsBlockHeaderToRethnet(
  blockHeader: EthereumJSBlockHeader
): RethnetBlockHeader {
  return {
    parentHash: blockHeader.parentHash,
    ommersHash: blockHeader.uncleHash,
    beneficiary: blockHeader.coinbase.buf,
    stateRoot: blockHeader.stateRoot,
    transactionsRoot: blockHeader.transactionsTrie,
    receiptsRoot: blockHeader.receiptTrie,
    logsBloom: blockHeader.logsBloom,
    difficulty: blockHeader.difficulty,
    number: blockHeader.number,
    gasLimit: blockHeader.gasLimit,
    gasUsed: blockHeader.gasUsed,
    timestamp: blockHeader.timestamp,
    extraData: blockHeader.extraData,
    mixHash: blockHeader.mixHash,
    nonce: blockHeader.nonce,
    baseFeePerGas: blockHeader.baseFeePerGas,
    withdrawalsRoot: blockHeader.withdrawalsRoot,
  };
}

export function rethnetBlockHeaderToEthereumJSBlockData(
  blockHeader: RethnetBlockHeader
): EthereumJSHeaderData {
  return {
    parentHash: blockHeader.parentHash,
    uncleHash: blockHeader.ommersHash,
    coinbase: new Address(blockHeader.beneficiary),
    stateRoot: blockHeader.stateRoot,
    transactionsTrie: blockHeader.transactionsRoot,
    receiptTrie: blockHeader.receiptsRoot,
    logsBloom: blockHeader.logsBloom,
    difficulty: blockHeader.difficulty,
    number: blockHeader.number,
    gasLimit: blockHeader.gasLimit,
    gasUsed: blockHeader.gasUsed,
    timestamp: blockHeader.timestamp,
    extraData: blockHeader.extraData,
    mixHash: blockHeader.mixHash,
    nonce: blockHeader.nonce,
    baseFeePerGas: blockHeader.baseFeePerGas,
    withdrawalsRoot: blockHeader.withdrawalsRoot,
  };
}

export function ethereumsjsHardforkToRethnetSpecId(
  hardfork: HardforkName
): SpecId {
  switch (hardfork) {
    case HardforkName.FRONTIER:
      return SpecId.Frontier;
    case HardforkName.HOMESTEAD:
      return SpecId.Homestead;
    case HardforkName.DAO:
      return SpecId.DaoFork;
    case HardforkName.TANGERINE_WHISTLE:
      return SpecId.Tangerine;
    case HardforkName.SPURIOUS_DRAGON:
      return SpecId.SpuriousDragon;
    case HardforkName.BYZANTIUM:
      return SpecId.Byzantium;
    case HardforkName.CONSTANTINOPLE:
      return SpecId.Constantinople;
    case HardforkName.PETERSBURG:
      return SpecId.Petersburg;
    case HardforkName.ISTANBUL:
      return SpecId.Istanbul;
    case HardforkName.MUIR_GLACIER:
      return SpecId.MuirGlacier;
    case HardforkName.BERLIN:
      return SpecId.Berlin;
    case HardforkName.LONDON:
      return SpecId.London;
    case HardforkName.ARROW_GLACIER:
      return SpecId.ArrowGlacier;
    case HardforkName.GRAY_GLACIER:
      return SpecId.GrayGlacier;
    case HardforkName.MERGE:
      return SpecId.Merge;
    case HardforkName.SHANGHAI:
      return SpecId.Shanghai;
    default:
      const _exhaustiveCheck: never = hardfork;
      throw new Error(
        `Unknown hardfork name '${hardfork as string}', this shouldn't happen`
      );
  }
}

export function ethereumjsHeaderDataToRethnetBlockConfig(
  headerData?: EthereumJSHeaderData,
  difficulty?: bigint,
  mixHash?: Buffer
): BlockConfig {
  const beneficiary =
    headerData?.coinbase === undefined
      ? undefined
      : toBuffer(headerData.coinbase);

  return {
    number: fromBigIntLike(headerData?.number),
    beneficiary,
    timestamp: fromBigIntLike(headerData?.timestamp),
    difficulty,
    mixHash,
    baseFee: fromBigIntLike(headerData?.baseFeePerGas),
    gasLimit: fromBigIntLike(headerData?.gasLimit),
    parentHash: headerData?.parentHash as Buffer,
  };
}

export function ethereumjsHeaderDataToRethnetBlockOptions(
  headerData?: EthereumJSHeaderData
): BlockOptions {
  if (headerData === undefined) {
    return {};
  }

  // Ensure that we leave leave options undefined, as opposed to `toBuffer`
  function fromBufferLike(bufferLike?: BufferLike): Buffer | undefined {
    if (bufferLike === undefined) {
      return bufferLike;
    }

    return toBuffer(bufferLike);
  }

  return {
    parentHash: fromBufferLike(headerData.parentHash),
    beneficiary: fromBufferLike(headerData.coinbase),
    stateRoot: fromBufferLike(headerData.stateRoot),
    receiptsRoot: fromBufferLike(headerData.receiptTrie),
    logsBloom: fromBufferLike(headerData.logsBloom),
    difficulty: fromBigIntLike(headerData.difficulty),
    number: fromBigIntLike(headerData.number),
    gasLimit: fromBigIntLike(headerData.gasLimit),
    timestamp: fromBigIntLike(headerData.timestamp),
    extraData: fromBufferLike(headerData.extraData),
    mixHash: fromBufferLike(headerData.mixHash),
    nonce: fromBufferLike(headerData.nonce),
    baseFee: fromBigIntLike(headerData.baseFeePerGas),
  };
}

export function ethereumjsTransactionToRethnetSignedTransaction(
  tx: TypedTransaction
):
  | LegacySignedTransaction
  | Eip2930SignedTransaction
  | Eip1559SignedTransaction {
  if (tx instanceof AccessListEIP2930Transaction) {
    const transaction: Eip2930SignedTransaction = {
      chainId: tx.chainId,
      nonce: tx.nonce,
      gasPrice: tx.gasPrice,
      gasLimit: tx.gasLimit,
      to: tx.to?.buf,
      value: tx.value,
      input: tx.data,
      accessList: tx.accessList.map((value, _index, _array) => {
        return {
          address: value[0],
          storageKeys: value[1],
        };
      }),
      oddYParity: (tx.v ?? BigInt(0)) > 0,
      r: setLengthLeft(toBuffer(tx.r ?? BigInt(0)), 32),
      s: setLengthLeft(toBuffer(tx.s ?? BigInt(0)), 32),
    };

    return transaction;
  } else if (tx instanceof FeeMarketEIP1559Transaction) {
    const transaction: Eip1559SignedTransaction = {
      chainId: tx.chainId,
      nonce: tx.nonce,
      maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
      maxFeePerGas: tx.maxFeePerGas,
      gasLimit: tx.gasLimit,
      to: tx.to?.buf,
      value: tx.value,
      input: tx.data,
      accessList: tx.accessList.map((value, _index, _array) => {
        return {
          address: value[0],
          storageKeys: value[1],
        };
      }),
      oddYParity: (tx.v ?? BigInt(0)) > 0,
      r: setLengthLeft(toBuffer(tx.r ?? BigInt(0)), 32),
      s: setLengthLeft(toBuffer(tx.s ?? BigInt(0)), 32),
    };

    return transaction;
  } else {
    const transaction: LegacySignedTransaction = {
      nonce: tx.nonce,
      gasPrice: tx.gasPrice,
      gasLimit: tx.gasLimit,
      to: tx.to?.buf,
      value: tx.value,
      input: tx.data,
      signature: {
        r: tx.r ?? BigInt(0),
        s: tx.s ?? BigInt(0),
        v: tx.v!,
      },
    };

    return transaction;
  }
}

export function ethereumjsTransactionToRethnetTransactionRequest(
  tx: TypedTransaction
): TransactionRequest {
  if (tx instanceof AccessListEIP2930Transaction) {
    return {
      chainId: tx.chainId,
      nonce: tx.nonce,
      gasPrice: tx.gasPrice,
      gasLimit: tx.gasLimit,
      from: tx.getSenderAddress().toBuffer(),
      to: tx.to?.buf,
      value: tx.value,
      input: tx.data,
      accessList: tx.accessList.map((value, _index, _array) => {
        return {
          address: value[0],
          storageKeys: value[1],
        };
      }),
    };
  } else if (tx instanceof FeeMarketEIP1559Transaction) {
    return {
      chainId: tx.chainId,
      nonce: tx.nonce,
      gasPriorityFee: tx.maxPriorityFeePerGas,
      gasPrice: tx.maxFeePerGas,
      gasLimit: tx.gasLimit,
      from: tx.getSenderAddress().toBuffer(),
      to: tx.to?.buf,
      value: tx.value,
      input: tx.data,
      accessList: tx.accessList.map((value, _index, _array) => {
        return {
          address: value[0],
          storageKeys: value[1],
        };
      }),
    };
  } else {
    return {
      nonce: tx.nonce,
      gasPrice: tx.gasPrice,
      gasLimit: tx.gasLimit,
      from: tx.getSenderAddress().toBuffer(),
      to: tx.to?.buf,
      value: tx.value,
      input: tx.data,
    };
  }
}

export function rethnetBlockToEthereumJS(
  block: RethnetBlock,
  common: Common
): EthereumJSBlock {
  const callers = block.callers;
  const blockData: BlockData = {
    header: rethnetBlockHeaderToEthereumJSBlockData(block.header),
    transactions: block.transactions.map((transaction, index, _array) => {
      return rethnetSignedTransactionToEthereumJSTypedTransaction(
        transaction,
        new Address(callers[index])
      );
    }),
  };

  return EthereumJSBlock.fromBlockData(blockData, {
    common,
    skipConsensusFormatValidation: true,
  });
}

function rethnetLogsToBloom(logs: Log[]): Bloom {
  const bloom = new Bloom();
  for (const log of logs) {
    bloom.add(log.address);
    for (const topic of log.topics) {
      bloom.add(topic);
    }
  }
  return bloom;
}

export function rethnetReceiptToEthereumJS(
  receipt: RethnetReceipt
): PostByzantiumTxReceipt {
  return {
    status: receipt.statusCode > 0 ? 1 : 0,
    cumulativeBlockGasUsed: receipt.gasUsed,
    bitvector: receipt.logsBloom,
    logs: receipt.logs.map((log) => {
      return [log.address, log.topics, log.data];
    }),
  };
}

export function rethnetResultToRunTxResult(
  rethnetResult: ExecutionResult,
  blockGasUsed: bigint
): RunTxResult {
  const createdAddress =
    isSuccessResult(rethnetResult.result) &&
    isCreateOutput(rethnetResult.result.output)
      ? rethnetResult.result.output.address
      : undefined;

  const exit = isSuccessResult(rethnetResult.result)
    ? Exit.fromRethnetSuccessReason(rethnetResult.result.reason)
    : isHaltResult(rethnetResult.result)
    ? Exit.fromRethnetExceptionalHalt(rethnetResult.result.reason)
    : new Exit(ExitCode.REVERT);

  const returnValue = isRevertResult(rethnetResult.result)
    ? rethnetResult.result.output
    : isSuccessResult(rethnetResult.result)
    ? rethnetResult.result.output.returnValue
    : Buffer.from([]);

  const bloom = isSuccessResult(rethnetResult.result)
    ? rethnetLogsToBloom(rethnetResult.result.logs)
    : new Bloom(undefined);

  return {
    gasUsed: rethnetResult.result.gasUsed,
    createdAddress:
      createdAddress !== undefined ? new Address(createdAddress) : undefined,
    exit,
    returnValue,
    bloom,
    receipt: {
      // Receipts have a 0 as status on error
      status: exit.isError() ? 0 : 1,
      cumulativeBlockGasUsed: blockGasUsed + rethnetResult.result.gasUsed,
      bitvector: bloom.bitvector,
      logs: isSuccessResult(rethnetResult.result)
        ? rethnetResult.result.logs.map((log) => {
            return [log.address, log.topics, log.data];
          })
        : [],
    },
  };
}

export function rethnetSignedTransactionToEthereumJSTypedTransaction(
  transaction:
    | LegacySignedTransaction
    | Eip2930SignedTransaction
    | Eip1559SignedTransaction,
  caller: Address
): TypedTransaction {
  if (isEip1559SignedTransaction(transaction)) {
    return new FakeSenderEIP1559Transaction(caller, {
      maxPriorityFeePerGas: transaction.maxPriorityFeePerGas,
      maxFeePerGas: transaction.maxFeePerGas,
      chainId: transaction.chainId,
      accessList: transaction.accessList.map((value, _index, _array) => {
        return [value.address, value.storageKeys];
      }),
      nonce: transaction.nonce,
      gasLimit: transaction.gasLimit,
      to: transaction.to,
      value: transaction.value,
      data: transaction.input,
      v: BigInt(transaction.oddYParity),
      r: transaction.r,
      s: transaction.s,
    });
  } else if (isEip2930SignedTransaction(transaction)) {
    return new FakeSenderAccessListEIP2930Transaction(caller, {
      chainId: transaction.chainId,
      accessList: transaction.accessList.map((value, _index, _array) => {
        return [value.address, value.storageKeys];
      }),
      nonce: transaction.nonce,
      gasPrice: transaction.gasPrice,
      gasLimit: transaction.gasLimit,
      to: transaction.to,
      value: transaction.value,
      data: transaction.input,
      v: BigInt(transaction.oddYParity),
      r: transaction.r,
      s: transaction.s,
    });
  } else if (isLegacySignedTransaction(transaction)) {
    return new FakeSenderTransaction(caller, {
      nonce: transaction.nonce,
      gasPrice: transaction.gasPrice,
      gasLimit: transaction.gasLimit,
      to: transaction.to,
      value: transaction.value,
      data: transaction.input,
      v: transaction.signature.v,
      r: transaction.signature.r,
      s: transaction.signature.s,
    });
  } else {
    throw new Error("Unknown signed transaction type");
  }
}

function isLegacySignedTransaction(
  transaction:
    | LegacySignedTransaction
    | Eip2930SignedTransaction
    | Eip1559SignedTransaction
): transaction is LegacySignedTransaction {
  // Only need to check for one unique field
  return "signature" in transaction;
}

function isEip1559SignedTransaction(
  transaction:
    | LegacySignedTransaction
    | Eip2930SignedTransaction
    | Eip1559SignedTransaction
): transaction is Eip1559SignedTransaction {
  // Only need to check for one unique field
  return "maxPriorityFeePerGas" in transaction;
}

function isEip2930SignedTransaction(
  transaction:
    | LegacySignedTransaction
    | Eip2930SignedTransaction
    | Eip1559SignedTransaction
): transaction is Eip2930SignedTransaction {
  // Only need to check for one unique field
  return (
    !isEip1559SignedTransaction(transaction) && "oddYParity" in transaction
  );
}
