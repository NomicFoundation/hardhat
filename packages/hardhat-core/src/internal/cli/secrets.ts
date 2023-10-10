import chalk from "chalk";
import { HardhatError } from "../core/errors";
import { ERRORS } from "../core/errors-list";
import { SecretsManager } from "../core/secrets/secrets-manager";
import { getSecretsFilePath } from "../util/global-dir";

export async function handleSecrets(args: string[]): Promise<number> {
  const [, action, key] = args;

  if (args.length > 3) {
    throw new HardhatError(ERRORS.ARGUMENTS.UNRECOGNIZED_POSITIONAL_ARG, {
      argument: args[3],
    });
  }

  if (key === undefined && ["set", "get", "delete"].includes(action)) {
    throw new HardhatError(ERRORS.SECRETS.SECRET_KEY_UNDEFINED);
  }

  const secretsManager = new SecretsManager(getSecretsFilePath());

  switch (action) {
    case "set":
      return set(secretsManager, key);
    case "get":
      return get(secretsManager, key);
    case "list":
      return list(secretsManager);
    case "delete":
      return del(secretsManager, key);
    default:
      throw new HardhatError(ERRORS.SECRETS.INVALID_ACTION, {
        value: action,
      });
  }
}

async function set(
  secretsManager: SecretsManager,
  key: string
): Promise<number> {
  secretsManager.set(key, await getSecretValue());
  return 0;
}

function get(secretsManager: SecretsManager, key: string): number {
  const secret = secretsManager.get(key);

  if (secret !== undefined) {
    console.log(secret);
    return 0;
  }

  console.log(chalk.yellow(`There is no secret associated to the key ${key}`));
  return 1;
}

function list(secretsManager: SecretsManager): number {
  const keys = secretsManager.list();

  if (keys.length > 0) {
    keys.forEach((k) => console.log(k));
  } else {
    console.log(chalk.yellow(`There are no secrets in the secret manager`));
  }

  return 0;
}

function del(secretsManager: SecretsManager, key: string): number {
  const deleted = secretsManager.delete(key);

  if (deleted) return 0;

  console.log(chalk.yellow(`There is no secret associated to the key ${key}`));
  return 1;
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
