#!/usr/bin/env node
"use strict";

const importLazy = require("import-lazy")(require);
const fs = importLazy("fs-extra");
const path = require("path");

const inquirer = importLazy("inquirer");
const chalk = importLazy("chalk");

const { getConfig } = require("../core/config");
const { getTaskDefinitions } = require("../core/tasks/dsl");
const { createEnvironment } = require("../core/env/definition");
const { isCwdInsideProject } = require("../core/project-structure");
const { enableEmoji } = require("./emoji");
const { createProject } = require("./project-creation");
const {
  getArgumentsBeforeConfig,
  getArgumentsAfterConfig
} = require("./params");
const { BuidlerError } = require("../core/errors");

function printVersionMessage() {
  const packageInfo = fs.readJsonSync(
    path.join(__dirname, "../../package.json")
  );
  console.log(`${packageInfo.name} version ${packageInfo.version}`);
}

async function main() {
  // We first accept this argument anywhere, so we know if the user wants
  // stack traces before really parsing the arguments.
  let showStackTraces = process.argv.includes("--showStackTraces");
  const rawArgs = process.argv.slice(2);

  try {
    let { globalArguments } = getArgumentsBeforeConfig(rawArgs);

    if (globalArguments.emoji) {
      enableEmoji();
    }

    if (!isCwdInsideProject() && process.stdout.isTTY) {
      await createProject();
      return;
    }

    const config = getConfig();

    const parsedArguments = getArgumentsAfterConfig(
      getTaskDefinitions(),
      rawArgs
    );

    showStackTraces = parsedArguments.globalArguments.showStackTraces;

    // --version is a special case
    if (parsedArguments.globalArguments.version) {
      printVersionMessage();
      return;
    }

    const env = createEnvironment(config, parsedArguments.globalArguments);

    // --help is a also special case
    if (
      parsedArguments.globalArguments.help &&
      parsedArguments.taskName !== "help"
    ) {
      await env.run("help", { task: parsedArguments.taskName });
      return;
    }

    await env.run(parsedArguments.taskName, parsedArguments.taskArguments);
  } catch (error) {
    const isBuidlerError = error instanceof BuidlerError;

    if (isBuidlerError) {
      console.error(chalk.red("Error " + error.message));
    } else {
      console.error(
        chalk.red("An unexpected error occurred: " + error.message)
      );
    }

    console.log("");

    if (showStackTraces) {
      console.error(error.stack);
    } else {
      if (!isBuidlerError) {
        console.error(
          "This shouldn't have happened, please report it to help us improve buidler."
        );
      }

      console.error(
        "For more info run buidler again with --show-stack-traces."
      );
    }
  }
}

main();
