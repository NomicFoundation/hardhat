import chalk from "chalk";
import { HardhatError } from "../core/errors";
import { ERRORS } from "../core/errors-list";
import { SecretsManager } from "../core/secrets/secrets-manager";
import { getSecretsFilePath } from "../util/global-dir";

export async function handleSecrets(args: string[]) {
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
    case "set": {
      return secretsManager.set(key, await getSecretValue());
    }
    case "get": {
      const secret = secretsManager.get(key);

      if (secret !== undefined) {
        console.log(secret);
      } else {
        console.log(
          chalk.yellow(`There is no secret associated to the key ${key}`)
        );
      }

      return;
    }
    case "list": {
      const keys = secretsManager.list();

      if (keys.length > 0) {
        keys.forEach((k) => console.log(k));
      } else {
        console.log(chalk.yellow(`There are no secrets in the secret manager`));
      }

      return;
    }
    case "delete": {
      const deleted = secretsManager.delete(key);

      if (!deleted) {
        console.log(
          chalk.yellow(`There is no secret associated to the key ${key}`)
        );
      }

      return;
    }
    default:
      throw new HardhatError(ERRORS.SECRETS.INVALID_ACTION, {
        value: action,
      });
  }
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
