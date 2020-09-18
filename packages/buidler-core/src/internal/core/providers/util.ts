import {
  BuidlerNetworkAccount,
  BuidlerNetworkHDAccountsConfig,
} from "../../../types";
import { deriveKeyFromMnemonicAndPath } from "../../util/keys-derivation";
import { DEFAULT_BUIDLER_NETWORK_BALANCE } from "../config/default-config";
import { BuidlerError } from "../errors";
import { ERRORS } from "../errors-list";

const HD_PATH_REGEX = /^m(:?\/\d+'?)+\/?$/;

export function derivePrivateKeys(
  mnemonic: string,
  hdpath: string = "m/44'/60'/0'/0/",
  initialIndex: number = 0,
  count: number = 10
): Buffer[] {
  if (hdpath.match(HD_PATH_REGEX) === null) {
    throw new BuidlerError(ERRORS.NETWORK.INVALID_HD_PATH, { path: hdpath });
  }

  if (!hdpath.endsWith("/")) {
    hdpath += "/";
  }

  const privateKeys: Buffer[] = [];

  for (let i = initialIndex; i < initialIndex + count; i++) {
    const privateKey = deriveKeyFromMnemonicAndPath(
      mnemonic,
      hdpath + i.toString()
    );

    if (privateKey === undefined) {
      throw new BuidlerError(ERRORS.NETWORK.CANT_DERIVE_KEY, {
        mnemonic,
        path: hdpath,
      });
    }

    privateKeys.push(privateKey);
  }

  return privateKeys;
}

export function normalizeBuidlerEVMAccountsConfig(
  accountsConfig: BuidlerNetworkAccount[] | BuidlerNetworkHDAccountsConfig
): BuidlerNetworkAccount[] {
  if (Array.isArray(accountsConfig)) {
    return accountsConfig;
  }

  const { bufferToHex } = require("ethereumjs-util");

  return derivePrivateKeys(
    accountsConfig.mnemonic,
    accountsConfig.path,
    accountsConfig.initialIndex,
    accountsConfig.count
  ).map((pk) => ({
    privateKey: bufferToHex(pk),
    balance: accountsConfig.accountsBalance ?? DEFAULT_BUIDLER_NETWORK_BALANCE,
  }));
}
