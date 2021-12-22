import fs from "fs";
import fsExtra from "fs-extra";
import HttpsProxyAgent from "https-proxy-agent";
import path from "path";
import util from "util";

interface FetchOptions {
  timeout: number;
  agent?: undefined | HttpsProxyAgent.HttpsProxyAgent;
}

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
  const { default: fetch } = await import("node-fetch");
  const streamPipeline = util.promisify(pipeline);
  const fetchOptions: FetchOptions = {
    timeout: timeoutMillis,
    agent: undefined,
  };

  // Check if Proxy is set https
  if (process.env.HTTPS_PROXY !== undefined) {
    // Create the proxy from the environment variables
    const proxy: string = process.env.HTTPS_PROXY;
    fetchOptions.agent = new HttpsProxyAgent.HttpsProxyAgent(proxy);
  }

  // Check if Proxy is set http and `fetchOptions.agent` was not already set for https
  if (
    process.env.HTTP_PROXY !== undefined &&
    fetchOptions.agent === undefined
  ) {
    // Create the proxy from the environment variables
    const proxy: string = process.env.HTTP_PROXY;
    fetchOptions.agent = new HttpsProxyAgent.HttpsProxyAgent(proxy);
  }

  // Fetch the url
  const response = await fetch(url, fetchOptions);

  if (response.ok && response.body !== null) {
    const tmpFilePath = resolveTempFileName(filePath);
    await fsExtra.ensureDir(path.dirname(filePath));

    await streamPipeline(response.body, fs.createWriteStream(tmpFilePath));
    return fsExtra.move(tmpFilePath, filePath, { overwrite: true });
  }

  // Consume the response stream and discard its result
  // See: https://github.com/node-fetch/node-fetch/issues/83
  const _discarded = await response.arrayBuffer();

  // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
  throw new Error(
    `Failed to download ${url} - ${response.statusText} received`
  );
}
