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
  init(): Promise<void>;
  loadFromJSON: (json: unknown) => Keystore;
  toJSON(): any;

  listKeys(): Promise<string[]>;
  hasKey(key: string): Promise<boolean>;
  addNewValue(key: string, value: string): Promise<void>;
  removeKey(key: string): Promise<void>;
  readValue(key: string): Promise<string | undefined>;
}

export interface UserInteractions {
  setUpPassword(): Promise<void>;
  requestSecretFromUser: () => Promise<string>;

  // Error Messages
  displayInvalidKeyErrorMessage: (key: string) => Promise<void>;
  displayKeyNotFoundErrorMessage: (key: string) => Promise<void>;
  displayNoKeystoreSetErrorMessage: () => Promise<void>;
  displaySecretCannotBeEmptyErrorMessage: () => Promise<void>;

  // Warning Messages
  displayKeyAlreadyExistsWarning: (key: string) => Promise<void>;

  // Information Messages
  displayKeyListInfoMessage: (keys: string[]) => Promise<void>;
  displayKeyRemovedInfoMessage: (key: string) => Promise<void>;
  displayKeySetInfoMessage: (key: string) => Promise<void>;
  displayNoKeysInfoMessage: () => Promise<void>;
  displayValueInfoMessage: (value: string) => Promise<void>;
}
