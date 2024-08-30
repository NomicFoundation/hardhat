import type { MemoryKeystore } from "./memory-keystore.js";
import type { KeystoreLoader, Keystore } from "../../src/types.js";

export class MockKeystoreLoader implements KeystoreLoader {
  public loadIfExistsCalled = false;
  public loadOrInitCalled = false;

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
    this.loadIfExistsCalled = true;

    if (!this.#hasKeystore) {
      return undefined;
    }

    return this.#keystore;
  }

  public async create(): Promise<Keystore> {
    this.loadOrInitCalled = true;
    return this.#keystore;
  }
}
