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

const log = debug("hardhat:cli:vars");

export async function handleVars(
  allUnparsedCLAs: string[],
  configPath: string | undefined
): Promise<number> {
  const { taskDefinition, taskArguments } =
    await getTaskDefinitionAndTaskArguments(allUnparsedCLAs);

  switch (taskDefinition.name) {
    case "set":
      return set(taskArguments.key, taskArguments.value);
    case "get":
      return get(taskArguments.key);
    case "list":
      return list();
    case "delete":
      return del(taskArguments.key);
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

  console.warn(
    `Key-value pair stored at the following path: ${HardhatContext.getHardhatContext().varsManager.getStoragePath()}`
  );

  return 0;
}

function get(key: string): number {
  const value = HardhatContext.getHardhatContext().varsManager.get(key);

  if (value !== undefined) {
    console.log(value);
    return 0;
  }

  console.warn(
    chalk.yellow(`There is no value associated to the key '${key}'`)
  );
  return 1;
}

function list(): number {
  const keys = HardhatContext.getHardhatContext().varsManager.list();

  if (keys.length > 0) {
    keys.forEach((k) => console.log(k));

    console.warn(
      `\nAll the key-value pairs are stored at the following path: ${HardhatContext.getHardhatContext().varsManager.getStoragePath()}`
    );
  } else {
    console.warn(chalk.yellow(`There are no key-value pairs stored`));
  }

  return 0;
}

function del(key: string): number {
  if (HardhatContext.getHardhatContext().varsManager.delete(key)) {
    console.warn(
      `The key was deleted at the following path: ${HardhatContext.getHardhatContext().varsManager.getStoragePath()}`
    );
    return 0;
  }

  console.warn(
    chalk.yellow(`There is no value associated to the key '${key}'`)
  );

  return 1;
}

function path() {
  console.log(HardhatContext.getHardhatContext().varsManager.getStoragePath());
  return 0;
}

function setup(configPath: string | undefined) {
  log("Switching to VarsManagerSetup to collect vars");
  HardhatContext.getHardhatContext().switchToSetupVarsManager();

  try {
    log("Loading config and tasks to trigger vars collection");
    loadConfigFile(configPath);
  } catch (err: any) {
    console.error(
      chalk.red(
        "There is an error in your hardhat configuration file. Please double check it.\n"
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
  const varsManagerSetup = HardhatContext.getHardhatContext()
    .varsManager as VarsManagerSetup;

  const requiredKeys = varsManagerSetup.getRequiredVarsKeys();
  const optionalKeys = varsManagerSetup.getOptionalVarsKeys();

  if (requiredKeys.length === 0 && optionalKeys.length === 0) {
    console.log(chalk.green("There are no key-value pairs to setup"));
    return;
  }

  if (requiredKeys.length > 0) {
    console.log(
      chalk.red(
        `The following required vars are needed:\n${requiredKeys
          .map((k) => `npx hardhat vars set ${k}`)
          .join("\n")}`
      )
    );

    if (optionalKeys.length > 0) console.log("\n");
  }

  if (optionalKeys.length > 0) {
    console.log(
      chalk.yellow(
        `The following optional vars can be provided:\n${optionalKeys
          .map((k) => `npx hardhat vars set ${k}`)
          .join("\n")}`
      )
    );
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
