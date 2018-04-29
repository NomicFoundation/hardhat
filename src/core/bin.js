#!/usr/bin/env node
const { getConfig } = require("./config");
const { getTaskDefinitions } = require("./tasks");
const { parseArguments } = require("./arguments");
const { createEnvironment } = require("./environment");

const DEFAULT_TASK_NAME = "help";

async function main() {
  let showStackTraces = true;

  try {
    const config = getConfig();
    const parsedArguments = parseArguments(
      getTaskDefinitions(),
      DEFAULT_TASK_NAME,
      process.argv.slice(2)
    );

    showStackTraces = parsedArguments.globalArguments.showStackTraces;

    const env = createEnvironment(config, parsedArguments.globalArguments);
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
