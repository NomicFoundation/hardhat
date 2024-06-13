#!/usr/bin/env node

import chalk from "chalk";

import { isNodeVersionToWarnOn } from "./is-node-version-to-warn-on";

if (isNodeVersionToWarnOn(process.version)) {
  console.warn(
    chalk.yellow.bold(`WARNING:`),
    `You are currently using Node.js ${process.version}, which is not supported by Hardhat. This can lead to unexpected behavior. See https://hardhat.org/nodejs-versions`
  );
  console.log();
  console.log();
}

require("./cli");
