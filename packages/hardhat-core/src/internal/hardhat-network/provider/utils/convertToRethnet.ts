import {
  BlockHeader as EthereumJSBlockHeader,
  HeaderData,
} from "@nomicfoundation/ethereumjs-block";
import { BlockchainInterface } from "@nomicfoundation/ethereumjs-blockchain";
import {
  DefaultStateManager,
  StateManager,
} from "@nomicfoundation/ethereumjs-statemanager";
import {
  AccessListEIP2930Transaction,
  FeeMarketEIP1559Transaction,
  TypedTransaction,
} from "@nomicfoundation/ethereumjs-tx";
import {
  Account,
  Address,
  bigIntToBuffer,
  bufferToBigInt,
  setLengthLeft,
} from "@nomicfoundation/ethereumjs-util";
import {
  Account as RethnetAccount,
  BlockConfig,
  BlockHeader as RethnetBlockHeader,
  ExecutionResult,
  Transaction,
} from "rethnet-evm";
import { fromBigIntLike } from "../../../util/bigint";
import { Exit } from "../vm/exit";
import { RunTxResult } from "../vm/vm-adapter";

export class HardhatDB {
  private _stateManager: StateManager;
  private _blockchain: BlockchainInterface | undefined;

  constructor(
    stateManager: StateManager,
    private _getBlockHash: (blockNumber: bigint) => Promise<Buffer>
  ) {
    this._stateManager = stateManager;
  }

  public async commit() {
    return this._stateManager.commit();
  }

  public async checkpoint() {
    return this._stateManager.checkpoint();
  }

  public async revert() {
    return this._stateManager.revert();
  }

  public async getAccountByAddress(address: Buffer) {
    return this._stateManager.getAccount(new Address(address));
  }

  public async getAccountStorageSlot(address: Buffer, index: bigint) {
    const key = setLengthLeft(bigIntToBuffer(index), 32);
    let data = await this._stateManager.getContractStorage(
      new Address(address),
      key
    );

    const EXPECTED_DATA_SIZE = 32;
    if (data.length < EXPECTED_DATA_SIZE) {
      data = Buffer.concat(
        [Buffer.alloc(EXPECTED_DATA_SIZE - data.length, 0), data],
        EXPECTED_DATA_SIZE
      );
    }

    return bufferToBigInt(data);
  }

  public async getBlockHash(blockNumber: bigint) {
    return this._getBlockHash(blockNumber);
  }

  public async getCodeByHash(codeHash: Buffer) {
    if (this._stateManager instanceof DefaultStateManager) {
      // eslint-disable-next-line @typescript-eslint/dot-notation
      const db = this._stateManager._trie["_db"];
      const code = await db.get(Buffer.concat([Buffer.from("c"), codeHash]));

      if (code === null) {
        // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
        throw new Error("returning null in getCodeByHash is not supported");
      }

      return code;
    }

    // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
    throw new Error("getCodeByHash not implemented for ForkStateManager");
  }

  public async getStorageRoot() {
    return this._stateManager.getStateRoot();
  }

  public async insertAccount(
    address: Buffer,
    account: RethnetAccount
  ): Promise<void> {
    return this._stateManager.putAccount(
      new Address(address),
      new Account(account.nonce, account.balance, undefined, account.codeHash)
    );
  }

  public async setAccountBalance(address: Buffer, balance: bigint) {
    return this._stateManager.modifyAccountFields(new Address(address), {
      balance,
    });
  }

  public async setAccountCode(address: Buffer, code: Buffer) {
    return this._stateManager.putContractCode(new Address(address), code);
  }

  public async setAccountNonce(address: Buffer, nonce: bigint) {
    return this._stateManager.modifyAccountFields(new Address(address), {
      nonce,
    });
  }

  public async setAccountStorageSlot(
    address: Buffer,
    index: bigint,
    value: bigint
  ) {
    return this._stateManager.putContractStorage(
      new Address(address),
      setLengthLeft(bigIntToBuffer(index), 32),
      setLengthLeft(bigIntToBuffer(value), 32)
    );
  }
}

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
    nonce: BigInt("0x" + blockHeader.nonce.toString("hex")),
    baseFeePerGas: blockHeader.baseFeePerGas,
  };
}

export function ethereumjsHeaderDataToRethnet(
  headerData?: HeaderData,
  difficulty?: bigint,
  prevRandao?: Buffer
): BlockConfig {
  const coinbase =
    headerData?.coinbase === undefined
      ? undefined
      : Buffer.isBuffer(headerData.coinbase)
      ? headerData.coinbase
      : typeof headerData?.coinbase === "string"
      ? Buffer.from(headerData.coinbase)
      : headerData.coinbase.buf;

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

export function rethnetResultToRunTxResult(
  rethnetResult: ExecutionResult
): RunTxResult {
  const vmError = Exit.fromRethnetExitCode(rethnetResult.exitCode);
  // We return an object with only the properties that are used by Hardhat.
  // To be extra sure that the other properties are not used, we add getters
  // that exit the process if accessed.

  return {
    gasUsed: rethnetResult.gasUsed,
    createdAddress:
      rethnetResult.output.address !== undefined
        ? new Address(rethnetResult.output.address)
        : undefined,
    exit: vmError,
    returnValue: rethnetResult.output.output ?? Buffer.from([]),
    get bloom(): any {
      console.trace("bloom not implemented");
      return process.exit(1);
    },
    get receipt(): any {
      console.trace("receipt not implemented");
      return process.exit(1);
    },
  };
}
