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

  displayNoKeystoreSetErrorMessage: (
    interruptions: RawInterruptions,
  ) => Promise<void>;
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
