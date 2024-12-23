async function readStream(
  stream: NodeJS.ReadStream,
  encoding: BufferEncoding = "utf8",
) {
  stream.setEncoding(encoding);

  return new Promise((resolve, reject) => {
    let data = "";

    stream.on("data", (chunk) => (data += chunk.toString(encoding)));
    stream.on("end", () => resolve(data));
    stream.on("error", (error) => reject(error));
  });
}

async function getSolcJs(solcJsPath: string) {
  const { default: solcWrapper } = await import("./solcjs-wrapper.js");
  const { default: solc } = await import(solcJsPath);

  return solcWrapper(solc);
}

async function main() {
  const input = await readStream(process.stdin);

  const solcjsPath = process.argv[2];
  const solc = await getSolcJs(solcjsPath);

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- the input read from the stdin should be a string
  const output = solc.compile(input as string);

  console.log(output);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
