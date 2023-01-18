import {
  BlockHeader as EthereumJSBlockHeader,
  HeaderData,
} from "@nomicfoundation/ethereumjs-block";
import {
  AccessListEIP2930Transaction,
  FeeMarketEIP1559Transaction,
  TypedTransaction,
} from "@nomicfoundation/ethereumjs-tx";
import { Address, toBuffer } from "@nomicfoundation/ethereumjs-util";
import {
  BlockConfig,
  BlockHeader as RethnetBlockHeader,
  ExecutionResult,
  Log,
  SpecId,
  Transaction,
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
    nonce: BigInt(`0x${blockHeader.nonce.toString("hex")}`),
    baseFeePerGas: blockHeader.baseFeePerGas,
  };
}

export function ethereumsjsHardforkToRethnet(hardfork: HardforkName): SpecId {
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
    default:
      const _exhaustiveCheck: never = hardfork;
      throw new Error(
        `Unknown hardfork name '${hardfork as string}', this shouldn't happen`
      );
  }
}

export function ethereumjsHeaderDataToRethnet(
  headerData?: HeaderData,
  difficulty?: bigint,
  prevRandao?: Buffer
): BlockConfig {
  const coinbase =
    headerData?.coinbase === undefined
      ? undefined
      : toBuffer(headerData.coinbase);

  return {
    number: fromBigIntLike(headerData?.number),
    coinbase,
    timestamp: fromBigIntLike(headerData?.timestamp),
    difficulty,
    prevrandao: prevRandao,
    basefee: fromBigIntLike(headerData?.baseFeePerGas),
    gasLimit: fromBigIntLike(headerData?.gasLimit),
    parentHash: headerData?.parentHash as Buffer,
  };
}

export function ethereumjsTransactionToRethnet(
  tx: TypedTransaction
): Transaction {
  const chainId = (_tx: TypedTransaction) => {
    if (_tx instanceof AccessListEIP2930Transaction) {
      return (_tx as AccessListEIP2930Transaction).chainId;
    } else if (_tx instanceof FeeMarketEIP1559Transaction) {
      return (_tx as FeeMarketEIP1559Transaction).chainId;
    } else {
      return undefined;
    }
  };

  const rethnetTx: Transaction = {
    from: tx.getSenderAddress().toBuffer(),
    to: tx.to?.buf,
    gasLimit: tx.gasLimit,
    gasPrice:
      (tx as FeeMarketEIP1559Transaction)?.maxFeePerGas ?? (tx as any).gasPrice,
    gasPriorityFee: (tx as FeeMarketEIP1559Transaction)?.maxPriorityFeePerGas,
    value: tx.value,
    nonce: tx.nonce,
    input: tx.data,
    accessList: (tx as AccessListEIP2930Transaction)?.AccessListJSON,
    chainId: chainId(tx),
  };

  return rethnetTx;
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
    ? rethnetResult.result.returnValue
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
      logs: !isHaltResult(rethnetResult.result)
        ? rethnetResult.result.logs.map((log) => {
            return [log.address, log.topics, log.data];
          })
        : [],
    },
  };
}
