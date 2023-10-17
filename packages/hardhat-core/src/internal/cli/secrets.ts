import chalk from "chalk";
import { HardhatError } from "../core/errors";
import { ERRORS } from "../core/errors-list";
import { HardhatContext } from "../context";
import { SecretsManagerSetup } from "../core/secrets/secret-manager-setup";
import { ArgumentsParser } from "./ArgumentsParser";

export async function handleSecrets(
  allUnparsedCLAs: string[]
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
      return setup();
    default:
      return 1; // Error code
  }
}

export function listSecretsToSetup() {
  const secretsManager = HardhatContext.getHardhatContext()
    .secretManager as SecretsManagerSetup;

  const requiredKeys = secretsManager.getRequiredSecretsKeys();
  const optionalKeys = secretsManager.getOptionalSecretsKeys();

  if (requiredKeys.length === 0 && optionalKeys.length === 0) {
    console.log(chalk.green("There are no secrets to setup"));
    return;
  }

  console.log(
    `Secrets can be set using the command '${chalk.italic(
      "npx hardhat secrets set <key>"
    )}' or the command '${chalk.italic(
      "npx hardhat secrets set <key> <value>"
    )}'\n`
  );

  if (requiredKeys.length > 0) {
    console.log(
      chalk.red(
        `The following required secrets are needed:\n${requiredKeys.join("\n")}`
      )
    );
    console.log("\n");
  }

  if (optionalKeys.length > 0) {
    console.log(
      chalk.yellow(
        `The following optional secrets can be provided:\n${optionalKeys.join(
          "\n"
        )}`
      )
    );
  }
}

async function set(key: string, value?: string): Promise<number> {
  HardhatContext.getHardhatContext().secretManager.set(
    key,
    value ?? (await getSecretValue())
  );

  console.warn(
    `Secret stored at the following path: ${HardhatContext.getHardhatContext().secretManager.getStoragePath()}`
  );

  return 0;
}

function get(key: string): number {
  const secret = HardhatContext.getHardhatContext().secretManager.get(key);

  if (secret !== undefined) {
    console.warn(
      `The secret is stored at the following path: ${HardhatContext.getHardhatContext().secretManager.getStoragePath()}`
    );
    console.log(secret);
    return 0;
  }

  console.warn(chalk.yellow(`There is no secret associated to the key ${key}`));
  return 1;
}

function list(): number {
  const keys = HardhatContext.getHardhatContext().secretManager.list();

  if (keys.length > 0) {
    console.warn(
      `The secrets are stored at the following path: ${HardhatContext.getHardhatContext().secretManager.getStoragePath()}`
    );

    keys.forEach((k) => console.log(k));
  } else {
    console.warn(chalk.yellow(`There are no secrets in the secret manager`));
  }

  return 0;
}

function del(key: string): number {
  if (HardhatContext.getHardhatContext().secretManager.delete(key)) {
    console.warn(
      `The secret was deleted at the following path: ${HardhatContext.getHardhatContext().secretManager.getStoragePath()}`
    );
    return 0;
  }

  console.warn(chalk.yellow(`There is no secret associated to the key ${key}`));
  return 1;
}

function path() {
  console.log(
    HardhatContext.getHardhatContext().secretManager.getStoragePath()
  );
  return 0;
}

function setup() {
  HardhatContext.getHardhatContext().switchToSetupSecretManager();
  return 2;
}

async function getSecretValue(): Promise<string> {
  const { default: enquirer } = await import("enquirer");

  const response: { secret: string } = await enquirer.prompt({
    type: "password",
    name: "secret",
    message: "Enter secret:",
  });

  if (response.secret.length === 0) {
    throw new HardhatError(ERRORS.ARGUMENTS.INVALID_ARGUMENT_VALUE, {
      value: "",
      argument: "secret",
      reason: `The secret should be a valid string`,
    });
  }

  return response.secret;
}

async function getTaskDefinitionAndTaskArguments(allUnparsedCLAs: string[]) {
  await import("../../builtin-tasks/secrets");

  const ctx = HardhatContext.getHardhatContext();
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
