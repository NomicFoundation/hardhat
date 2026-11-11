import type { EncryptedKeystore } from "../keystores/encryption.js";
import type { FileManager } from "../types.js";

import fsPromises from "node:fs/promises";
import path from "node:path";

import {
  CustomError,
  ensureError,
  ensureNodeErrnoExceptionError,
} from "@nomicfoundation/hardhat-utils/error";
import {
  chmod,
  exists,
  FileSystemAccessError,
  JsonSerializationError,
  move,
  readJsonFile,
  remove,
} from "@nomicfoundation/hardhat-utils/fs";
import { getConfigDir } from "@nomicfoundation/hardhat-utils/global-dir";

export async function writeRestrictedUtf8File(
  absolutePathToFile: string,
  content: string,
): Promise<void> {
  const resolvedPath = path.resolve(absolutePathToFile);
  const dirPath = path.dirname(resolvedPath);
  const tmpPath = `${resolvedPath}.tmp`;

  try {
    if (!(await exists(dirPath))) {
      await fsPromises.mkdir(dirPath, { recursive: true, mode: 0o700 });
      await chmod(dirPath, 0o700);
    } else if (dirPath === path.resolve(await getConfigDir())) {
      await chmod(dirPath, 0o700);
    }

    await remove(tmpPath);
    await fsPromises.writeFile(tmpPath, content, {
      encoding: "utf8",
      mode: 0o600,
      flag: "wx",
    });
    await chmod(tmpPath, 0o600);
    await move(tmpPath, resolvedPath);
  } catch (error) {
    await remove(tmpPath);
    if (error instanceof CustomError) {
      throw error;
    }
    ensureNodeErrnoExceptionError(error);
    // eslint-disable-next-line no-restricted-syntax -- Match hardhat-utils/fs error behavior
    throw new FileSystemAccessError(error.message, error);
  }
}

export class FileManagerImpl implements FileManager {
  public fileExists(absolutePath: string): Promise<boolean> {
    return exists(absolutePath);
  }

  public async writeJsonFile(
    absolutePathToFile: string,
    keystoreFile: EncryptedKeystore,
  ): Promise<void> {
    let content: string;
    try {
      content = JSON.stringify(keystoreFile, null, 2);
    } catch (error) {
      ensureError(error);
      // eslint-disable-next-line no-restricted-syntax -- Match hardhat-utils/fs error behavior
      throw new JsonSerializationError(absolutePathToFile, error);
    }

    await writeRestrictedUtf8File(absolutePathToFile, content);
  }

  public readJsonFile(absolutePathToFile: string): Promise<EncryptedKeystore> {
    return readJsonFile(absolutePathToFile);
  }
}
