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
  addNewSecret(key: string, secret: string): Promise<void>;
  removeKey(key: string): Promise<void>;
  readValue(key: string): Promise<string | undefined>;
}

export interface RawInterruptions {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
  requestSecretInput: (inputDescription: string) => Promise<string>;
}
