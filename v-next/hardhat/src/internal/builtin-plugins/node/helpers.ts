import type { BuildInfo } from "../../../types/artifacts.js";
import type { EdrNetworkAccountsConfig } from "../../../types/config.js";
import type { SolidityBuildInfoOutput } from "../../../types/solidity.js";
import type { EdrProvider } from "../network-manager/edr/edr-provider.js";

import path from "node:path";

import {
  readJsonFile,
  readJsonFileAsStream,
} from "@nomicfoundation/hardhat-utils/fs";
import { hexStringToBytes } from "@nomicfoundation/hardhat-utils/hex";
import chalk from "chalk";
import { addr } from "micro-eth-signer";

import { sendErrorTelemetry } from "../../cli/telemetry/sentry/reporter.js";
import { isDefaultEdrNetworkHDAccountsConfig } from "../network-manager/edr/edr-provider.js";
import { normalizeEdrNetworkAccountsConfig } from "../network-manager/edr/utils/convert-to-edr.js";

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

/**
 * Creates a handler function that will be called on buildInfo file creations
 * (triggered from the compilation pipeline); the handler reads the build info
 * file and uploads the key details into the EDR instance.
 *
 * @param buildInfoDirPath - The path (under artifacts) to the build info
 * directory
 * @param provider - The EDR provider being updated.
 * @returns The handler function that is called with the buildId to upload.
 */
export function createBuildInfoUploadHandlerFrom(
  buildInfoDirPath: string,
  provider: EdrProvider,
  log: debug.Debugger,
): (buildId: string) => Promise<void> {
  const buildInfoHandler = async (buildId: string) => {
    try {
      log(`Adding new compilation result for build ${buildId} to the node`);
      const buildInfo: BuildInfo = await readJsonFile(
        path.join(buildInfoDirPath, `${buildId}.json`),
      );
      const buildInfoOutput: SolidityBuildInfoOutput =
        await readJsonFileAsStream(
          path.join(buildInfoDirPath, `${buildId}.output.json`),
        );

      await provider.addCompilationResult(
        buildInfo.solcVersion,
        buildInfo.input,
        buildInfoOutput.output,
      );

      log(`Added compiler result for ${buildId}`);
    } catch (error) {
      console.warn(
        chalk.yellow(
          `There was a problem adding the new compiler result for build ${buildId}.`,
        ),
      );

      log(
        "Last compilation result couldn't be added. Please report this to help us improve Hardhat.\n",
        error,
      );

      if (error instanceof Error) {
        await sendErrorTelemetry(error);
      }
    }
  };

  return buildInfoHandler;
}

// NOTE: This function is exported for testing purposes only
export function getPublicPrivateKeysWarning(): string {
  return chalk.bold(
    "WARNING: Funds sent on live network to accounts with publicly known private keys WILL BE LOST.",
  );
}
