import type { Keystore } from "../../src/types.js";

export class MemoryKeystore implements Keystore {
  readonly #keyMap: Map<string, string>;

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
}
