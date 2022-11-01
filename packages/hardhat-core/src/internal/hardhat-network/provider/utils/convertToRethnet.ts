import { BlockchainInterface } from "@nomicfoundation/ethereumjs-blockchain";
import { EvmError } from "@nomicfoundation/ethereumjs-evm";
import { ERROR } from "@nomicfoundation/ethereumjs-evm/dist/exceptions";
import { StateManager } from "@nomicfoundation/ethereumjs-statemanager";
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
import { RunTxResult } from "@nomicfoundation/ethereumjs-vm";
import {
  Account as RethnetAccount,
  Config,
  ExecutionResult,
  Rethnet,
  Transaction,
} from "rethnet-evm";

import { HardhatError } from "../../../core/errors";
import { ERRORS } from "../../../core/errors-list";

export class HardhatDB {
  private _stateManager: StateManager;
  private _blockchain: BlockchainInterface | undefined;

  constructor(stateManager: StateManager, blockchain?: BlockchainInterface) {
    this._stateManager = stateManager;
    this._blockchain = blockchain;
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
    const block = await this._blockchain?.getBlock(blockNumber);
    if (block === undefined || block === null) {
      throw new HardhatError(ERRORS.GENERAL.UNSUPPORTED_OPERATION, {
        error: "Block not found",
      });
    }

    return block.header.hash();
  }

  public async getCodeByHash(codeHash: Buffer) {
    const db = (this._stateManager as any)._trie._db;
    return db.get(Buffer.concat([Buffer.from("c"), codeHash]));
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

export function createRethnetFromHardhatDB(
  cfg: Config,
  hardhatDB: HardhatDB
): Rethnet {
  return Rethnet.withCallbacks(
    cfg,
    {
      getAccountByAddressFn:
        HardhatDB.prototype.getAccountByAddress.bind(hardhatDB),
      getAccountStorageSlotFn:
        HardhatDB.prototype.getAccountStorageSlot.bind(hardhatDB),
      getBlockHashFn: HardhatDB.prototype.getBlockHash.bind(hardhatDB),
      getCodeByHashFn: HardhatDB.prototype.getCodeByHash.bind(hardhatDB),
    },
    null,
    {
      checkpointFn: HardhatDB.prototype.checkpoint.bind(hardhatDB),
      revertFn: HardhatDB.prototype.revert.bind(hardhatDB),
      getStorageRootFn: HardhatDB.prototype.getStorageRoot.bind(hardhatDB),
      insertAccountFn: HardhatDB.prototype.insertAccount.bind(hardhatDB),
      setAccountBalanceFn:
        HardhatDB.prototype.setAccountBalance.bind(hardhatDB),
      setAccountCodeFn: HardhatDB.prototype.setAccountCode.bind(hardhatDB),
      setAccountNonceFn: HardhatDB.prototype.setAccountNonce.bind(hardhatDB),
      setAccountStorageSlotFn:
        HardhatDB.prototype.setAccountStorageSlot.bind(hardhatDB),
    }
  );
}

export function rethnetResultToRunTxResult(
  rethnetResult: ExecutionResult
): RunTxResult {
  // We return an object with only the properties that are used by Hardhat.
  // To be extra sure that the other properties are not used, we add getters
  // that exit the process if accessed.
  return {
    totalGasSpent: rethnetResult.gasUsed,
    gasRefund: rethnetResult.gasRefunded,
    createdAddress:
      rethnetResult.output.address !== undefined
        ? new Address(rethnetResult.output.address)
        : undefined,
    execResult: {
      exceptionError: mapRethnetExitCodeToEthereumJsExceptionError(
        rethnetResult.exitCode
      ),
      returnValue: rethnetResult.output.output ?? Buffer.from([]),

      get runState(): any {
        console.trace("execResult.runState not implemented");
        return process.exit(1);
      },
      get gas(): any {
        console.trace("execResult.gas not implemented");
        return process.exit(1);
      },
      get executionGasUsed(): any {
        console.trace("execResult.executionGasUsed not implemented");
        return process.exit(1);
      },
      get logs(): any {
        console.trace("execResult.logs not implemented");
        return process.exit(1);
      },
      get selfdestruct(): any {
        console.trace("execResult.selfdestruct not implemented");
        return process.exit(1);
      },
      get gasRefund(): any {
        console.trace("execResult.gasRefund not implemented");
        return process.exit(1);
      },
    },

    get bloom(): any {
      console.trace("bloom not implemented");
      return process.exit(1);
    },
    get amountSpent(): any {
      console.trace("amountSpent not implemented");
      return process.exit(1);
    },
    get receipt(): any {
      console.trace("receipt not implemented");
      return process.exit(1);
    },
    get accessList(): any {
      console.trace("accessList not implemented");
      return process.exit(1);
    },
  };
}

const rethnetExitCodeToEthereumJsError = new Map([
  [0x50, ERROR.OUT_OF_GAS],
  [0x57, ERROR.STACK_UNDERFLOW],
  [0x58, ERROR.STACK_OVERFLOW],
  [0x54, ERROR.INVALID_JUMP],
  [0x51, ERROR.INVALID_OPCODE],
  [0x53, ERROR.INVALID_OPCODE],
  [0x59, ERROR.OUT_OF_RANGE],
  [0x20, ERROR.REVERT],
  [0x52, ERROR.STATIC_STATE_CHANGE],
  [0x60, ERROR.CREATE_COLLISION],
  [0x01, ERROR.STOP],
  [0x53, ERROR.INVALID_BYTECODE_RESULT],
  [0x64, ERROR.INITCODE_SIZE_VIOLATION],
]);

function mapRethnetExitCodeToEthereumJsExceptionError(
  rethnetExitCode: number
): EvmError | undefined {
  if (rethnetExitCode <= 0x03) {
    return;
  }

  const ethereumJsError = rethnetExitCodeToEthereumJsError.get(rethnetExitCode);
  if (ethereumJsError === undefined) {
    console.trace(`Couldn't map exit code ${rethnetExitCode}`);
    process.exit(1);
  }

  return new EvmError(ethereumJsError);
}
