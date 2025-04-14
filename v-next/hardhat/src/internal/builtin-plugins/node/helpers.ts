import type { EdrNetworkAccountsConfig } from "../../../types/config.js";

import { hexStringToBytes } from "@nomicfoundation/hardhat-utils/hex";
import chalk from "chalk";
import { addr } from "micro-eth-signer";

import { isDefaultEdrNetworkHDAccountsConfig } from "../network-manager/edr/edr-provider.js";
import { normalizeEdrNetworkAccountsConfig } from "../network-manager/edr/utils/convert-to-edr.js";
import path from "node:path";

export async function formatEdrNetworkConfigAccounts(
  config: EdrNetworkAccountsConfig,
): Promise<string> {
  const accounts = await normalizeEdrNetworkAccountsConfig(config);

  if (accounts.length === 0) {
    return "";
  }

  const formattedAccountsLines: string[] = [];
  const isDefault =
    !Array.isArray(config) &&
    (await isDefaultEdrNetworkHDAccountsConfig(config));

  formattedAccountsLines.push("Accounts");
  formattedAccountsLines.push("========");

  if (isDefault === true) {
    formattedAccountsLines.push("");
    formattedAccountsLines.push(getPublicPrivateKeysWarning());
    formattedAccountsLines.push("");
  }

  const accountPrefix = (index: number) => `Account #${index}:`;
  const privateKeyPrefix = "Private Key:";

  let maxPrefixLength = accountPrefix(accounts.length - 1).length;
  if (isDefault && privateKeyPrefix.length > maxPrefixLength) {
    maxPrefixLength = privateKeyPrefix.length;
  }

  for (const [index, account] of accounts.entries()) {
    const address = addr
      .fromPrivateKey(hexStringToBytes(await account.privateKey.getHexString()))
      .toLowerCase();
    const balance = (BigInt(account.balance) / 10n ** 18n).toString(10);

    formattedAccountsLines.push(
      `${accountPrefix(index).padEnd(maxPrefixLength)} ${address} (${balance} ETH)`,
    );
    if (isDefault === true) {
      formattedAccountsLines.push(
        `${privateKeyPrefix.padEnd(maxPrefixLength)} ${await account.privateKey.getHexString()}`,
      );
    }

    formattedAccountsLines.push("");
  }

  if (isDefault === true) {
    formattedAccountsLines.push(getPublicPrivateKeysWarning());
    formattedAccountsLines.push("");
  }

  return formattedAccountsLines.join("\n");
}

// NOTE: This function is exported for testing purposes only
export function getPublicPrivateKeysWarning(): string {
  return chalk.bold(
    "WARNING: Funds sent on live network to accounts with publicly known private keys WILL BE LOST.",
  );
}
