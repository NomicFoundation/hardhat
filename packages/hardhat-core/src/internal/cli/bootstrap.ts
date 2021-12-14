import { fork } from "child_process";

import { getEnvHardhatArguments } from "../core/params/env-variables";
import { HARDHAT_PARAM_DEFINITIONS } from "../core/params/hardhat-params";

import { ArgumentsParser } from "./ArgumentsParser";

const nodeArgs = [...process.execArgv];

if (process.env.DISABLE_HARDHAT_NETWORK_OPTIMIZATIONS === undefined) {
  nodeArgs.push("--max-semi-space-size=100");
}

const envVariableArguments = getEnvHardhatArguments(
  HARDHAT_PARAM_DEFINITIONS,
  process.env
);

const argumentsParser = new ArgumentsParser();

const { hardhatArguments } = argumentsParser.parseHardhatArguments(
  HARDHAT_PARAM_DEFINITIONS,
  envVariableArguments,
  process.argv.slice(2)
);

if (hardhatArguments.maxMemory !== undefined) {
  nodeArgs.push(`--max-old-space-size=${hardhatArguments.maxMemory}`);
}

const childProcess = fork(`${__dirname}/cli`, process.argv.slice(2), {
  stdio: "inherit" as any, // There's an error in the TS definition of ForkOptions
  execArgv: nodeArgs,
});

childProcess.once("close", (status) => {
  process.exit(status as number);
});
