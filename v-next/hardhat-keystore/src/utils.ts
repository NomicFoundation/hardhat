import type { Keystore } from "./types.js";

import path from "node:path";

import { getConfigDir } from "@ignored/hardhat-vnext-core/global-dir";
import { HardhatPluginError } from "@ignored/hardhat-vnext-errors";
import {
  exists,
  readJsonFile,
  writeJsonFile,
} from "@ignored/hardhat-vnext-utils/fs";
import chalk from "chalk";

import { requestSecretInput } from "./io.js";
import { PLUGIN_ID } from "./methods.js";
import { setUpPassword } from "./password-manager.js";

let keystoreCache: Keystore | undefined;
let keystoreFilePath: string | undefined;

export async function getKeystore(): Promise<Keystore | undefined> {
  if (keystoreCache !== undefined) {
    return keystoreCache;
  }

  keystoreFilePath = await getKeystoreFilePath();

  const fileExists = await exists(keystoreFilePath);
  if (fileExists === false) {
    return undefined;
  }

  const keystore: Keystore = await readJsonFile(keystoreFilePath);

  keystoreCache = keystore;

  return keystore;
}

export async function setupKeystore(): Promise<void> {
  console.log("\n👷🔐 Hardhat-Keystore 🔐👷\n");

  await setUpPassword();

  keystoreCache = {
    // TODO: store password hash (with random value) to validate later that password is correct
    version: "",
    keys: {},
  };

  assertFilePath(keystoreFilePath);
  await writeJsonFile(keystoreFilePath, keystoreCache);
}

export function validateKey(key: string): boolean {
  const KEY_REGEX = /^[a-zA-Z_]+[a-zA-Z0-9_]*$/;

  if (KEY_REGEX.test(key)) {
    return true;
  }

  const errMsg = `Invalid value for key: "${key}". Keys can only have alphanumeric characters and underscores, and they cannot start with a number.`;
  console.log(chalk.red(errMsg));

  return false;
}

export async function addNewSecret(key: string, force: boolean): Promise<void> {
  assertKeyStore(keystoreCache);
  assertFilePath(keystoreFilePath);

  if (keystoreCache.keys[key] !== undefined && !force) {
    console.log(
      chalk.yellow(
        `The key "${key}" already exists. Use the --force flag to overwrite it.`,
      ),
    );
    return;
  }

  const secret = await requestSecretInput("Enter secret to store: ");

  if (secret.length === 0) {
    console.log(chalk.red("The secret cannot be empty."));
    return;
  }

  keystoreCache.keys[key] = secret;
  await writeJsonFile(keystoreFilePath, keystoreCache);
}

async function getKeystoreFilePath(): Promise<string> {
  const configDirPath = await getConfigDir();
  return path.join(configDirPath, "keystore.json");
}

function assertKeyStore(
  keystore: Keystore | undefined,
): asserts keystore is Keystore {
  if (keystore === undefined) {
    throw new HardhatPluginError(
      PLUGIN_ID,
      "The keystore should be available at this point!",
    );
  }
}

function assertFilePath(fileP: string | undefined): asserts fileP is string {
  if (fileP === undefined) {
    throw new HardhatPluginError(
      PLUGIN_ID,
      "The filePath should be available at this point!",
    );
  }
}
