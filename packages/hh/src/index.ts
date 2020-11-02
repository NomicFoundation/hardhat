#!/usr/bin/env node
import { spawnSync } from "child_process";

export async function main() {
  let pathToHardhat;
  try {
    pathToHardhat = require.resolve("hardhat/internal/cli/cli.js", {
      paths: [process.cwd()],
    });
  } catch (e) {
    if (e.code === "MODULE_NOT_FOUND") {
      console.error(
        "You are not inside a Hardhat project, or Hardhat is not locally installed"
      );
    } else {
      console.error(`[hh] Unexpected error: ${e.message}`);
    }
    process.exit(1);
  }

  spawnSync("node", [pathToHardhat, ...process.argv.slice(2)], {
    stdio: "inherit",
  });
}

main()
  .then(() => process.exit(process.exitCode))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
