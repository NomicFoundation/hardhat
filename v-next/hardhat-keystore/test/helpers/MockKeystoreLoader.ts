import type { MemoryKeystore } from "./MemoryKeystore.js";
import type { KeystoreLoader, Keystore } from "../../src/types.js";

export class MockKeystoreLoader implements KeystoreLoader {
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

  public async hasKeystore(): Promise<boolean> {
    return this.#hasKeystore;
  }

  public async loadOrInit(): Promise<Keystore> {
    this.loadOrInitCalled = true;
    return this.#keystore;
  }
}
