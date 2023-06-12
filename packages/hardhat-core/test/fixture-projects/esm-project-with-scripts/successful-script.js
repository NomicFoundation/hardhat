import * as process from "process";

if (global.config === undefined || global.config.solidity === undefined) {
  process.exit(123123);
}
