import fs from "fs";
import fsExtra from "fs-extra";
import path from "path";
import util from "util";

const TEMP_FILE_PREFIX = "tmp-";

function resolveTempFileName(filePath: string): string {
  const { dir, ext, name } = path.parse(filePath);

  return path.format({
    dir,
    ext,
    name: `${TEMP_FILE_PREFIX}${name}`,
  });
}

export async function download(
  url: string,
  filePath: string,
  timeoutMillis = 10000
) {
  const { pipeline } = await import("stream");
  const { getGlobalDispatcher, ProxyAgent, request } = await import("undici");
  const streamPipeline = util.promisify(pipeline);

  const dispatcher = (() => {
    if (process.env.HTTPS_PROXY !== undefined) {
      return new ProxyAgent(process.env.HTTPS_PROXY);
    }

    if (process.env.HTTP_PROXY !== undefined) {
      return new ProxyAgent(process.env.HTTP_PROXY);
    }

    return getGlobalDispatcher();
  })();

  // Fetch the url
  const response = await request(url, {
    dispatcher,
    headersTimeout: timeoutMillis,
    method: "GET",
  });

  if (
    response.statusCode >= 200 &&
    response.statusCode <= 299 &&
    response.body !== null
  ) {
    const tmpFilePath = resolveTempFileName(filePath);
    await fsExtra.ensureDir(path.dirname(filePath));

    await streamPipeline(response.body, fs.createWriteStream(tmpFilePath));
    return fsExtra.move(tmpFilePath, filePath, { overwrite: true });
  }

  // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
  throw new Error(
    `Failed to download ${url} - ${
      response.statusCode
    } received. ${await response.body.text()}`
  );
}
