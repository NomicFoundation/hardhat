import type { FileManager } from "../../src/internal/types.js";
import type { Mock } from "node:test";

import { mock } from "node:test";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { writeUtf8File } from "@nomicfoundation/hardhat-utils/fs";

import {
  addSecretToKeystore,
  createEmptyEncryptedKeystore,
  createMasterKey,
  type EncryptedKeystore,
} from "../../src/internal/keystores/encryption.js";

import { TEST_PASSWORD_PROD, TEST_PASSWORD_DEV } from "./test-password.js";

export class MockFileManager implements FileManager {
  public masterKey: Uint8Array;

  readonly #salt: Uint8Array;
  #keystoreFile: EncryptedKeystore | null;

  constructor(dev: boolean) {
    this.#keystoreFile = null;

    ({ masterKey: this.masterKey, salt: this.#salt } = createMasterKey({
      password: dev ? TEST_PASSWORD_DEV : TEST_PASSWORD_PROD,
    }));
  }

  public async writePasswordFileForDevKeystore(
    devKeystorePasswordFilePath: string,
  ): Promise<void> {
    await writeUtf8File(devKeystorePasswordFilePath, TEST_PASSWORD_DEV);
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
  }): EncryptedKeystore {
    this.#keystoreFile = createEmptyEncryptedKeystore({
      masterKey: this.masterKey,
      salt: this.#salt,
    });

    for (const [key, value] of Object.entries(keys)) {
      this.#keystoreFile = addSecretToKeystore({
        masterKey: this.masterKey,
        encryptedKeystore: this.#keystoreFile,
        key,
        value,
      });
    }

    this.writeJsonFile.mock.resetCalls();

    return this.#keystoreFile;
  }

  public setKeystoreFile(keystoreFile: EncryptedKeystore): void {
    this.#keystoreFile = keystoreFile;
  }

  public fileExists: Mock<(_absolutePath: string) => Promise<boolean>> =
    mock.fn(async (_absolutePath: string): Promise<boolean> => {
      return this.#keystoreFile !== null;
    });

  public writeJsonFile: Mock<
    (
      _absolutePathToFile: string,
      keystoreFile: EncryptedKeystore,
    ) => Promise<void>
  > = mock.fn(
    async (
      _absolutePathToFile: string,
      keystoreFile: EncryptedKeystore,
    ): Promise<void> => {
      this.#keystoreFile = keystoreFile;
    },
  );

  public async readJsonFile(
    _absolutePathToFile: string,
  ): Promise<EncryptedKeystore> {
    assertHardhatInvariant(
      this.#keystoreFile !== null,
      "Keystore file not set for mock file manager",
    );

    return this.#keystoreFile;
  }
}
