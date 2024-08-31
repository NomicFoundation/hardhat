import type { MemoryKeystore } from "./memory-keystore.js";
import type { KeystoreLoader, Keystore } from "../../src/types.js";

import { assertHardhatInvariant } from "@ignored/hardhat-vnext-errors";

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

  public async exists(): Promise<boolean> {
    return this.#hasKeystore;
  }

  public async load(): Promise<Keystore> {
    this.loadCalled = true;

    assertHardhatInvariant(
      this.#hasKeystore,
      "Keystore setup in test is off - keystore not set",
    );

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
