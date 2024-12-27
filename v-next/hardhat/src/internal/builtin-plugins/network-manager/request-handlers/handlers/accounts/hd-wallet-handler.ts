import type { EthereumProvider } from "../../../../../../types/providers.js";

import { derivePrivateKeys } from "../../../accounts/derive-private-keys.js";

import { LocalAccountsHandler } from "./local-accounts.js";

export class HDWalletHandler extends LocalAccountsHandler {
  constructor(
    provider: EthereumProvider,
    mnemonic: string,
    hdpath: string = "m/44'/60'/0'/0/",
    initialIndex: number = 0,
    count: number = 10,
    passphrase: string = "",
  ) {
    const privateKeys = derivePrivateKeys(
      mnemonic,
      hdpath,
      initialIndex,
      count,
      passphrase,
    );

    super(provider, privateKeys);
  }
}
