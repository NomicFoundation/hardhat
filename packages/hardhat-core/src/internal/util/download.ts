import fs from "fs";
import fsExtra from "fs-extra";
import path from "path";
import util from "util";

export async function download(
  url: string,
  filePath: string,
  timeoutMillis = 10000
) {
  const { pipeline } = await import("stream");
  const { default: fetch } = await import("node-fetch");
  const streamPipeline = util.promisify(pipeline);

  const response = await fetch(url, { timeout: timeoutMillis });

  if (response.ok && response.body !== null) {
    await fsExtra.ensureDir(path.dirname(filePath));
    return streamPipeline(response.body, fs.createWriteStream(filePath));
  }

  // Consume the response stream and discard its result
  // See: https://github.com/node-fetch/node-fetch/issues/83
  const _discarded = await response.arrayBuffer();

  // tslint:disable-next-line only-hardhat-error
  throw new Error(
    `Failed to download ${url} - ${response.statusText} received`
  );
}
