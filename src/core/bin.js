#!/usr/bin/env node
"use strict";

const fs = require("fs-extra");
const path = require("path");

const { getConfig } = require("./config");
const { getTaskDefinitions } = require("./tasks");
const { parseArguments } = require("./arguments");
const { createEnvironment } = require("./environment");

const DEFAULT_TASK_NAME = "help";

async function main() {
  // We first accept this argument anywhere, so we know if the user wants
  // stack traces before really parsing the arguments.
  let showStackTraces = process.argv.includes("--showStackTraces");

  try {
    const config = getConfig();

    const parsedArguments = parseArguments(
      getTaskDefinitions(),
      DEFAULT_TASK_NAME,
      process.argv.slice(2)
    );

    showStackTraces = parsedArguments.globalArguments.showStackTraces;

    if (parsedArguments.globalArguments.version) {
      const packageInfo = await fs.readJson(
        path.join(__dirname, "../../package.json")
      );
      console.log(`${packageInfo.name} version ${packageInfo.version}`);
      return;
    }

    const env = createEnvironment(config, parsedArguments.globalArguments);

    if (
      parsedArguments.globalArguments.help &&
      parsedArguments.taskName !== "help"
    ) {
      await env.run("help", { task: parsedArguments.taskName });
      return;
    }

    await env.run(parsedArguments.taskName, parsedArguments.taskArguments);
  } catch (error) {
    console.error("An error occurred: " + error.message + "\n");

    if (showStackTraces) {
      console.error(error.stack);
    } else {
      console.log("For more info run sool again with --showStackTraces true.");
    }
  }
}

main();
