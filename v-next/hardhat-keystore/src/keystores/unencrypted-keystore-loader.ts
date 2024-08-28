import type { Keystore, KeystoreFile, KeystoreLoader } from "../types.js";

import path from "node:path";

import { assertHardhatInvariant } from "@ignored/hardhat-vnext-errors";
import {
  exists,
  readJsonFile,
  writeJsonFile,
} from "@ignored/hardhat-vnext-utils/fs";

import { io } from "../ui/io.js";
import { setUpPassword } from "../ui/password-manager.js";
import { assertFilePath } from "../utils/assert-file-path.js";
import { getConfigDir } from "../utils/get-config-dir.js";

import { UnencryptedKeystore } from "./unencrypted-keystore.js";

export class UnencryptedKeystoreLoader implements KeystoreLoader {
  public async hasKeystore(): Promise<boolean> {
    const keystore = await getKeystore();

    return keystore !== undefined;
  }

  public async loadOrInit(): Promise<Keystore> {
    const result = await getKeystore();

    if (result === undefined) {
      await setupKeystore();

      const newResult = await getKeystore();

      assertHardhatInvariant(
        newResult !== undefined,
        "Keystore should be defined after setup",
      );

      return new UnencryptedKeystore(
        newResult.keystore,
        newResult.keystoreFilePath,
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

async function setupKeystore(): Promise<void> {
  io.info("\n👷🔐 Hardhat-Keystore 🔐👷\n");

  await setUpPassword();

  const keystoreCache = {
    // TODO: store password hash (with random value) to validate later that password is correct
    version: "",
    keys: {},
  };

  const keystoreFilePath = await getKeystoreFilePath();

  assertFilePath(keystoreFilePath);
  await writeJsonFile(keystoreFilePath, keystoreCache);
}

async function getKeystoreFilePath(): Promise<string> {
  const configDirPath = await getConfigDir();
  return path.join(configDirPath, "keystore.json");
}
