#!/usr/bin/env node
"use strict";

const fs = require("fs-extra");
const path = require("path");
const chalk = require("chalk");
const inquirer = require("inquirer");
const types = require("../core/types");
const { BUIDLER_PARAM_DEFINITIONS } = require("../core/buidler-params");
const { ArgumentsParser } = require("./ArgumentsParser");

const { getConfig } = require("../core/config");
const {
  isCwdInsideProject,
  isInsideGitRepository
} = require("../core/project-structure");
const { getTaskDefinitions } = require("../core/tasks/dsl");
const { createEnvironment } = require("../core/env/definition");

const DEFAULT_TASK_NAME = "help";

const CLI_PARAM_DEFINITIONS = {
  showStackTraces: {
    name: "showStackTraces",
    defaultValue: false,
    description: "Show buidler's errors' stack traces.",
    type: types.boolean,
    isFlag: true
  },
  version: {
    name: "version",
    defaultValue: false,
    description: "Show's buidler's version.",
    type: types.boolean,
    isFlag: true
  },
  help: {
    name: "help",
    defaultValue: false,
    description: "Show's buidler's help.",
    type: types.boolean,
    isFlag: true
  }
};

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
    chalk.cyan(
      `👷‍ Welcome to ${packageInfo.name} v${packageInfo.version} 👷‍\n`
    )
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

  await fs.ensureDir(projectRoot);
  await fs.copy(
    path.join(__dirname, "..", "..", "sample-project"),
    projectRoot
  );

  console.log(chalk.cyan(`\n✨ Project created ✨`));

  console.log(`\nTry running running the following tasks:`);
  console.log(`  buidler compile`);
  console.log(`  buidler test`);
  console.log(`  buidler run scripts/deploy.js`);

  if (await isInsideGitRepository(projectRoot)) {
    console.log(`  buidler gitignore`);
  }

  console.log(`  buidler help`);
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

    const paramDefinitions = {
      ...BUIDLER_PARAM_DEFINITIONS,
      ...CLI_PARAM_DEFINITIONS
    };

    const parser = new ArgumentsParser(
      paramDefinitions,
      getTaskDefinitions(),
      DEFAULT_TASK_NAME
    );

    const parsedArguments = parser.parse(process.argv.slice(2));

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
      console.error(
        "For more info run buidler again with --show-stack-traces."
      );
    }
  }
}

main();
