import chalk from "chalk";
import debug from "debug";
import { HardhatError } from "../core/errors";
import { ERRORS } from "../core/errors-list";
import { HardhatContext } from "../context";
import { VarsManagerSetup } from "../core/vars/vars-manager-setup";
import {
  importCsjOrEsModule,
  resolveConfigPath,
} from "../core/config/config-loading";
import { ArgumentsParser } from "./ArgumentsParser";
import { emoji } from "./emoji";

const log = debug("hardhat:cli:vars");

export async function handleVars(
  allUnparsedCLAs: string[],
  configPath: string | undefined
): Promise<number> {
  const { taskDefinition, taskArguments } =
    await getTaskDefinitionAndTaskArguments(allUnparsedCLAs);

  switch (taskDefinition.name) {
    case "set":
      return set(taskArguments.var, taskArguments.value);
    case "get":
      return get(taskArguments.var);
    case "list":
      return list();
    case "delete":
      return del(taskArguments.var);
    case "path":
      return path();
    case "setup":
      return setup(configPath);
    default:
      return 1; // Error code
  }
}

async function set(key: string, value?: string): Promise<number> {
  const varsManager = HardhatContext.getHardhatContext().varsManager;

  varsManager.validateKey(key);

  varsManager.set(key, value ?? (await getVarValue()));

  if (process.stdout.isTTY) {
    console.warn(
      `The configuration variable has been stored in ${varsManager.getStoragePath()}`
    );
  }

  return 0;
}

function get(key: string): number {
  const value = HardhatContext.getHardhatContext().varsManager.get(key);

  if (value !== undefined) {
    console.log(value);
    return 0;
  }

  console.warn(
    chalk.yellow(
      `The configuration variable '${key}' is not set in ${HardhatContext.getHardhatContext().varsManager.getStoragePath()}`
    )
  );
  return 1;
}

function list(): number {
  const keys = HardhatContext.getHardhatContext().varsManager.list();
  const varsStoragePath =
    HardhatContext.getHardhatContext().varsManager.getStoragePath();

  if (keys.length > 0) {
    keys.forEach((k) => console.log(k));

    if (process.stdout.isTTY) {
      console.warn(
        `\nAll configuration variables are stored in ${varsStoragePath}`
      );
    }
  } else {
    if (process.stdout.isTTY) {
      console.warn(
        chalk.yellow(
          `There are no configuration variables stored in ${varsStoragePath}`
        )
      );
    }
  }

  return 0;
}

function del(key: string): number {
  const varsStoragePath =
    HardhatContext.getHardhatContext().varsManager.getStoragePath();

  if (HardhatContext.getHardhatContext().varsManager.delete(key)) {
    if (process.stdout.isTTY) {
      console.warn(
        `The configuration variable was deleted from ${varsStoragePath}`
      );
    }
    return 0;
  }

  console.warn(
    chalk.yellow(
      `There is no configuration variable '${key}' to delete from ${varsStoragePath}`
    )
  );

  return 1;
}

function path() {
  console.log(HardhatContext.getHardhatContext().varsManager.getStoragePath());
  return 0;
}

function setup(configPath: string | undefined) {
  log("Switching to SetupVarsManager to collect vars");
  HardhatContext.getHardhatContext().switchToSetupVarsManager();

  try {
    log("Loading config and tasks to trigger vars collection");
    loadConfigFile(configPath);
  } catch (err: any) {
    console.error(
      chalk.red(
        "There is an error in your Hardhat configuration file. Please double check it.\n"
      )
    );

    // eslint-disable-next-line @nomicfoundation/hardhat-internal-rules/only-hardhat-error
    throw err;
  }

  listVarsToSetup();

  return 0;
}

function loadConfigFile(configPath: string | undefined) {
  const configEnv = require(`../core/config/config-env`);

  const globalAsAny: any = global;
  Object.entries(configEnv).forEach(
    ([key, value]) => (globalAsAny[key] = value)
  );

  const resolvedConfigPath = resolveConfigPath(configPath);
  importCsjOrEsModule(resolvedConfigPath);
}

async function getVarValue(): Promise<string> {
  const { default: enquirer } = await import("enquirer");

  const response: { value: string } = await enquirer.prompt({
    type: "password",
    name: "value",
    message: "Enter value:",
  });

  if (response.value.replace(/[\s\t]/g, "").length === 0) {
    throw new HardhatError(ERRORS.VARS.INVALID_EMPTY_VALUE);
  }

  return response.value;
}

function listVarsToSetup() {
  const HH_SET_COMMAND = "npx hardhat vars set";
  const varsManagerSetup = HardhatContext.getHardhatContext()
    .varsManager as VarsManagerSetup;

  const requiredKeysToSet = varsManagerSetup.getRequiredVarsToSet();
  const optionalKeysToSet = varsManagerSetup.getOptionalVarsToSet();

  if (requiredKeysToSet.length === 0 && optionalKeysToSet.length === 0) {
    console.log(
      chalk.green(
        "There are no configuration variables that need to be set for this project"
      )
    );
    console.log();
    printAlreadySetKeys();
    return;
  }

  if (requiredKeysToSet.length > 0) {
    console.log(
      chalk.bold(
        `${emoji("❗ ")}The following configuration variables need to be set:\n`
      )
    );
    console.log(
      requiredKeysToSet.map((k) => `  ${HH_SET_COMMAND} ${k}`).join("\n")
    );
    console.log();
  }

  if (optionalKeysToSet.length > 0) {
    console.log(
      chalk.bold(
        `${emoji("💡 ")}The following configuration variables are optional:\n`
      )
    );
    console.log(
      optionalKeysToSet.map((k) => `  ${HH_SET_COMMAND} ${k}`).join("\n")
    );
    console.log();
  }

  printAlreadySetKeys();
}

function printAlreadySetKeys() {
  const varsManagerSetup = HardhatContext.getHardhatContext()
    .varsManager as VarsManagerSetup;

  const requiredKeysAlreadySet = varsManagerSetup.getRequiredVarsAlreadySet();
  const optionalKeysAlreadySet = varsManagerSetup.getOptionalVarsAlreadySet();
  const envVars = varsManagerSetup.getEnvVars();

  if (
    requiredKeysAlreadySet.length === 0 &&
    optionalKeysAlreadySet.length === 0 &&
    envVars.length === 0
  ) {
    return;
  }

  console.log(
    `${chalk.bold(`${emoji("✔️  ")}Configuration variables already set:`)}`
  );
  console.log();

  if (requiredKeysAlreadySet.length > 0) {
    console.log("  Mandatory:");
    console.log(requiredKeysAlreadySet.map((x) => `    ${x}`).join("\n"));
    console.log();
  }

  if (optionalKeysAlreadySet.length > 0) {
    console.log("  Optional:");
    console.log(optionalKeysAlreadySet.map((x) => `    ${x}`).join("\n"));
    console.log();
  }

  if (envVars.length > 0) {
    console.log("  Set via environment variables:");
    console.log(envVars.map((x) => `    ${x}`).join("\n"));
    console.log();
  }
}

async function getTaskDefinitionAndTaskArguments(allUnparsedCLAs: string[]) {
  const ctx = HardhatContext.getHardhatContext();
  ctx.setConfigLoadingAsStarted();
  require("../../builtin-tasks/vars");
  ctx.setConfigLoadingAsFinished();

  const argumentsParser = new ArgumentsParser();

  const taskDefinitions = ctx.tasksDSL.getTaskDefinitions();
  const scopesDefinitions = ctx.tasksDSL.getScopesDefinitions();

  const { scopeName, taskName, unparsedCLAs } =
    argumentsParser.parseScopeAndTaskNames(
      allUnparsedCLAs,
      taskDefinitions,
      scopesDefinitions
    );

  const taskDefinition = ctx.tasksDSL.getTaskDefinition(scopeName, taskName);

  if (taskDefinition === undefined) {
    throw new HardhatError(ERRORS.ARGUMENTS.UNRECOGNIZED_SCOPED_TASK, {
      scope: scopeName!,
      task: taskName,
    });
  }

  const taskArguments = argumentsParser.parseTaskArguments(
    taskDefinition,
    unparsedCLAs
  );

  return { taskDefinition, taskArguments };
}
