#!/usr/bin/env node
"use strict";

const fs = require("fs-extra");
const path = require("path");
const chalk = require("chalk");
const inquirer = require("inquirer");

const { getConfig } = require("../core/config");
const { isCwdInsideProject } = require("../core/project-structure");
const { getTaskDefinitions } = require("../core/tasks/dsl");
const { parseArguments } = require("../core/arguments");
const { createEnvironment } = require("../core/env/definition");

const DEFAULT_TASK_NAME = "help";

function supportsEmoji(builderArguments) {
  return (
    process.stdout.isTTY &&
    (process.platform === "darwin" || process.argv.includes("--emoji"))
  );
}

async function initProject() {
  const packageInfo = await fs.readJson(
    path.join(__dirname, "../../package.json")
  );

  console.log(chalk.blue(`888               d8b      888 888`));
  console.log(chalk.blue(`888               Y8P      888 888`));
  console.log(chalk.blue("888                        888 888"));
  console.log(
    chalk.blue("88888b.  888  888 888  .d88888 888  .d88b.  888d888")
  );
  console.log(chalk.blue('888 "88b 888  888 888 d88" 888 888 d8P  Y8b 888P"'));
  console.log(chalk.blue("888  888 888  888 888 888  888 888 88888888 888"));
  console.log(chalk.blue("888 d88P Y88b 888 888 Y88b 888 888 Y8b.     888"));
  console.log(chalk.blue(`88888P"   "Y88888 888  "Y88888 888  "Y8888  888`));
  console.log("");

  console.log(
    chalk.cyan(`  Welcome to ${packageInfo.name} v${packageInfo.version}  \n`)
  );

  const { shouldCreateProject } = await inquirer.prompt([
    {
      name: "shouldCreateProject",
      type: "confirm",
      message:
        "You are not inside a buidler project. Do you want to create a new one?"
    }
  ]);

  if (!shouldCreateProject) {
    return;
  }

  const { projectRoot } = await inquirer.prompt([
    {
      name: "projectRoot",
      default: process.cwd(),
      message: "Buidler project root:"
    }
  ]);

  await fs.outputFile(
    path.join(projectRoot, "buidler-config.js"),
    `
module.exports = {
};
  `
  );

  console.log(chalk.cyan(`\n✨ Project created ✨`));
}

async function main() {
  // We first accept this argument anywhere, so we know if the user wants
  // stack traces before really parsing the arguments.
  let showStackTraces = process.argv.includes("--showStackTraces");

  try {
    if (!isCwdInsideProject() && process.stdout.isTTY) {
      await initProject();
      return;
    }

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
      console.error("For more info run buidler again with --showStackTraces.");
    }
  }
}

main();
