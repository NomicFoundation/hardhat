import type { Client as ClientT } from "undici";
import { normalize, resolve as resolvePath } from "node:path";
import { ChildProcess, spawn } from "node:child_process";

import { HttpProvider } from "../../../../src/internal/core/providers/http";

import { sleep } from "./sleep";

interface EdrProviderOptions {
  chainId?: number;
  coinbase?: string;
  networkId?: number;
}

export function spawnEdrProvider(
  pathToBinary: string,
  options?: EdrProviderOptions
): {
  childProcess: ChildProcess;
  isReady: Promise<unknown>; // resolves in 2 seconds, or rejects if process fails or exits before that
  httpProvider: HttpProvider;
} {
  const args = ["node", "-vv"];
  if (options !== undefined) {
    if (options.chainId !== undefined) {
      args.push("--chain-id", `${options.chainId}`);
    }
    if (options.coinbase !== undefined) {
      args.push("--coinbase", options.coinbase);
    }
    if (options.networkId !== undefined) {
      args.push("--network-id", `${options.networkId}`);
    }
  }
  const childProcess = spawn(normalize(pathToBinary), args);

  let stdout = "";
  childProcess.stdout.on("data", (data: any) => {
    stdout += data.toString();
    console.log(`edr subprocess ${childProcess.pid}: ${data}`);
  });

  let stderr = "";
  childProcess.stderr.on("data", (data: any) => {
    stderr += data.toString();
    console.log(`edr subprocess ${childProcess.pid}: ${data}`);
  });

  function outputForError() {
    return `stdout:\n${stdout}\nstderr:\n${stderr}`;
  }

  const exit = new Promise<void>((resolve, reject) => {
    childProcess.on("exit", (code: number, signal: string) => {
      if (signal === "SIGKILL") {
        console.log("kill");
        resolve();
      } else {
        reject(
          new Error(
            `edr process closed unexpectedly. return code: ${code}. signal: ${signal}. ${outputForError()}`
          )
        );
      }
    });
  });

  const error = new Promise((_resolve, reject) => {
    childProcess.on("error", (err: Error) => {
      if (err.message.includes("ENOENT")) {
        reject(
          new Error(`EDR executable not found at ${resolvePath(pathToBinary)}`)
        );
      } else {
        reject(new Error(`EDR subprocess error: ${err}. ${outputForError()}`));
      }
    });
  });

  const { Client } = require("undici") as { Client: typeof ClientT };
  const url = "http://127.0.0.1:8545";
  const httpProvider = new HttpProvider(
    url,
    "edr",
    {},
    20000,
    new Client(url, {
      keepAliveTimeout: 10,
      keepAliveMaxTimeout: 10,
    })
  );
  return {
    childProcess,
    isReady: Promise.race([sleep(2000), exit, error]),
    httpProvider,
  };
}
