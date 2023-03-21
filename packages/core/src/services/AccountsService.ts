import type { Providers } from "../types/providers";
import type { IAccountsService } from "../types/services";
import type { ethers } from "ethers";

export class AccountsService implements IAccountsService {
  private _accounts: string[] = [];
  private _signers: { [address: string]: ethers.Signer } = {};

  constructor(private readonly _providers: Providers) {}

  public async getAccounts(): Promise<string[]> {
    if (this._accounts.length === 0) {
      this._accounts = await this._providers.accounts.getAccounts();
    }

    return this._accounts;
  }

  public async getSigner(address: string): Promise<ethers.Signer> {
    if (this._signers[address] === undefined) {
      this._signers[address] = await this._providers.accounts.getSigner(
        address
      );
    }

    return this._signers[address];
  }
}
