import { fork } from "child_process";

import { BUIDLER_PARAM_DEFINITIONS } from "../core/params/buidler-params";
import { getEnvBuidlerArguments } from "../core/params/env-variables";

import { ArgumentsParser } from "./ArgumentsParser";

const nodeArgs = [...process.execArgv];

if (process.env.DISABLE_BUIDLEREVM_OPTIMIZATIONS === undefined) {
  nodeArgs.push("--max-semi-space-size=100");
}

const envVariableArguments = getEnvBuidlerArguments(
  BUIDLER_PARAM_DEFINITIONS,
  process.env
);

const argumentsParser = new ArgumentsParser();

const { buidlerArguments } = argumentsParser.parseBuidlerArguments(
  BUIDLER_PARAM_DEFINITIONS,
  envVariableArguments,
  process.argv.slice(2)
);

if (buidlerArguments.maxMemory !== undefined) {
  nodeArgs.push(`--max-old-space-size=${buidlerArguments.maxMemory}`);
}

const childProcess = fork(`${__dirname}/cli`, process.argv.slice(2), {
  stdio: "inherit" as any, // There's an error in the TS definition of ForkOptions
  execArgv: nodeArgs,
});

childProcess.once("close", (status) => {
  process.exit(status);
});
