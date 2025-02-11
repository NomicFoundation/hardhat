import type { EncryptedKeystore } from "../keystores/encryption.js";
import type { FileManager } from "../types.js";

import {
  exists,
  writeJsonFile,
  readJsonFile,
} from "@ignored/hardhat-vnext-utils/fs";

export class FileManagerImpl implements FileManager {
  public fileExists(absolutePath: string): Promise<boolean> {
    return exists(absolutePath);
  }

  public writeJsonFile(
    absolutePathToFile: string,
    keystoreFile: EncryptedKeystore,
  ): Promise<void> {
    return writeJsonFile(absolutePathToFile, keystoreFile);
  }

  public readJsonFile(absolutePathToFile: string): Promise<EncryptedKeystore> {
    return readJsonFile(absolutePathToFile);
  }
}
