import type { MemoryKeystore } from "./memory-keystore.js";
import type { KeystoreLoader, Keystore } from "../../src/types.js";

export class MockKeystoreLoader implements KeystoreLoader {
  public loadCalled = false;
  public createCalled = false;
  public saveCalled = false;

  readonly #keystore: MemoryKeystore;
  #hasKeystore: boolean;

  constructor(keystore: MemoryKeystore) {
    this.#hasKeystore = true;
    this.#keystore = keystore;
  }

  public setNoExistingKeystore(): void {
    this.#hasKeystore = false;
  }

  public async load(): Promise<Keystore | undefined> {
    this.loadCalled = true;

    if (!this.#hasKeystore) {
      return undefined;
    }

    return this.#keystore;
  }

  public async create(): Promise<Keystore> {
    this.createCalled = true;
    return this.#keystore;
  }

  public async save(_keystore: Keystore): Promise<void> {
    this.saveCalled = true;
    return;
  }
}
