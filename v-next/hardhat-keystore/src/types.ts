export interface KeystoreFile {
  version: string;
  keys: {
    [key: string]: string;
  };
}

export interface KeystoreLoader {
  create: () => Promise<Keystore>;
  load: () => Promise<Keystore | undefined>;
  save: (keystore: Keystore) => Promise<void>;
}

export interface Keystore {
  listKeys(): Promise<string[]>;
  addNewValue(key: string, value: string): Promise<void>;
  removeKey(key: string): Promise<void>;
  readValue(key: string): Promise<string | undefined>;

  loadFromJson: (json: string) => Promise<void>;
  saveToJson(): Promise<string>;
}

export interface ConsoleWrapper {
  requestSecretInput: (inputDescription: string) => Promise<string>;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export interface RawInterruptions {
  setUpPassword(): Promise<void>;
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
  requestSecretFromUser: () => Promise<string>;
}
