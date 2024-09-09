export interface UnencryptedKeystoreFile {
  _format: "hh-unencrypted-keystore";
  version: number;
  keys: {
    [key: string]: string;
  };
}

export interface Keystore {
  listKeys(): Promise<string[]>;
  hasKey(key: string): Promise<boolean>;
  addNewValue(key: string, value: string): Promise<void>;
  removeKey(key: string): Promise<void>;
  readValue(key: string): Promise<string>;
  toJSON(): UnencryptedKeystoreFile;
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
  createUnsavedKeystore: () => Promise<Keystore>;
  loadKeystore: () => Promise<Keystore>;
  saveKeystoreToFile: () => Promise<void>;
}

export interface FileManager {
  fileExists(absolutePath: string): Promise<boolean>;
  writeJsonFile(
    absolutePathToFile: string,
    keystoreFile: UnencryptedKeystoreFile,
  ): Promise<void>;
  readJsonFile(absolutePathToFile: string): Promise<UnencryptedKeystoreFile>;
}
