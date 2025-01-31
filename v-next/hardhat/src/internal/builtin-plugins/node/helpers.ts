import type { EdrNetworkAccountsConfig } from "../../../types/config.js";

import { hexStringToBytes } from "@ignored/hardhat-vnext-utils/hex";
import chalk from "chalk";
import { addr } from "micro-eth-signer";

import { isDefaultEdrNetworkHDAccountsConfig } from "../network-manager/edr/edr-provider.js";
import { normalizeEdrNetworkAccountsConfig } from "../network-manager/edr/utils/convert-to-edr.js";

export async function printEdrNetworkConfigAccounts(
  config: EdrNetworkAccountsConfig,
): Promise<void> {
  const accounts = await normalizeEdrNetworkAccountsConfig(config);

  if (accounts.length === 0) {
    return;
  }

  const isDefault =
    !Array.isArray(config) &&
    (await isDefaultEdrNetworkHDAccountsConfig(config));

  console.log("Accounts");
  console.log("========");

  if (isDefault === true) {
    console.log();
    printPublicPrivateKeysWarning();
    console.log();
  }

  for (const [index, account] of accounts.entries()) {
    const address = addr
      .fromPrivateKey(hexStringToBytes(await account.privateKey.getHexString()))
      .toLowerCase();
    const balance = (BigInt(account.balance) / 10n ** 18n).toString(10);

    console.log(`Account #${index}: ${address} (${balance} ETH)`);
    if (isDefault === true) {
      console.log(`Private Key: ${await account.privateKey.getHexString()}`);
    }

    console.log();
  }

  if (isDefault === true) {
    printPublicPrivateKeysWarning();
    console.log();
  }
}

function printPublicPrivateKeysWarning(): void {
  console.log(
    chalk.bold(
      "WARNING: Funds sent on live network to accounts with publicly known private keys WILL BE LOST.",
    ),
  );
}
