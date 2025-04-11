import type { Keystore as KeystoreI } from "../types.js";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@nomicfoundation/hardhat-errors";

import {
  addSecretToKeystore,
  decryptSecret,
  doesKeyExist,
  HmacKeyDecryptionError,
  removeSecretFromKeystore,
  type EncryptedKeystore,
} from "./encryption.js";

export class Keystore implements KeystoreI {
  #keystoreData: EncryptedKeystore;

  constructor(keystoreData: EncryptedKeystore) {
    this.#keystoreData = keystoreData;
  }

  public toJSON(): EncryptedKeystore {
    return this.#keystoreData;
  }

  public async listUnverifiedKeys(): Promise<string[]> {
    // In this scenario the keystore is not validated for integrity, so the returned keys might have been tampered with.
    // This is acceptable if the keys are only listed for display purposes.
    // This risk is considered acceptable for this use case.
    return Object.keys(this.#keystoreData.secrets);
  }

  public async hasKey(key: string, masterKey: Uint8Array): Promise<boolean> {
    try {
      return doesKeyExist({
        masterKey,
        encryptedKeystore: this.#keystoreData,
        key,
      });
    } catch (error) {
      if (error instanceof HmacKeyDecryptionError) {
        throw new HardhatError(
          HardhatError.ERRORS.HARDHAT_KEYSTORE.GENERAL.INVALID_PASSWORD_OR_CORRUPTED_KEYSTORE,
        );
      }

      throw error;
    }
  }

  public async readValue(key: string, masterKey: Uint8Array): Promise<string> {
    assertHardhatInvariant(
      key in this.#keystoreData.secrets,
      "Unknown key should never be read",
    );

    try {
      return decryptSecret({
        masterKey,
        encryptedKeystore: this.#keystoreData,
        key,
      });
    } catch (error) {
      if (error instanceof HmacKeyDecryptionError) {
        throw new HardhatError(
          HardhatError.ERRORS.HARDHAT_KEYSTORE.GENERAL.INVALID_PASSWORD_OR_CORRUPTED_KEYSTORE,
        );
      }

      throw error;
    }
  }

  public async removeKey(key: string, masterKey: Uint8Array): Promise<void> {
    assertHardhatInvariant(
      key in this.#keystoreData.secrets,
      "Unknown key should never be removed",
    );

    try {
      this.#keystoreData = removeSecretFromKeystore({
        masterKey,
        encryptedKeystore: this.#keystoreData,
        keyToRemove: key,
      });
    } catch (error) {
      if (error instanceof HmacKeyDecryptionError) {
        throw new HardhatError(
          HardhatError.ERRORS.HARDHAT_KEYSTORE.GENERAL.INVALID_PASSWORD_OR_CORRUPTED_KEYSTORE,
        );
      }

      throw error;
    }
  }

  public async addNewValue(
    key: string,
    value: string,
    masterKey: Uint8Array,
  ): Promise<void> {
    try {
      this.#keystoreData = addSecretToKeystore({
        masterKey,
        encryptedKeystore: this.#keystoreData,
        key,
        value,
      });
    } catch (error) {
      if (error instanceof HmacKeyDecryptionError) {
        throw new HardhatError(
          HardhatError.ERRORS.HARDHAT_KEYSTORE.GENERAL.INVALID_PASSWORD_OR_CORRUPTED_KEYSTORE,
        );
      }

      throw error;
    }
  }
}
