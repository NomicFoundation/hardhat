import type {
  Keystore,
  KeystoreFile,
  KeystoreLoader,
  RawInterruptions,
} from "../types.js";

import path from "node:path";

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
    const keystoreFilePath = await getKeystoreFilePath();

    const fileExists = await exists(keystoreFilePath);
    if (fileExists === false) {
      return undefined;
    }

    const keystore: KeystoreFile = await readJsonFile(keystoreFilePath);

    return new UnencryptedKeystore(keystore, keystoreFilePath);
  }

  public async create(): Promise<Keystore> {
    await this.#interruptions.info("\n👷🔐 Hardhat-Keystore 🔐👷\n");

    await setUpPassword(this.#interruptions);

    const keystore = {
      version: "",
      keys: {},
    };

    const keystoreFilePath = await getKeystoreFilePath();

    await writeJsonFile(keystoreFilePath, keystore);

    return new UnencryptedKeystore(keystore, keystoreFilePath);
  }
}

async function getKeystoreFilePath(): Promise<string> {
  const configDirPath = await getConfigDir();
  return path.join(configDirPath, "keystore.json");
}
