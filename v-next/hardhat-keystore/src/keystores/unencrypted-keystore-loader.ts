import type {
  Keystore,
  KeystoreFile,
  KeystoreLoader,
  RawInterruptions,
} from "../types.js";

import path from "node:path";

import { assertHardhatInvariant } from "@ignored/hardhat-vnext-errors";
import {
  exists,
  readJsonFile,
  writeJsonFile,
} from "@ignored/hardhat-vnext-utils/fs";

import { setUpPassword } from "../ui/password-manager.js";
import { getConfigDir } from "../utils/get-config-dir.js";

import { UnencryptedKeystore } from "./unencrypted-keystore.js";

export class UnencryptedKeystoreLoader implements KeystoreLoader {
  readonly #interruptions: RawInterruptions;

  constructor(interruptions: RawInterruptions) {
    this.#interruptions = interruptions;
  }

  public async load(): Promise<Keystore | undefined> {
    const result = await getKeystore();

    if (result === undefined) {
      return undefined;
    }

    return new UnencryptedKeystore(result.keystore, result.keystoreFilePath);
  }

  public async create(): Promise<Keystore> {
    let result = await getKeystore();

    if (result === undefined) {
      await setupKeystore(this.#interruptions);
      result = await getKeystore();

      assertHardhatInvariant(
        result !== undefined,
        "Keystore should be defined after setup",
      );
    }

    return new UnencryptedKeystore(result.keystore, result.keystoreFilePath);
  }
}

async function getKeystore(): Promise<
  { keystore: KeystoreFile; keystoreFilePath: string } | undefined
> {
  const keystoreFilePath = await getKeystoreFilePath();

  const fileExists = await exists(keystoreFilePath);
  if (fileExists === false) {
    return undefined;
  }

  const keystore: KeystoreFile = await readJsonFile(keystoreFilePath);

  return { keystore, keystoreFilePath };
}

async function setupKeystore(interruptions: RawInterruptions): Promise<void> {
  await interruptions.info("\n👷🔐 Hardhat-Keystore 🔐👷\n");

  await setUpPassword(interruptions);

  const keystoreCache = {
    version: "",
    keys: {},
  };

  const keystoreFilePath = await getKeystoreFilePath();

  await writeJsonFile(keystoreFilePath, keystoreCache);
}

async function getKeystoreFilePath(): Promise<string> {
  const configDirPath = await getConfigDir();
  return path.join(configDirPath, "keystore.json");
}
