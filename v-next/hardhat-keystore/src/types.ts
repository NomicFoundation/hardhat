export interface Keystore {
  version: string;
  keys: {
    [key: string]: string;
  };
}
