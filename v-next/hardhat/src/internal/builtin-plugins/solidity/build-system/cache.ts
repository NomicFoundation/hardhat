import path from "node:path";

import { assertHardhatInvariant } from "@ignored/hardhat-vnext-errors";
import {
  exists,
  readJsonFile,
  writeJsonFile,
} from "@ignored/hardhat-vnext-utils/fs";
import AdmZip from "adm-zip";

export class Cache {
  readonly #basePath: string;
  readonly #namespace: string;
  readonly #version: string;

  constructor(basePath: string, namespace: string, version: string) {
    this.#basePath = basePath;
    this.#namespace = namespace;
    this.#version = version;
  }

  #getPath(key: string): string {
    return path.join(this.#basePath, this.#namespace, this.#version, key);
  }

  public async has(key: string): Promise<boolean> {
    return exists(this.#getPath(key));
  }

  public async setJson<T>(key: string, value: T): Promise<void> {
    const filePath = this.#getPath(key);
    await writeJsonFile(filePath, value);
  }

  public async getJson<T>(key: string): Promise<T | undefined> {
    const filePath = this.#getPath(key);
    return (await this.has(key)) ? readJsonFile<T>(filePath) : undefined;
  }

  public async setFiles(
    key: string,
    rootPath: string,
    filePaths: string[],
  ): Promise<void> {
    const zipFilePath = this.#getPath(key);
    const zip = new AdmZip();
    for (const filePath of filePaths) {
      zip.addLocalFile(
        filePath,
        path.dirname(path.relative(rootPath, filePath)),
      );
    }
    const zipFileCreated = await zip.writeZipPromise(zipFilePath, {
      overwrite: true,
    });
    assertHardhatInvariant(
      zipFileCreated,
      `Failed to create zip file ${zipFilePath}`,
    );
  }

  public async getFiles(
    key: string,
    rootPath: string,
  ): Promise<string[] | undefined> {
    if (await this.has(key)) {
      const zipFilePath = this.#getPath(key);
      const zip = new AdmZip(zipFilePath);
      zip.extractAllTo(rootPath, true);
      const filePaths = zip
        .getEntries()
        .map((entry) => path.join(rootPath, entry.entryName));
      return filePaths;
    }
    return undefined;
  }
}
