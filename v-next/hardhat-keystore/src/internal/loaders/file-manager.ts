import type { FileManager, UnencryptedKeystoreFile } from "../types.js";

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
    keystoreFile: UnencryptedKeystoreFile,
  ): Promise<void> {
    return writeJsonFile(absolutePathToFile, keystoreFile);
  }

  public readJsonFile(
    absolutePathToFile: string,
  ): Promise<UnencryptedKeystoreFile> {
    return readJsonFile(absolutePathToFile);
  }
}
