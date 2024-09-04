import type {
  FileManager,
  UnencryptedKeystoreFile,
} from "../../src/internal/types.js";

import { assertHardhatInvariant } from "@ignored/hardhat-vnext-errors";

import { UnencryptedKeystore } from "../../src/internal/keystores/unencrypted-keystore.js";

export class MockFileManager implements FileManager {
  public writeJsonFileCalled: boolean;
  #keystoreFile: UnencryptedKeystoreFile | null;

  constructor() {
    this.writeJsonFileCalled = false;
    this.#keystoreFile = null;
  }

  /**
   * Only used in tests to ensure there is no current keystore
   * file at the path.
   */
  public setupNoKeystoreFile(): void {
    this.#keystoreFile = null;
  }

  public setupExistingKeystoreFile(keys: {
    [key: string]: string;
  }): UnencryptedKeystoreFile {
    const keystoreFile =
      UnencryptedKeystore.createEmptyUnencryptedKeystoreFile();

    keystoreFile.keys = keys;

    this.#keystoreFile = keystoreFile;
    this.writeJsonFileCalled = false;

    return keystoreFile;
  }

  public setKeystoreFile(keystoreFile: UnencryptedKeystoreFile): void {
    this.#keystoreFile = keystoreFile;
  }

  public async fileExists(_absolutePath: string): Promise<boolean> {
    return this.#keystoreFile !== null;
  }

  public async writeJsonFile(
    _absolutePathToFile: string,
    keystoreFile: UnencryptedKeystoreFile,
  ): Promise<void> {
    this.writeJsonFileCalled = true;
    this.#keystoreFile = keystoreFile;
  }

  public async readJsonFile(
    _absolutePathToFile: string,
  ): Promise<UnencryptedKeystoreFile> {
    assertHardhatInvariant(
      this.#keystoreFile !== null,
      "Keystore file not set for mock file manager",
    );

    return this.#keystoreFile;
  }
}
