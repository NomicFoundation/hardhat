import type {
  FileManager,
  UnencryptedKeystoreFile,
} from "../../src/internal/types.js";
import type { Mock } from "node:test";

import { mock } from "node:test";

import { assertHardhatInvariant } from "@ignored/hardhat-vnext-errors";

import { UnencryptedKeystore } from "../../src/internal/keystores/unencrypted-keystore.js";

export class MockFileManager implements FileManager {
  #keystoreFile: UnencryptedKeystoreFile | null;

  constructor() {
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
    this.writeJsonFile.mock.resetCalls();

    return keystoreFile;
  }

  public setKeystoreFile(keystoreFile: UnencryptedKeystoreFile): void {
    this.#keystoreFile = keystoreFile;
  }

  public async fileExists(_absolutePath: string): Promise<boolean> {
    return this.#keystoreFile !== null;
  }

  public writeJsonFile: Mock<
    (
      _absolutePathToFile: string,
      keystoreFile: UnencryptedKeystoreFile,
    ) => Promise<void>
  > = mock.fn(
    async (
      _absolutePathToFile: string,
      keystoreFile: UnencryptedKeystoreFile,
    ): Promise<void> => {
      this.#keystoreFile = keystoreFile;
    },
  );

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
