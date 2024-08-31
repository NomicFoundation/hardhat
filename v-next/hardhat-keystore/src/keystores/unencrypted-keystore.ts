import type { Keystore, KeystoreFile } from "../types.js";

export class UnencryptedKeystore implements Keystore {
  #keystoreCache: KeystoreFile;

  constructor(keystoreFile: KeystoreFile) {
    this.#keystoreCache = keystoreFile;
  }

  public async listKeys(): Promise<string[]> {
    return Object.keys(this.#keystoreCache.keys);
  }

  public async readValue(key: string): Promise<string | undefined> {
    return this.#keystoreCache.keys[key];
  }

  public async removeKey(key: string): Promise<void> {
    delete this.#keystoreCache.keys[key];
  }

  public async addNewValue(key: string, value: string): Promise<void> {
    this.#keystoreCache.keys[key] = value;
  }

  public async loadFromJson(json: string): Promise<void> {
    const keystore: KeystoreFile = JSON.parse(json);

    this.#keystoreCache = keystore;
  }

  public async saveToJson(): Promise<string> {
    return JSON.stringify(this.#keystoreCache) + "\n";
  }
}
