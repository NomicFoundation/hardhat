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
