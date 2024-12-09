import type {
  EdrNetworkAccountConfig,
  EdrNetworkAccountsConfig,
  GenesisAccount,
} from "../../../types/config.js";

import {
  bytesToHexString,
  hexStringToBytes,
} from "@ignored/hardhat-vnext-utils/hex";
import chalk from "chalk";
import { addr } from "micro-eth-signer";

import { derivePrivateKeys } from "../network-manager/json-rpc-request-modifiers/accounts/derive-private-keys.js";

export function normalizeEdrNetworkConfigAccounts(
  accounts: EdrNetworkAccountsConfig,
): EdrNetworkAccountConfig[] {
  const normalizedAccounts: EdrNetworkAccountConfig[] = [];

  if (accounts !== undefined) {
    if (Array.isArray(accounts)) {
      normalizedAccounts.push(...accounts);
    } else if (accounts !== undefined) {
      const privateKeys = derivePrivateKeys(
        accounts.mnemonic,
        accounts.path,
        accounts.initialIndex,
        accounts.count,
        accounts.passphrase,
      );
      for (const privateKey of privateKeys) {
        normalizedAccounts.push({
          privateKey: bytesToHexString(privateKey),
          balance: accounts.accountsBalance,
        });
      }
    }
  }

  return normalizedAccounts;
}

export function printEdrNetworkConfigAccounts(
  accounts: Array<EdrNetworkAccountConfig | GenesisAccount>,
): void {
  if (accounts.length === 0) {
    return;
  }

  console.log("Accounts");
  console.log("========");

  // NOTE: In v2, we were printing the warning only if the default config was used.
  console.log();
  printPublicPrivateKeysWarning();
  console.log();

  for (const [index, account] of accounts.entries()) {
    const address = addr
      .fromPrivateKey(hexStringToBytes(account.privateKey))
      .toLowerCase();
    const balance = (BigInt(account.balance) / 10n ** 18n).toString(10);

    console.log(`Account #${index}: ${address} (${balance} ETH)`);
    // TODO: Should we print the private key as well?
    // console.log(`Private Key: ${account.privateKey}`);

    console.log();
  }

  // NOTE: In v2, we were printing the warning only if the default config was used.
  printPublicPrivateKeysWarning();
  console.log();
}

// NOTE: In v2, we were printing the warning only if the default config was used.
// Because of that we were certain that the printed accounts were publicly known.
function printPublicPrivateKeysWarning(): void {
  console.log(
    chalk.bold(
      "WARNING: Funds sent on live network to accounts with publicly known private keys WILL BE LOST.",
    ),
  );
}
