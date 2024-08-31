import type { Keystore, KeystoreFile } from "../../src/types.js";

export class MemoryKeystore implements Keystore {
  #keyMap: Map<string, string>;

  constructor() {
    this.#keyMap = new Map();
  }

  public async listKeys(): Promise<string[]> {
    return [...this.#keyMap.keys()];
  }

  public async hasKey(key: string): Promise<boolean> {
    return this.#keyMap.has(key);
  }

  public async addNewValue(key: string, value: string): Promise<void> {
    this.#keyMap.set(key, value);
  }

  public async removeKey(key: string): Promise<void> {
    this.#keyMap.delete(key);
  }

  public async readValue(key: string): Promise<string | undefined> {
    return this.#keyMap.get(key);
  }

  public async init(): Promise<void> {
    // Do nothing
  }

  public loadFromJSON(json: any): Keystore {
    const data: KeystoreFile = json;

    this.#keyMap = new Map<string, string>(Object.entries(data.keys));

    for (const [key, value] of Object.entries(data)) {
      this.#keyMap.set(key, value);
    }

    return this;
  }

  public toJSON(): {
    [k: string]: string;
  } {
    return Object.fromEntries(this.#keyMap);
  }
}
