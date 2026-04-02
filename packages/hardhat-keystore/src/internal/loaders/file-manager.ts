import type { EncryptedKeystore } from "../keystores/encryption.js";
import type { FileManager } from "../types.js";

import {
  exists,
  writeJsonFile,
  readJsonFile,
  move,
} from "@nomicfoundation/hardhat-utils/fs";

export class FileManagerImpl implements FileManager {
  public fileExists(absolutePath: string): Promise<boolean> {
    return exists(absolutePath);
  }

  public async writeJsonFile(
    absolutePathToFile: string,
    keystoreFile: EncryptedKeystore,
  ): Promise<void> {
    // First write to a temporary file, then move it to minimize the risk of file corruption
    const tmpPath = `${absolutePathToFile}.tmp`;
    await writeJsonFile(tmpPath, keystoreFile);
    return move(tmpPath, absolutePathToFile);
  }

  public readJsonFile(absolutePathToFile: string): Promise<EncryptedKeystore> {
    return readJsonFile(absolutePathToFile);
  }
}
