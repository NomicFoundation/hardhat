import type { Keystore, KeystoreFile } from "../../src/types.js";

export class MemoryKeystore implements Keystore {
  #keyMap: Map<string, string>;

  constructor() {
    this.#keyMap = new Map();
  }

  public async listKeys(): Promise<string[]> {
    return [...this.#keyMap.keys()];
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

  public async loadFromJson(json: string): Promise<void> {
    const data: KeystoreFile = JSON.parse(json);

    this.#keyMap = new Map<string, string>(Object.entries(data.keys));

    for (const [key, value] of Object.entries(data)) {
      this.#keyMap.set(key, value);
    }
  }

  public async saveToJson(): Promise<string> {
    return JSON.stringify(Object.fromEntries(this.#keyMap)) + "\n";
  }
}
