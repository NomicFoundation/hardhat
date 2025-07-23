import type { Paths } from "./type.js";

import path from "node:path";

import { readJsonFile, writeJsonFile } from "@nomicfoundation/hardhat-utils/fs";
import { getConfigDir } from "@nomicfoundation/hardhat-utils/global-dir";

const LEDGER_FOLDER_NAME = "ledger";
const CACHE_FILE_NAME = "accounts.json";

export async function read(paths?: string): Promise<Paths | undefined> {
  const ledgerCacheFile = paths ?? (await getLedgerCacheFile());
  try {
    return await readJsonFile(ledgerCacheFile);
  } catch (_error) {}
}

export async function write(json: Paths, paths?: string): Promise<void> {
  const ledgerCacheFile = paths ?? (await getLedgerCacheFile());
  await writeJsonFile(ledgerCacheFile, json);
}

async function getLedgerCacheFile(): Promise<string> {
  const configDirPath = await getConfigDir();
  return path.join(configDirPath, LEDGER_FOLDER_NAME, CACHE_FILE_NAME);
}
