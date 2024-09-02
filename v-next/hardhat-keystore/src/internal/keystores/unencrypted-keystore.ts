import type { UserInteractions } from "../../internal/ui/user-interactions.js";
import type { Keystore, UnencryptedKeystoreFile } from "../types.js";

import { assertHardhatInvariant } from "@ignored/hardhat-vnext-errors";

import { createUnencryptedKeystoreFile } from "./unencrypted-keystore-file.js";

export class UnencryptedKeystore implements Keystore {
  readonly #interruptions: UserInteractions;
  #keystoreData: UnencryptedKeystoreFile | null;

  constructor(interruptions: UserInteractions) {
    this.#interruptions = interruptions;
    this.#keystoreData = null;
  }

  public async listKeys(): Promise<string[]> {
    this.#assertKeystoreInitialized(this.#keystoreData);

    return Object.keys(this.#keystoreData.keys);
  }

  public async hasKey(key: string): Promise<boolean> {
    this.#assertKeystoreInitialized(this.#keystoreData);

    return Object.keys(this.#keystoreData.keys).includes(key);
  }

  public async readValue(key: string): Promise<string | undefined> {
    this.#assertKeystoreInitialized(this.#keystoreData);

    return this.#keystoreData.keys[key];
  }

  public async removeKey(key: string): Promise<void> {
    this.#assertKeystoreInitialized(this.#keystoreData);

    delete this.#keystoreData.keys[key];
  }

  public async addNewValue(key: string, value: string): Promise<void> {
    this.#assertKeystoreInitialized(this.#keystoreData);

    this.#keystoreData.keys[key] = value;
  }

  public async init(): Promise<void> {
    await this.#interruptions.setUpPassword();

    const keystoreFile: UnencryptedKeystoreFile =
      createUnencryptedKeystoreFile();

    this.#keystoreData = keystoreFile;
  }

  public loadFromJSON(json: any): Keystore {
    // TODO: add ZOD validation
    const keystore: UnencryptedKeystoreFile = json;

    this.#keystoreData = keystore;

    return this;
  }

  public toJSON(): UnencryptedKeystoreFile {
    this.#assertKeystoreInitialized(this.#keystoreData);

    return this.#keystoreData;
  }

  #assertKeystoreInitialized(
    keystoreFile: UnencryptedKeystoreFile | null,
  ): asserts keystoreFile is UnencryptedKeystoreFile {
    assertHardhatInvariant(keystoreFile !== null, "Keystore not initialized");
  }
}
