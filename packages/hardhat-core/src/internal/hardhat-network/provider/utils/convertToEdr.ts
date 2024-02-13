import {
  BlockData,
  Block as EthereumJSBlock,
  BlockHeader as EthereumJSBlockHeader,
  HeaderData as EthereumJSHeaderData,
} from "@nomicfoundation/ethereumjs-block";
import { Common } from "@nomicfoundation/ethereumjs-common";
import {
  EVMResult,
  Log as EthereumJsLog,
  Message,
} from "@nomicfoundation/ethereumjs-evm";
import { ERROR } from "@nomicfoundation/ethereumjs-evm/dist/exceptions";
import {
  AccessListEIP2930Transaction,
  FeeMarketEIP1559Transaction,
  TypedTransaction,
} from "@nomicfoundation/ethereumjs-tx";
import {
  Address,
  BufferLike,
  bigIntToHex,
  bufferToHex,
  toBuffer,
} from "@nomicfoundation/ethereumjs-util";
import { PostByzantiumTxReceipt } from "@nomicfoundation/ethereumjs-vm";
import {
  Block as EdrBlock,
  BlockConfig,
  BlockHeader as EdrBlockHeader,
  BlockOptions,
  ExecutionResult,
  SpecId,
  TransactionRequest,
  LegacySignedTransaction,
  Eip1559SignedTransaction,
  Eip2930SignedTransaction,
  Receipt as EdrReceipt,
  ExecutionLog,
  DebugTraceResult,
  DebugTraceConfig,
  Log as EdrLog,
  MineOrdering,
  TracingMessage,
  SuccessReason,
  IntervalRange,
  Eip4844SignedTransaction,
} from "@ignored/edr";
import { fromBigIntLike, toHex } from "../../../util/bigint";
import { HardforkName, hardforkGte } from "../../../util/hardforks";
import {
  isCreateOutput,
  isHaltResult,
  isRevertResult,
  isSuccessResult,
} from "../../stack-traces/message-trace";
import { IntervalMiningConfig, MempoolOrder } from "../node-types";
import {
  RpcLogOutput,
  RpcReceiptOutput,
  RpcDebugTraceOutput,
  RpcStructLog,
} from "../output";
import { FakeSenderEIP1559Transaction } from "../transactions/FakeSenderEIP1559Transaction";
import { FakeSenderAccessListEIP2930Transaction } from "../transactions/FakeSenderAccessListEIP2930Transaction";
import { FakeSenderTransaction } from "../transactions/FakeSenderTransaction";
import { Exit, ExitCode } from "../vm/exit";
import { RunTxResult } from "../vm/vm-adapter";
import { RpcDebugTracingConfig } from "../../../core/jsonrpc/types/input/debugTraceTransaction";
import { Bloom } from "./bloom";

/* eslint-disable @nomicfoundation/hardhat-internal-rules/only-hardhat-error */

export function ethereumjsBlockHeaderToEdr(
  blockHeader: EthereumJSBlockHeader
): EdrBlockHeader {
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

export function edrBlockHeaderToEthereumJSBlockData(
  blockHeader: EdrBlockHeader
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

export function ethereumsjsHardforkToEdrSpecId(hardfork: HardforkName): SpecId {
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

export function edrSpecIdToEthereumHardfork(specId: SpecId): HardforkName {
  switch (specId) {
    case SpecId.Frontier:
      return HardforkName.FRONTIER;
    case SpecId.Homestead:
      return HardforkName.HOMESTEAD;
    case SpecId.DaoFork:
      return HardforkName.DAO;
    case SpecId.Tangerine:
      return HardforkName.TANGERINE_WHISTLE;
    case SpecId.SpuriousDragon:
      return HardforkName.SPURIOUS_DRAGON;
    case SpecId.Byzantium:
      return HardforkName.BYZANTIUM;
    case SpecId.Constantinople:
      return HardforkName.CONSTANTINOPLE;
    case SpecId.Petersburg:
      return HardforkName.PETERSBURG;
    case SpecId.Istanbul:
      return HardforkName.ISTANBUL;
    case SpecId.MuirGlacier:
      return HardforkName.MUIR_GLACIER;
    case SpecId.Berlin:
      return HardforkName.BERLIN;
    case SpecId.London:
      return HardforkName.LONDON;
    case SpecId.ArrowGlacier:
      return HardforkName.ARROW_GLACIER;
    case SpecId.GrayGlacier:
      return HardforkName.GRAY_GLACIER;
    case SpecId.Merge:
      return HardforkName.MERGE;
    case SpecId.Shanghai:
      return HardforkName.SHANGHAI;
    // HACK: EthereumJS doesn't support Cancun, so report Shanghai
    case SpecId.Cancun:
      return HardforkName.SHANGHAI;

    default:
      throw new Error(`Unknown spec id '${specId}', this shouldn't happen`);
  }
}

export function ethereumjsHeaderDataToEdrBlockConfig(
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

export function ethereumjsHeaderDataToEdrBlockOptions(
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
    withdrawalsRoot: fromBufferLike(headerData.withdrawalsRoot),
  };
}

export function ethereumjsIntervalMiningConfigToEdr(
  config: IntervalMiningConfig
): bigint | IntervalRange | undefined {
  if (typeof config === "number") {
    // Is interval mining disabled?
    if (config === 0) {
      return undefined;
    } else {
      return BigInt(config);
    }
  } else {
    return {
      min: BigInt(config[0]),
      max: BigInt(config[1]),
    };
  }
}

export function ethereumjsMempoolOrderToEdrMineOrdering(
  mempoolOrder: MempoolOrder
): MineOrdering {
  switch (mempoolOrder) {
    case "fifo":
      return MineOrdering.Fifo;
    case "priority":
      return MineOrdering.Priority;
  }
}

export function ethereumjsTransactionToEdrSignedTransaction(
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
      r: tx.r ?? BigInt(0),
      s: tx.s ?? BigInt(0),
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
      r: tx.r ?? BigInt(0),
      s: tx.s ?? BigInt(0),
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

export function ethereumjsTransactionToEdrTransactionRequest(
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

export function edrBlockToEthereumJS(
  block: EdrBlock,
  common: Common
): EthereumJSBlock {
  const callers = block.callers;
  const blockData: BlockData = {
    header: edrBlockHeaderToEthereumJSBlockData(block.header),
    transactions: block.transactions.map((transaction, index, _array) => {
      return edrSignedTransactionToEthereumJSTypedTransaction(
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

function edrLogsToBloom(logs: ExecutionLog[]): Bloom {
  const bloom = new Bloom();
  for (const log of logs) {
    bloom.add(log.address);
    for (const topic of log.topics) {
      bloom.add(topic);
    }
  }
  return bloom;
}

export function edrReceiptToEthereumJsTxReceipt(
  receipt: EdrReceipt
): PostByzantiumTxReceipt {
  return {
    status: receipt.status! > 0 ? 1 : 0,
    cumulativeBlockGasUsed: receipt.cumulativeGasUsed,
    bitvector: receipt.logsBloom,
    logs: receipt.logs.map((log) => {
      return [log.address, log.topics, log.data];
    }),
  };
}

export function edrReceiptToEthereumJS(
  receipt: EdrReceipt,
  hardfork: HardforkName
): RpcReceiptOutput {
  return {
    blockHash: bufferToHex(receipt.blockHash),
    blockNumber: bigIntToHex(receipt.blockNumber),
    contractAddress:
      receipt.contractAddress !== null
        ? bufferToHex(receipt.contractAddress)
        : null,
    cumulativeGasUsed: bigIntToHex(receipt.cumulativeGasUsed),
    from: bufferToHex(receipt.caller),
    gasUsed: bigIntToHex(receipt.gasUsed),
    logs: receipt.logs.map((log) => {
      return edrLogToEthereumJS(log);
    }),
    logsBloom: bufferToHex(receipt.logsBloom),
    to: receipt.callee !== null ? bufferToHex(receipt.callee) : null,
    transactionHash: bufferToHex(receipt.transactionHash),
    transactionIndex: bigIntToHex(receipt.transactionIndex),
    status: receipt.status !== null ? toHex(receipt.status) : undefined,
    root:
      receipt.stateRoot !== null ? bufferToHex(receipt.stateRoot) : undefined,
    // Only shown if the local hardfork is at least Berlin, or if the remote is not a legacy one
    type:
      hardforkGte(hardfork, HardforkName.BERLIN) || receipt.type >= 1n
        ? bigIntToHex(receipt.type)
        : undefined,
    // Only shown if the local hardfork is at least London, or if the remote is EIP-1559
    effectiveGasPrice:
      hardforkGte(hardfork, HardforkName.LONDON) || receipt.type >= 2n
        ? // Effective gas price is defined if hardfork is London or if the transaction is EIP-1559
          bigIntToHex(receipt.effectiveGasPrice!)
        : undefined,
  };
}

export function edrLogToEthereumJS(log: EdrLog): RpcLogOutput {
  return {
    address: bufferToHex(log.address),
    blockHash: log.blockHash !== null ? bufferToHex(log.blockHash) : null,
    blockNumber: log.blockNumber !== null ? bigIntToHex(log.blockNumber) : null,
    data: bufferToHex(log.data),
    logIndex: log.logIndex !== null ? bigIntToHex(log.logIndex) : null,
    removed: log.removed,
    topics: log.topics.map((topic) => {
      return bufferToHex(topic);
    }),
    transactionHash:
      log.transactionHash !== null ? bufferToHex(log.transactionHash) : null,
    transactionIndex:
      log.transactionIndex !== null ? bigIntToHex(log.transactionIndex) : null,
  };
}

function getCreatedAddress(result: ExecutionResult): Address | undefined {
  const address =
    isSuccessResult(result.result) && isCreateOutput(result.result.output)
      ? result.result.output.address
      : undefined;

  return address === undefined ? undefined : new Address(address);
}

function getExit(result: ExecutionResult): Exit {
  return isSuccessResult(result.result)
    ? Exit.fromEdrSuccessReason(result.result.reason)
    : isHaltResult(result.result)
    ? Exit.fromEdrExceptionalHalt(result.result.reason)
    : new Exit(ExitCode.REVERT);
}

function getLogs(result: ExecutionResult): EthereumJsLog[] | undefined {
  return isSuccessResult(result.result)
    ? result.result.logs.map((log) => {
        return [log.address, log.topics, log.data];
      })
    : undefined;
}

function getReturnValue(result: ExecutionResult): Buffer {
  return isRevertResult(result.result)
    ? result.result.output
    : isSuccessResult(result.result)
    ? result.result.output.returnValue
    : Buffer.from([]);
}

export function edrResultToEthereumjsEvmResult(
  result: ExecutionResult
): EVMResult {
  const exit = getExit(result);

  const gasRefund = isSuccessResult(result.result)
    ? result.result.gasRefunded
    : undefined;

  return {
    createdAddress: getCreatedAddress(result),
    execResult: {
      exceptionError: exit.getEthereumJSError(),
      executionGasUsed: result.result.gasUsed,
      returnValue: getReturnValue(result),
      gasRefund,
      logs: getLogs(result),
    },
  };
}

export function ethereumjsEvmResultToEdrResult(
  result: EVMResult,
  overrideExceptionalHalt: boolean = false
): ExecutionResult {
  const gasUsed = result.execResult.executionGasUsed;

  if (result.execResult.exceptionError === undefined) {
    const reason =
      result.execResult.selfdestruct !== undefined &&
      Object.keys(result.execResult.selfdestruct).length > 0
        ? SuccessReason.SelfDestruct
        : result.createdAddress !== undefined ||
          result.execResult.returnValue.length > 0
        ? SuccessReason.Return
        : SuccessReason.Stop;

    return {
      result: {
        reason,
        gasUsed,
        gasRefunded: result.execResult.gasRefund ?? 0n,
        logs:
          result.execResult.logs?.map((log) => {
            return {
              address: log[0],
              topics: log[1],
              data: log[2],
            };
          }) ?? [],
        output:
          result.createdAddress === undefined
            ? {
                returnValue: result.execResult.returnValue,
              }
            : {
                address: result.createdAddress.toBuffer(),
                returnValue: result.execResult.returnValue,
              },
      },
    };
  } else if (result.execResult.exceptionError.error === ERROR.REVERT) {
    return {
      result: {
        gasUsed,
        output: result.execResult.returnValue,
      },
    };
  } else {
    if (overrideExceptionalHalt) {
      const overridenResult: any = {
        gasUsed,
      };

      // Throw an error if reason is accessed
      Object.defineProperty(overridenResult, "reason", {
        get: () => {
          throw new Error(
            "Cannot access reason of an exceptional halt in EthereumJS mode"
          );
        },
      });

      return {
        result: overridenResult,
      };
    } else {
      const vmError = Exit.fromEthereumJSEvmError(
        result.execResult.exceptionError
      );

      return {
        result: {
          reason: vmError.getEdrExceptionalHalt(),
          gasUsed,
        },
      };
    }
  }
}

export function edrResultToRunTxResult(
  edrResult: ExecutionResult,
  blockGasUsed: bigint
): RunTxResult {
  const exit = getExit(edrResult);

  const bloom = isSuccessResult(edrResult.result)
    ? edrLogsToBloom(edrResult.result.logs)
    : new Bloom(undefined);

  return {
    gasUsed: edrResult.result.gasUsed,
    createdAddress: getCreatedAddress(edrResult),
    exit,
    returnValue: getReturnValue(edrResult),
    bloom,
    receipt: {
      // Receipts have a 0 as status on error
      status: exit.isError() ? 0 : 1,
      cumulativeBlockGasUsed: blockGasUsed,
      bitvector: bloom.bitvector,
      logs: getLogs(edrResult) ?? [],
    },
  };
}

export function edrSignedTransactionToEthereumJSTypedTransaction(
  transaction:
    | LegacySignedTransaction
    | Eip2930SignedTransaction
    | Eip1559SignedTransaction
    | Eip4844SignedTransaction,
  caller: Address
): TypedTransaction {
  if (isEip4844SignedTransaction(transaction)) {
    // TODO: https://github.com/NomicFoundation/edr/issues/289
    // Add proper support for EIP-4844
    const fakeTransaction = new FakeSenderEIP1559Transaction(caller, {
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

    // Overwrite transaction type
    (fakeTransaction as any)._type = 3;

    return fakeTransaction;
  } else if (isEip1559SignedTransaction(transaction)) {
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
    | Eip4844SignedTransaction
): transaction is LegacySignedTransaction {
  // Only need to check for one unique field
  return "signature" in transaction;
}

function isEip1559SignedTransaction(
  transaction:
    | LegacySignedTransaction
    | Eip2930SignedTransaction
    | Eip1559SignedTransaction
    | Eip4844SignedTransaction
): transaction is Eip1559SignedTransaction {
  // Only need to check for one unique field
  return (
    !isEip4844SignedTransaction(transaction) &&
    "maxPriorityFeePerGas" in transaction
  );
}

function isEip2930SignedTransaction(
  transaction:
    | LegacySignedTransaction
    | Eip2930SignedTransaction
    | Eip1559SignedTransaction
    | Eip4844SignedTransaction
): transaction is Eip2930SignedTransaction {
  // Only need to check for one unique field
  return (
    !isEip1559SignedTransaction(transaction) && "oddYParity" in transaction
  );
}

function isEip4844SignedTransaction(
  transaction:
    | LegacySignedTransaction
    | Eip2930SignedTransaction
    | Eip1559SignedTransaction
    | Eip4844SignedTransaction
): transaction is Eip4844SignedTransaction {
  return "maxFeePerBlobGas" in transaction;
}

export function edrRpcDebugTraceToHardhat(
  rpcDebugTrace: DebugTraceResult
): RpcDebugTraceOutput {
  const structLogs = rpcDebugTrace.structLogs.map((log) => {
    const result: RpcStructLog = {
      depth: Number(log.depth),
      gas: Number(log.gas),
      gasCost: Number(log.gasCost),
      op: log.opName,
      pc: Number(log.pc),
    };

    if (log.memory !== undefined) {
      result.memory = log.memory;
    }

    if (log.stack !== undefined) {
      // Remove 0x prefix which is required by EIP-3155, but not expected by Hardhat.
      result.stack = log.stack?.map((item) => item.slice(2));
    }

    if (log.storage !== undefined) {
      result.storage = Object.fromEntries(
        Object.entries(log.storage).map(([key, value]) => {
          return [key.slice(2), value.slice(2)];
        })
      );
    }

    if (log.error !== undefined) {
      result.error = {
        message: log.error,
      };
    }

    return result;
  });

  // REVM trace adds initial STOP that Hardhat doesn't expect
  if (structLogs.length > 0 && structLogs[0].op === "STOP") {
    structLogs.shift();
  }

  let returnValue = rpcDebugTrace.output?.toString("hex") ?? "";
  if (returnValue === "0x") {
    returnValue = "";
  }

  return {
    failed: !rpcDebugTrace.pass,
    gas: Number(rpcDebugTrace.gasUsed),
    returnValue,
    structLogs,
  };
}

export function edrTracingMessageToEthereumjsMessage(
  message: TracingMessage
): Message {
  return new Message({
    to: message.to !== undefined ? new Address(message.to) : undefined,
    depth: message.depth,
    data: message.data,
    value: message.value,
    codeAddress:
      message.codeAddress !== undefined
        ? new Address(message.codeAddress)
        : undefined,
    code: message.code,
    caller: new Address(message.caller),
    gasLimit: message.gasLimit,
  });
}

export function ethereumjsMessageToEdrTracingMessage(
  message: Message
): TracingMessage {
  return {
    to: message.to?.buf,
    depth: message.depth,
    data: message.data,
    value: message.value,
    codeAddress: message._codeAddress?.buf,
    code:
      // We don't support the pre-compile format in EDR
      message.code === undefined || message.isCompiled
        ? undefined
        : (message.code as Buffer),
    caller: message.caller.buf,
    gasLimit: message.gasLimit,
  };
}

export function hardhatDebugTraceConfigToEdr(
  config: RpcDebugTracingConfig
): DebugTraceConfig {
  return {
    disableMemory: config?.disableMemory,
    disableStack: config?.disableStack,
    disableStorage: config?.disableStorage,
  };
}
