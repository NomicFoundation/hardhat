export interface KeystoreFile {
  version: string;
  keys: {
    [key: string]: string;
  };
}

export interface KeystoreLoader {
  hasKeystore: () => Promise<boolean>;
  loadOrInit: () => Promise<KeystoreFile>;
}
