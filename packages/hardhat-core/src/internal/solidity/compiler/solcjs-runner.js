// @ts-check
const fs = require("node:fs");

function readStdInSync() {
  process.stdin.resume();

  const response = fs.readFileSync(process.stdin.fd, { encoding: "utf-8" });

  process.stdin.pause();

  return response;
}

function getSolcJs(solcJsPath) {
  const solcWrapper = require("solc/wrapper");
  return solcWrapper(require(solcJsPath));
}

const solcjsPath = process.argv[2];
const solc = getSolcJs(solcjsPath);
const output = solc.compile(readStdInSync());

console.log(output);
