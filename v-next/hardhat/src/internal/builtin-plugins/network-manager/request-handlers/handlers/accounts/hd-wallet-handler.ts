import type { EthereumProvider } from "../../../../../../types/providers.js";

import { derivePrivateKeys } from "../../../accounts/derive-private-keys.js";

import { LocalAccountsHandler } from "./local-accounts.js";

/**
 * This handler takes a long time to load because it imports LocalAccountsHandler.
 * Currently, it is only used in the handlers array where it is imported dynamically.
 */
export class HDWalletHandler extends LocalAccountsHandler {
  public static async create(
    provider: EthereumProvider,
    mnemonic: string,
    hdpath: string = "m/44'/60'/0'/0/",
    initialIndex: number = 0,
    count: number = 10,
    passphrase: string = "",
  ): Promise<HDWalletHandler> {
    const privateKeys = await derivePrivateKeys(
      mnemonic,
      hdpath,
      initialIndex,
      count,
      passphrase,
    );

    return new HDWalletHandler(provider, privateKeys);
  }
  private constructor(provider: EthereumProvider, privateKeys: string[]) {
    super(provider, privateKeys);
  }
}
