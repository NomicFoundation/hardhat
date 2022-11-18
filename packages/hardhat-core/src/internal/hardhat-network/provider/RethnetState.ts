import { StateManager as StateManagerInterface } from "@nomicfoundation/ethereumjs-statemanager";
import { StorageDump } from "@nomicfoundation/ethereumjs-statemanager/dist/interface";
import {
  Account,
  Address,
  KECCAK256_NULL,
} from "@nomicfoundation/ethereumjs-util";
import { StateManager, Account as RethnetAccount } from "rethnet-evm";
import { GenesisAccount } from "./node-types";

/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */
/* eslint-disable @typescript-eslint/no-unused-vars */

export class RethnetStateManager implements StateManagerInterface {
  constructor(private _state: StateManager = new StateManager()) {}

  public static withGenesisAccounts(
    genesisAccounts: GenesisAccount[]
  ): RethnetStateManager {
    return new RethnetStateManager(
      StateManager.withGenesisAccounts(
        genesisAccounts.map((account) => {
          return {
            privateKey: account.privateKey,
            balance: BigInt(account.balance),
          };
        })
      )
    );
  }

  public asInner(): StateManager {
    return this._state;
  }

  public copy(): RethnetStateManager {
    return this;
  }

  public async flush(): Promise<void> {
    throw new Error("not implemented");
  }

  public async dumpStorage(address: Address): Promise<StorageDump> {
    throw new Error("not implemented");
  }

  public async accountExists(address: Address): Promise<boolean> {
    const account = await this._state.getAccountByAddress(address.buf);
    return account !== null;
  }

  public async getAccount(address: Address): Promise<Account> {
    const account = await this._state.getAccountByAddress(address.buf);
    return new Account(
      account?.nonce,
      account?.balance,
      undefined,
      account?.codeHash
    );
  }

  public async putAccount(address: Address, account: Account): Promise<void> {
    await this._state.insertAccount(address.buf, {
      balance: account.balance,
      nonce: account.nonce,
      codeHash: account.codeHash,
    });
  }

  public async accountIsEmpty(address: Address): Promise<boolean> {
    const account = await this._state.getAccountByAddress(address.buf);
    return (
      account !== null &&
      account.balance === 0n &&
      account.nonce === 0n &&
      account.codeHash.equals(KECCAK256_NULL)
    );
  }

  public async deleteAccount(address: Address): Promise<void> {
    await this._state.removeAccount(address.buf);
  }

  public async modifyAccountFields(
    address: Address,
    accountFields: Partial<
      Pick<Account, "nonce" | "balance" | "storageRoot" | "codeHash">
    >
  ): Promise<void> {
    await this._state.modifyAccount(
      address.buf,
      async function (account: RethnetAccount): Promise<RethnetAccount> {
        return {
          balance: accountFields.balance ?? account.balance,
          nonce: accountFields.nonce ?? account.nonce,
          codeHash: accountFields.codeHash ?? account.codeHash,
          code: account.code,
        };
      }
    );
  }

  public async putContractCode(address: Address, value: Buffer): Promise<void> {
    throw new Error("not implemented");
  }

  public async getContractCode(address: Address): Promise<Buffer> {
    const account = await this._state.getAccountByAddress(address.buf);
    if (account === null) {
      return Buffer.allocUnsafe(0);
    }

    if (account.code !== undefined) {
      return account.code;
    }

    return this._state.getCodeByHash(account.codeHash);
  }

  public async getContractStorage(
    address: Address,
    key: Buffer
  ): Promise<Buffer> {
    throw new Error("not implemented");
  }

  public async putContractStorage(
    address: Address,
    key: Buffer,
    value: Buffer
  ): Promise<void> {
    throw new Error("not implemented");
  }

  public async clearContractStorage(address: Address): Promise<void> {
    throw new Error("not implemented");
  }

  public async checkpoint(): Promise<void> {
    return this._state.checkpoint();
  }

  public async commit(): Promise<void> {
    throw new Error("not implemented");
  }

  public async revert(): Promise<void> {
    return this._state.revert();
  }

  public async getStateRoot(): Promise<Buffer> {
    return this._state.getStorageRoot();
  }

  public async setStateRoot(stateRoot: Buffer): Promise<void> {
    throw new Error("not implemented");
  }

  public async hasStateRoot(root: Buffer): Promise<boolean> {
    throw new Error("not implemented");
  }
}
