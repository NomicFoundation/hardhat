export type Format = "hh-unencrypted-keystore";

export interface UnencryptedKeystoreFile {
  _format: Format;
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

export interface KeystoreLoader {
  keystoreFileExists: () => Promise<boolean>;
  createUnsavedKeystore: () => Promise<Keystore>;
  loadKeystoreFromFile: () => Promise<Keystore>;
  saveToKeystoreFile: () => Promise<void>;
}

export interface FileManager {
  fileExists(absolutePath: string): Promise<boolean>;
  writeJsonFile(
    absolutePathToFile: string,
    keystoreFile: UnencryptedKeystoreFile,
  ): Promise<void>;
  readJsonFile(absolutePathToFile: string): Promise<UnencryptedKeystoreFile>;
}
