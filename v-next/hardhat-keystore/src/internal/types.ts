export interface Keystore {
  init(): Promise<Keystore>;
  loadFromJSON: (json: unknown) => Keystore;
  toJSON(): any;

  listKeys(): Promise<string[]>;
  hasKey(key: string): Promise<boolean>;
  addNewValue(key: string, value: string): Promise<void>;
  removeKey(key: string): Promise<void>;
  readValue(key: string): Promise<string | undefined>;
}

export interface KeystoreLoader {
  exists: () => Promise<boolean>;
  create: () => Promise<Keystore>;
  load: () => Promise<Keystore>;
  save: (keystore: Keystore) => Promise<void>;
}

export interface FileManager {
  fileExists(absolutePath: string): Promise<boolean>;
  writeJsonFile(
    absolutePathToFile: string,
    keystoreFile: UnencryptedKeystoreFile,
  ): Promise<void>;
  readJsonFile(absolutePathToFile: string): Promise<UnencryptedKeystoreFile>;
}

export type Format = "hh-unencrypted-keystore";

export interface UnencryptedKeystoreFile {
  _format: Format;
  version: number;
  keys: {
    [key: string]: string;
  };
}
