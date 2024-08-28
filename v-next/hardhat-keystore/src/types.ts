export interface KeystoreFile {
  version: string;
  keys: {
    [key: string]: string;
  };
}

export interface KeystoreLoader {
  hasKeystore: () => Promise<boolean>;
  loadOrInit: () => Promise<Keystore>;
}

export interface Keystore {
  listKeys(): Promise<string[]>;
  addNewSecret(key: string, force: boolean): Promise<void>;
  removeKey(key: string): Promise<void>;
  readValue(key: string): Promise<string | undefined>;
}
