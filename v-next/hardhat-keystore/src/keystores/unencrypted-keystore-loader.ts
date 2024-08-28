import type { Keystore } from "../types.js";

import path from "node:path";

import {
  exists,
  readJsonFile,
  writeJsonFile,
} from "@ignored/hardhat-vnext-utils/fs";
import chalk from "chalk";

import { io } from "../io.js";
import { setUpPassword } from "../password-manager.js";
import { assertFilePath } from "../utils/assert-file-path.js";
import { assertKeyStore } from "../utils/assert-keystore.js";
import { getConfigDir } from "../utils/get-config-dir.js";

let keystoreCache: Keystore | undefined;
let keystoreFilePath: string | undefined;

// ATTENTION: For testing purposes
export function setKeystoreCache(value: Keystore | undefined): void {
  keystoreCache = value;
}

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
  io.info("\n👷🔐 Hardhat-Keystore 🔐👷\n");

  await setUpPassword();

  keystoreCache = {
    // TODO: store password hash (with random value) to validate later that password is correct
    version: "",
    keys: {},
  };

  assertFilePath(keystoreFilePath);
  await writeJsonFile(keystoreFilePath, keystoreCache);
}

export async function removeKey(key: string): Promise<void> {
  assertKeyStore(keystoreCache);

  if (keystoreCache.keys[key] === undefined) {
    io.error(`Key "${key}" not found`);
    return;
  }

  delete keystoreCache.keys[key];

  assertFilePath(keystoreFilePath);
  await writeJsonFile(keystoreFilePath, keystoreCache);

  io.info(`Key "${key}" removed`);
}

export function validateKey(key: string): boolean {
  const KEY_REGEX = /^[a-zA-Z_]+[a-zA-Z0-9_]*$/;

  if (KEY_REGEX.test(key)) {
    return true;
  }

  const errMsg = `Invalid value for key: "${key}". Keys can only have alphanumeric characters and underscores, and they cannot start with a number.`;
  io.error(errMsg);

  return false;
}

export async function addNewSecret(key: string, force: boolean): Promise<void> {
  assertKeyStore(keystoreCache);
  assertFilePath(keystoreFilePath);

  if (keystoreCache.keys[key] !== undefined && !force) {
    io.warn(
      `The key "${key}" already exists. Use the ${chalk.blue.italic("--force")} flag to overwrite it.`,
    );
    return;
  }

  const secret = await io.requestSecretInput("Enter secret to store: ");

  if (secret.length === 0) {
    io.error("The secret cannot be empty.");
    return;
  }

  keystoreCache.keys[key] = secret;
  await writeJsonFile(keystoreFilePath, keystoreCache);
}

async function getKeystoreFilePath(): Promise<string> {
  const configDirPath = await getConfigDir();
  return path.join(configDirPath, "keystore.json");
}
