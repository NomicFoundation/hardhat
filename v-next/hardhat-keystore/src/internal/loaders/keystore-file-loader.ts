import type {
  FileManager,
  Keystore,
  KeystoreLoader,
  UnencryptedKeystoreFile,
} from "../types.js";

import { HardhatError } from "@ignored/hardhat-vnext-errors";

import { UnencryptedKeystore } from "../keystores/unencrypted-keystore.js";
import { unencryptedKeystoreFileSchema } from "../types-validation.js";

export class KeystoreFileLoader implements KeystoreLoader {
  readonly #keystoreFilePath: string;
  readonly #fileManager: FileManager;

  constructor(keystoreFilePath: string, fileManger: FileManager) {
    this.#keystoreFilePath = keystoreFilePath;
    this.#fileManager = fileManger;
  }

  public async exists(): Promise<boolean> {
    return this.#fileManager.fileExists(this.#keystoreFilePath);
  }

  public async load(): Promise<Keystore> {
    const keystoreFile = await this.#fileManager.readJsonFile(
      this.#keystoreFilePath,
    );

    this.#throwIfInvalidKeystoreFormat(keystoreFile);

    return new UnencryptedKeystore(keystoreFile);
  }

  public async create(): Promise<Keystore> {
    return new UnencryptedKeystore(
      UnencryptedKeystore.createEmptyUnencryptedKeystoreFile(),
    );
  }

  public async save(keystore: Keystore): Promise<void> {
    const keystoreFile = keystore.toJSON();

    await this.#fileManager.writeJsonFile(this.#keystoreFilePath, keystoreFile);
  }

  #throwIfInvalidKeystoreFormat(keystore: UnencryptedKeystoreFile): void {
    try {
      unencryptedKeystoreFileSchema.parse(keystore);
    } catch (error) {
      throw new HardhatError(
        HardhatError.ERRORS.KEYSTORE.INVALID_KEYSTORE_FILE_FORMAT,
        error instanceof Error ? error : undefined,
      );
    }
  }
}
