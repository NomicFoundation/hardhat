import type { KeystoreLoader, Keystore } from "../../src/types.js";

import { MemoryKeystore } from "./MemoryKeystore.js";

export class MockKeystoreLoader implements KeystoreLoader {
  public loadOrInitCalled = false;

  readonly #keystore: MemoryKeystore;
  #hasKeystore: boolean;

  constructor() {
    this.#hasKeystore = true;
    this.#keystore = new MemoryKeystore();
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
