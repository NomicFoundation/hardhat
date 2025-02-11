import type { EncryptedKeystore } from "./keystores/encryption.js";

export interface Keystore {
  listKeys(): Promise<string[]>;
  hasKey(key: string): Promise<boolean>;
  addNewValue(key: string, value: string, masterKey: Uint8Array): Promise<void>;
  removeKey(key: string, masterKey: Uint8Array): Promise<void>;
  readValue(key: string, masterKey: Uint8Array): Promise<string>;
  toJSON(): EncryptedKeystore;
}

/**
 * The KeystoreLoader is responsible for loading and saving the in-memory
 * keystore from and to the on-disk keystore file.
 *
 * As part of those tasks, it has responsilibty for:
 * - validating that the on-disk keystore file meets the expected structure
 *   during loading
 * - caching the in-memory keystore to reduce IO during loads
 */
export interface KeystoreLoader {
  isKeystoreInitialized: () => Promise<boolean>;
  createUnsavedKeystore: ({
    masterKey,
    salt,
  }: {
    masterKey: Uint8Array;
    salt: Uint8Array;
  }) => Promise<Keystore>;
  loadKeystore: () => Promise<Keystore>;
  saveKeystoreToFile: () => Promise<void>;
}

export interface FileManager {
  fileExists(absolutePath: string): Promise<boolean>;
  writeJsonFile(
    absolutePathToFile: string,
    keystoreFile: EncryptedKeystore,
  ): Promise<void>;
  readJsonFile(absolutePathToFile: string): Promise<EncryptedKeystore>;
}
