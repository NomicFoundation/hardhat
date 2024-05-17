import path from "node:path";

import { ensureDir, move } from "@nomicfoundation/hardhat-utils/fs";
import {
  download as downloadCompiler,
  DispatcherOptions,
  shouldUseProxy,
} from "@nomicfoundation/hardhat-utils/request";

import { getHardhatVersion } from "./package-info.js";

const TEMP_FILE_PREFIX = "tmp-";

function resolveTempFileName(filePath: string): string {
  const { dir, ext, name } = path.parse(filePath);

  return path.format({
    dir,
    ext,
    name: `${TEMP_FILE_PREFIX}${name}`,
  });
}

export async function download(url: string, filePath: string) {
  const dispatcherOptions: DispatcherOptions = {};
  if (process.env.proxy !== undefined && shouldUseProxy(url)) {
    dispatcherOptions.proxy = process.env.proxy;
  }

  await ensureDir(path.dirname(filePath));

  const tmpFilePath = resolveTempFileName(filePath);
  const hardhatVersion = await getHardhatVersion();

  await downloadCompiler(
    url,
    tmpFilePath,
    {
      extraHeaders: {
        "User-Agent": `hardhat ${hardhatVersion}`,
      },
    },
    dispatcherOptions,
  );

  return move(tmpFilePath, filePath);
}
