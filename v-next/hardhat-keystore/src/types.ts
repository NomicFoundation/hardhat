export interface KeystoreFile {
  version: string;
  keys: {
    [key: string]: string;
  };
}
