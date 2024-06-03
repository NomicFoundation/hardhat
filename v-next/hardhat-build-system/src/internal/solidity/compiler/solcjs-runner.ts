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
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
  We cast to string because it doesn't have types, and otherwise TS complains */
  const { default: solcWrapper } = await import("solc/wrapper" as string);
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

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
