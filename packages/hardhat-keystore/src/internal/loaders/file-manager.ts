import type { EncryptedKeystore } from "../keystores/encryption.js";
import type { FileManager } from "../types.js";

import {
  exists,
  writeJsonFile,
  readJsonFile,
  move,
} from "@nomicfoundation/hardhat-utils/fs";

export class FileManagerImpl implements FileManager {
  public async fileExists(absolutePath: string): Promise<boolean> {
    return await exists(absolutePath);
  }

  public async writeJsonFile(
    absolutePathToFile: string,
    keystoreFile: EncryptedKeystore,
  ): Promise<void> {
    // First write to a temporary file, then move it to minimize the risk of file corruption
    const tmpPath = `${absolutePathToFile}.tmp`;
    await writeJsonFile(tmpPath, keystoreFile);
    return await move(tmpPath, absolutePathToFile);
  }

  public async readJsonFile(
    absolutePathToFile: string,
  ): Promise<EncryptedKeystore> {
    return await readJsonFile(absolutePathToFile);
  }
}
