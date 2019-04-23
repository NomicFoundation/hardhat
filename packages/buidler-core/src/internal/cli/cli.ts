#!/usr/bin/env node
// tslint:disable-next-line
// tslint:disable-next-line
import colors from "ansi-colors";
import semver from "semver";
import "source-map-support/register";

import { TASK_HELP } from "../../builtin-tasks/task-names";
import { BUIDLER_NAME } from "../constants";
import { BuidlerContext } from "../context";
import { loadConfigAndTasks } from "../core/config/config-loading";
import { BuidlerError, BuidlerPluginError, ERRORS } from "../core/errors";
import { BUIDLER_PARAM_DEFINITIONS } from "../core/params/buidler-params";
import { getEnvBuidlerArguments } from "../core/params/env-variables";
import { isCwdInsideProject } from "../core/project-structure";
import { Environment } from "../core/runtime-environment";
import { loadTsNodeIfPresent } from "../core/typescript-support";
import { getPackageJson, PackageJson } from "../util/packageInfo";

import { ArgumentsParser } from "./ArgumentsParser";
import { enableEmoji } from "./emoji";
import { createProject } from "./project-creation";

async function printVersionMessage(packageJson: PackageJson) {
  console.log(packageJson.version);
}

function ensureValidNodeVersion(packageJson: PackageJson) {
  const requirement = packageJson.engines.node;
  if (!semver.satisfies(process.version, requirement)) {
    throw new BuidlerError(ERRORS.GENERAL.INVALID_NODE_VERSION, requirement);
  }
}

async function main() {
  // We first accept this argument anywhere, so we know if the user wants
  // stack traces before really parsing the arguments.
  let showStackTraces = process.argv.includes("--show-stack-traces");

  try {
    const packageJson = await getPackageJson();

    ensureValidNodeVersion(packageJson);

    const envVariableArguments = getEnvBuidlerArguments(
      BUIDLER_PARAM_DEFINITIONS,
      process.env
    );

    const argumentsParser = new ArgumentsParser();

    const {
      buidlerArguments,
      taskName: parsedTaskName,
      unparsedCLAs
    } = argumentsParser.parseBuidlerArguments(
      BUIDLER_PARAM_DEFINITIONS,
      envVariableArguments,
      process.argv.slice(2)
    );

    if (buidlerArguments.emoji) {
      enableEmoji();
    }

    showStackTraces = buidlerArguments.showStackTraces;

    if (
      buidlerArguments.config === undefined &&
      !isCwdInsideProject() &&
      process.stdout.isTTY === true
    ) {
      await createProject();
      return;
    }

    // --version is a special case
    if (buidlerArguments.version) {
      await printVersionMessage(packageJson);
      return;
    }

    loadTsNodeIfPresent();

    const ctx = BuidlerContext.createBuidlerContext();
    const config = loadConfigAndTasks(buidlerArguments.config);

    const envExtenders = ctx.extendersManager.getExtenders();
    const taskDefinitions = ctx.tasksDSL.getTaskDefinitions();

    const taskName = parsedTaskName !== undefined ? parsedTaskName : "help";
    const taskDefinition = taskDefinitions[taskName];

    if (taskDefinition === undefined) {
      throw new BuidlerError(ERRORS.ARGUMENTS.UNRECOGNIZED_TASK, taskName);
    }

    const taskArguments = argumentsParser.parseTaskArguments(
      taskDefinition,
      unparsedCLAs
    );

    const env = new Environment(
      config,
      buidlerArguments,
      taskDefinitions,
      envExtenders
    );

    ctx.setBuidlerRuntimeEnvironment(env);

    // --help is a also special case
    if (buidlerArguments.help && taskName !== TASK_HELP) {
      await env.run(TASK_HELP, { task: taskName });
      return;
    }

    await env.run(taskName, taskArguments);
  } catch (error) {
    let isBuidlerError = false;

    if (error instanceof BuidlerError) {
      isBuidlerError = true;
      console.error(colors.red("Error " + error.message));
    } else if (error instanceof BuidlerPluginError) {
      isBuidlerError = true;
      console.error(
        colors.red("Error in plugin " + error.pluginName + ": " + error.message)
      );
    } else if (error instanceof Error) {
      console.error(
        colors.red("An unexpected error occurred: " + error.message)
      );
    } else {
      console.error(colors.red("An unexpected error occurred."));
    }

    console.log("");

    if (showStackTraces) {
      console.error(error.stack);
    } else {
      if (!isBuidlerError) {
        console.error(
          `This shouldn't have happened, please report it to help us improve ${BUIDLER_NAME}.`
        );
      }

      console.error(
        `For more info run ${BUIDLER_NAME} with --show-stack-traces.`
      );
    }

    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
