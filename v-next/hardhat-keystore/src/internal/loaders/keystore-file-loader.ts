import type { FileManager, Keystore, KeystoreLoader } from "../types.js";

export class KeystoreFileLoader implements KeystoreLoader {
  readonly #keystoreFilePath: string;
  readonly #fileManager: FileManager;
  readonly #keystoreFactory: () => Keystore;

  constructor(
    keystoreFilePath: string,
    fileManger: FileManager,
    keystoreFactory: () => Keystore,
  ) {
    this.#keystoreFilePath = keystoreFilePath;
    this.#fileManager = fileManger;
    this.#keystoreFactory = keystoreFactory;
  }

  public async exists(): Promise<boolean> {
    return this.#fileManager.fileExists(this.#keystoreFilePath);
  }

  public async load(): Promise<Keystore> {
    const keystoreFile = await this.#fileManager.readJsonFile(
      this.#keystoreFilePath,
    );

    const keystore = this.#keystoreFactory().loadFromJSON(keystoreFile);

    return keystore;
  }

  public async create(): Promise<Keystore> {
    const keystore = this.#keystoreFactory();

    await keystore.init();

    await this.#fileManager.writeJsonFile(
      this.#keystoreFilePath,
      keystore.toJSON(),
    );

    return keystore;
  }

  public async save(keystore: Keystore): Promise<void> {
    const keystoreFile = keystore.toJSON();

    await this.#fileManager.writeJsonFile(this.#keystoreFilePath, keystoreFile);
  }
}
