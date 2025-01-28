import path from "node:path";

import {
  exists,
  getAccessTime,
  getAllFilesMatching,
  getSize,
  readJsonFile,
  remove,
  writeJsonFile,
} from "@ignored/hardhat-vnext-utils/fs";

export class Cache {
  readonly #path: string;
  readonly #maxAgeMs: number = 0;
  readonly #maxSize: number = 0;

  constructor(basePath: string, namespace: string, version: string) {
    this.#path = path.join(basePath, namespace, version);
  }

  public async has(key: string): Promise<boolean> {
    return exists(path.join(this.#path, key));
  }

  public async setJson<T>(key: string, value: T): Promise<void> {
    const filePath = path.join(this.#path, key);
    await writeJsonFile(filePath, value);
  }

  public async getJson<T>(key: string): Promise<T | undefined> {
    const filePath = path.join(this.#path, key);
    return (await this.has(key)) ? readJsonFile<T>(filePath) : undefined;
  }

  public async clean(): Promise<void> {
    const files = await getAllFilesMatching(this.#path);
    const fileInfos = await Promise.all(
      files.map(async (file) => ({
        file,
        atimeMs: (await getAccessTime(file)).getTime(),
        size: await getSize(file),
      })),
    );

    const sortedFileInfos = fileInfos.sort((a, b) => a.atimeMs - b.atimeMs);

    let size = sortedFileInfos.reduce(
      (acc, fileInfo) => acc + fileInfo.size,
      0,
    );
    const minAtimeMs = new Date(0 - this.#maxAgeMs).getTime();

    const filesToRemove: string[] = [];

    for (const fileInfo of sortedFileInfos) {
      if (fileInfo.atimeMs < minAtimeMs || size > this.#maxSize) {
        filesToRemove.push(fileInfo.file);
        size -= fileInfo.size;
      } else {
        break;
      }
    }

    await Promise.all(filesToRemove.map(async (file) => remove(file)));
  }
}
