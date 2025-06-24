import type { SolcWrapper } from "./solcjs-wrapper.js";

async function readStream(
  stream: NodeJS.ReadStream,
  encoding: BufferEncoding = "utf8",
): Promise<string> {
  stream.setEncoding(encoding);

  return new Promise((resolve, reject) => {
    let data = "";

    stream.on("data", (chunk) => (data += chunk.toString(encoding)));
    stream.on("end", () => resolve(data));
    stream.on("error", (error) => reject(error));
  });
}

async function getSolcJs(solcJsPath: string): Promise<SolcWrapper> {
  const { default: solcWrapper } = await import("./solcjs-wrapper.js");
  const { default: solc } = await import(solcJsPath);

  return solcWrapper(solc);
}

async function main() {
  const input = await readStream(process.stdin);

  const solcjsPath = process.argv[2];
  const solc = await getSolcJs(solcjsPath);

  const output = solc.compile(input);

  console.log(output);
}

// eslint-disable-next-line no-restricted-syntax -- We intentionally use TLA here
await main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
