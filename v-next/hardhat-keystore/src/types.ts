export interface KeystoreFile {
  version: string;
  keys: {
    [key: string]: string;
  };
}

export interface KeystoreLoader {
  create: () => Promise<Keystore>;
  load: () => Promise<Keystore | undefined>;
}

export interface Keystore {
  listKeys(): Promise<string[]>;
  addNewValue(key: string, value: string): Promise<void>;
  removeKey(key: string): Promise<void>;
  readValue(key: string): Promise<string | undefined>;
}

export interface RawInterruptions {
  info: (message: string) => Promise<void>;
  warn: (message: string) => Promise<void>;
  error: (message: string) => Promise<void>;
  requestSecretInput: (inputDescription: string) => Promise<string>;
}
