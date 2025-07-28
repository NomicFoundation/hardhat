import type { EncryptedKeystore } from "./keystores/encryption.js";

export interface Keystore {
  listUnverifiedKeys(): Promise<string[]>;
  hasKey(key: string, masterKey: Uint8Array): Promise<boolean>;
  addNewValue(key: string, value: string, masterKey: Uint8Array): Promise<void>;
  removeKey(key: string, masterKey: Uint8Array): Promise<void>;
  readValue(key: string, masterKey: Uint8Array): Promise<string>;
  isValidPassword(masterKey: Uint8Array): Promise<void>;
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
  getKeystoreFilePath: () => string;
}

export interface FileManager {
  fileExists(absolutePath: string): Promise<boolean>;
  writeJsonFile(
    absolutePathToFile: string,
    keystoreFile: EncryptedKeystore,
  ): Promise<void>;
  readJsonFile(absolutePathToFile: string): Promise<EncryptedKeystore>;
}

export type KeystoreConsoleLog = (text: string) => void;

export type KeystoreRequestSecretInput = (
  interruptor: string,
  inputDescription: string,
) => Promise<string>;
