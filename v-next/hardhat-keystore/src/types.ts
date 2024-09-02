export interface Keystore {
  init(): Promise<void>;
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

export interface UnencryptedKeystoreFile {
  _format: "hh-unencrypted-keystore";
  version: 1;
  keys: {
    [key: string]: string;
  };
}
