"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const env_variables_1 = require("../core/params/env-variables");
const hardhat_params_1 = require("../core/params/hardhat-params");
const ArgumentsParser_1 = require("./ArgumentsParser");
const nodeArgs = [...process.execArgv];
if (process.env.DISABLE_HARDHAT_NETWORK_OPTIMIZATIONS === undefined) {
    nodeArgs.push("--max-semi-space-size=100");
}
const envVariableArguments = (0, env_variables_1.getEnvHardhatArguments)(hardhat_params_1.HARDHAT_PARAM_DEFINITIONS, process.env);
const argumentsParser = new ArgumentsParser_1.ArgumentsParser();
const { hardhatArguments } = argumentsParser.parseHardhatArguments(hardhat_params_1.HARDHAT_PARAM_DEFINITIONS, envVariableArguments, process.argv.slice(2));
if (hardhatArguments.maxMemory !== undefined) {
    nodeArgs.push(`--max-old-space-size=${hardhatArguments.maxMemory}`);
}
const childProcess = (0, child_process_1.fork)(`${__dirname}/cli`, process.argv.slice(2), {
    stdio: "inherit",
    execArgv: nodeArgs,
});
childProcess.once("close", (status) => {
    process.exit(status);
});
//# sourceMappingURL=bootstrap.js.map