#!/usr/bin/env node
"use strict";

const importLazy = require("import-lazy")(require);
const fs = importLazy("fs-extra");
const path = require("path");
const chalk = importLazy("chalk");
const inquirer = importLazy("inquirer");

const { getConfig } = require("../core/config");
const { getTaskDefinitions } = require("../core/tasks/dsl");
const { createEnvironment } = require("../core/env/definition");
const {
  isCwdInsideProject,
  getRecommendedGitIgnore
} = require("../core/project-structure");
const {
  getMergedParamDefinitions,
  getArgumentsBeforeConfig,
  getArgumentsAfterConfig
} = require("./params");
const { enableEmoji, emoji } = require("./emoji");

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
      `${emoji("👷 ")}Welcome to ${packageInfo.name} v${
        packageInfo.version
      }${emoji("👷 ")}‍\n`
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

  const { projectRoot, shouldAddGitIgnore } = await inquirer.prompt([
    {
      name: "projectRoot",
      default: process.cwd(),
      message: "Buidler project root:"
    },
    {
      name: "shouldAddGitIgnore",
      type: "confirm",
      message: "Do you want to add a .gitignore?"
    }
  ]);

  await fs.ensureDir(projectRoot);
  await fs.copy(
    path.join(__dirname, "..", "..", "sample-project"),
    projectRoot
  );

  if (shouldAddGitIgnore) {
    const gitIgnorePath = path.join(projectRoot, ".gitignore");

    let content = await getRecommendedGitIgnore();

    if (await fs.pathExists(gitIgnorePath)) {
      const existingContent = fs.readFile(gitIgnorePath, "utf-8");
      content = (await existingContent) + "\n" + content;
    }

    await fs.writeFile(gitIgnorePath, content);
  }

  console.log(chalk.cyan(`\n${emoji("✨ ")}Project created${emoji(" ✨")}`));

  console.log(`\nTry running running the following tasks:`);
  console.log(`  buidler compile`);
  console.log(`  buidler test`);
  console.log(`  buidler run scripts/deploy.js`);
  console.log(`  buidler help`);
}

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
    const globalParamsDefinitions = getMergedParamDefinitions();

    let { globalArguments } = getArgumentsBeforeConfig(
      globalParamsDefinitions,
      rawArgs
    );

    if (globalArguments.emoji) {
      enableEmoji();
    }

    if (!isCwdInsideProject() && process.stdout.isTTY) {
      await initProject(globalArguments);
      return;
    }

    const config = getConfig();

    const parsedArguments = getArgumentsAfterConfig(
      globalParamsDefinitions,
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
