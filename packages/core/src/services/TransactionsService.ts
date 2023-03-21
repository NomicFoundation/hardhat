import type { Providers } from "../types/providers";
import type { ITransactionsService } from "../types/services";

import { ethers } from "ethers";

export class TransactionsService implements ITransactionsService {
  constructor(private readonly _providers: Providers) {}

  public async wait(
    txHash: string
  ): Promise<ethers.providers.TransactionReceipt> {
    const provider = new ethers.providers.Web3Provider(
      this._providers.ethereumProvider
    );

    return provider.waitForTransaction(txHash);
  }

  public async waitForEvent(
    filter: ethers.EventFilter,
    durationMs: number
  ): Promise<ethers.providers.Log | null> {
    const provider = new ethers.providers.Web3Provider(
      this._providers.ethereumProvider
    );

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(null);
      }, durationMs);

      provider.once(filter, (log) => {
        clearTimeout(timeout);

        resolve(log);
      });
    });
  }
}
