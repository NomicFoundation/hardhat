import { BlockchainInterface } from "@nomicfoundation/ethereumjs-blockchain";
import { StateManager } from "@nomicfoundation/ethereumjs-statemanager";
import {
  Account,
  Address,
  bigIntToBuffer,
  bufferToBigInt,
  setLengthLeft,
} from "@nomicfoundation/ethereumjs-util";
import { Account as RethnetAccount, Rethnet } from "./";

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
      throw new Error("Block not found");
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
