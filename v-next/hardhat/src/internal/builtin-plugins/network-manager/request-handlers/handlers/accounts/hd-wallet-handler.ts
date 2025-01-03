import type { EthereumProvider } from "../../../../../../types/providers.js";

import { bytesToHexString } from "@ignored/hardhat-vnext-utils/hex";

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
    // NOTE: If mnemonic has space or newline at the beginning or end, it will be trimmed.
    // This is because mnemonic containing them may generate different private keys.
    const trimmedMnemonic = mnemonic.trim();

    const privateKeys = derivePrivateKeys(
      trimmedMnemonic,
      hdpath,
      initialIndex,
      count,
      passphrase,
    );

    const privateKeysAsHex = privateKeys.map((pk) => bytesToHexString(pk));

    super(provider, privateKeysAsHex);
  }
}
