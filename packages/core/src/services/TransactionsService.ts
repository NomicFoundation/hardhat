import { ethers } from "ethers";

import { Providers } from "../providers";

export class TransactionsService {
  constructor(private readonly _providers: Providers) {}

  public async wait(
    txHash: string
  ): Promise<ethers.providers.TransactionReceipt> {
    const provider = new ethers.providers.Web3Provider(
      this._providers.ethereumProvider
    );

    return provider.waitForTransaction(txHash);
  }
}
