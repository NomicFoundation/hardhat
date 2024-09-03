import type {
  FileManager,
  UnencryptedKeystoreFile,
} from "../../src/internal/types.js";

import { assertHardhatInvariant } from "@ignored/hardhat-vnext-errors";

export class MockFileManager implements FileManager {
  #keystoreFile: UnencryptedKeystoreFile | null;

  constructor() {
    this.#keystoreFile = null;
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
