#!/usr/bin/env node
import "source-map-support/register";
import { getPackageJson } from "../util/packageInfo";

const { getConfig } = require("../core/config");
const { getTaskDefinitions } = require("../core/tasks/dsl");
const { createEnvironment } = require("../core/env/definition");
const { isCwdInsideProject } = require("../core/project-structure");
const { enableEmoji } = require("./emoji");
const { createProject } = require("./project-creation");
const { BuidlerError, ERRORS } = require("../core/errors");
const {
  BUIDLER_CLI_PARAM_DEFINITIONS
} = require("../core/params/buidler-params");
const { ArgumentsParser } = require("./ArgumentsParser");
const { getEnvBuidlerArguments } = require("../core/params/env-variables");

async function printVersionMessage() {
  console.log("B1");
  const packageJson = await getPackageJson();
  console.log("B2");
  console.log(packageJson.version);
}

async function main() {
  // We first accept this argument anywhere, so we know if the user wants
  // stack traces before really parsing the arguments.
  let showStackTraces = process.argv.includes("--show-stack-traces");

  try {
    const envVariableArguments = getEnvBuidlerArguments(
      BUIDLER_CLI_PARAM_DEFINITIONS
    );

    const argumentsParser = new ArgumentsParser();

    const {
      buidlerArguments,
      taskName: parsedTaskName,
      unparsedCLAs
    } = argumentsParser.parseBuidlerArgumetns(
      BUIDLER_CLI_PARAM_DEFINITIONS,
      envVariableArguments,
      process.argv.slice(2)
    );

    if (buidlerArguments.emoji) {
      enableEmoji();
    }

    showStackTraces = buidlerArguments.showStackTraces;

    if (!isCwdInsideProject() && process.stdout.isTTY) {
      await createProject();
      return;
    }

    // --version is a special case
    if (buidlerArguments.version) {
      await printVersionMessage();
      return;
    }

    const config = getConfig();

    const taskName = parsedTaskName !== undefined ? parsedTaskName : "help";
    const taskDefinition = getTaskDefinitions()[taskName];

    if (taskDefinition === undefined) {
      throw new BuidlerError(
        ERRORS.ARGUMENT_PARSER_UNRECOGNIZED_TASK,
        taskName
      );
    }

    const taskArguments = argumentsParser.parseTaskArguments(
      taskDefinition,
      unparsedCLAs
    );

    const env = createEnvironment(config, buidlerArguments);

    // --help is a also special case
    if (buidlerArguments.help && taskName !== "help") {
      await env.run("help", { task: taskName });
      return;
    }

    await env.run(taskName, taskArguments);
  } catch (error) {
    const isBuidlerError = error instanceof BuidlerError;

    const { default: chalk } = await import("chalk");

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

main().catch(error => {
  console.error(error);
  process.exit(1);
});
