export interface KeystoreFile {
  version: string;
  keys: {
    [key: string]: string;
  };
}

export interface KeystoreLoader {
  exists: () => Promise<boolean>;
  create: () => Promise<Keystore>;
  load: () => Promise<Keystore>;
  save: (keystore: Keystore) => Promise<void>;
}

export interface Keystore {
  listKeys(): Promise<string[]>;
  hasKey(key: string): Promise<boolean>;
  addNewValue(key: string, value: string): Promise<void>;
  removeKey(key: string): Promise<void>;
  readValue(key: string): Promise<string | undefined>;

  init(): Promise<void>;
  loadFromJSON: (json: unknown) => Keystore;
  toJSON(): any;
}

export interface ConsoleWrapper {
  requestSecretInput: (inputDescription: string) => Promise<string>;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export interface UserInteractions {
  setUpPassword(): Promise<void>;
  requestSecretFromUser: () => Promise<string>;

  displayNoKeystoreSetErrorMessage: () => Promise<void>;
  displayKeyNotFoundErrorMessage: (key: string) => Promise<void>;
  displayKeyRemovedInfoMessage: (key: string) => Promise<void>;
  displayValueInfoMessage: (value: string) => Promise<void>;
  displayNoKeysInfoMessage: () => Promise<void>;
  displayKeyListInfoMessage: (keys: string[]) => Promise<void>;
  displayInvalidKeyErrorMessage: (key: string) => Promise<void>;
  displayKeyAlreadyExistsWarning: (key: string) => Promise<void>;
  displaySecretCannotBeEmptyErrorMessage: () => Promise<void>;
  displayKeySetInfoMessage: (key: string) => Promise<void>;
}
