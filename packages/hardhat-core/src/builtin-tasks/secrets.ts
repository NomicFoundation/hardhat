import { task, types } from "../internal/core/config/config-env";
import {
  clearSecrets,
  readSecrets,
  writeSecrets,
} from "../internal/util/global-dir";
import {
  TASK_SECRETS,
  TASK_SECRETS_ADD,
  TASK_SECRETS_CLEAR,
  TASK_SECRETS_DELETE,
  TASK_SECRETS_LIST,
  TASK_SECRETS_SHOW,
} from "./task-names";

function areSecretsStored(secretsObj: Record<string, string>): boolean {
  if (Object.keys(secretsObj).length > 0) return true;

  console.log("There are no secrets stored in the secret manager.");
  return false;
}

function doesSecretExist(secretsObj: any, key: string) {
  if (secretsObj[key] !== undefined) return true;

  console.log(`There is no secret associated to the key ${key}`);
  return false;
}

task(TASK_SECRETS_ADD)
  .addPositionalParam(
    "key",
    "The key associated to the secret",
    undefined,
    types.string
  )
  .addPositionalParam("secret", "The secret to store", undefined, types.string)
  .setAction(async ({ key, secret }: { key: string; secret: string }) => {
    if (key === undefined || secret === undefined) {
      console.log("You must provide a key and a secret");
      return;
    }

    const secretsObj = readSecrets();
    secretsObj[key] = secret;

    // TODO: add --force if secrets exists

    writeSecrets(secretsObj);

    console.log(`The secret has been stored with the key ${key}`);
  });

task(TASK_SECRETS_SHOW)
  .addPositionalParam(
    "key",
    "The key for the secret to show",
    undefined,
    types.string
  )
  .setAction(async ({ key }: { key: string }) => {
    const secretsObj = readSecrets();
    if (!areSecretsStored(secretsObj)) return;
    if (!doesSecretExist(secretsObj, key)) return;

    console.log(`KEY: SECRET\n${key}: ${secretsObj[key]}`);
  });

task(TASK_SECRETS_LIST).setAction(async () => {
  const secretsObj = readSecrets();
  if (!areSecretsStored(secretsObj)) return;

  console.log(`The secrets' keys are:`);
  Object.keys(secretsObj).forEach((key) => {
    console.log(key);
  });
});

task(TASK_SECRETS_DELETE)
  .addPositionalParam(
    "key",
    "The key of the secret to delete",
    undefined,
    types.string
  )
  .setAction(async ({ key }: { key: string }) => {
    const secretsObj = readSecrets();
    if (!areSecretsStored(secretsObj)) return;
    if (!doesSecretExist(secretsObj, key)) return;

    delete secretsObj[key];
    writeSecrets(secretsObj);

    console.log(`The secret associated to the key ${key} has been deleted`);
  });

task(TASK_SECRETS_CLEAR).setAction(async () => {
  clearSecrets();
  console.log("All secrets have been deleted");
});

task(TASK_SECRETS, "List the possible secrets manager's operations").setAction(
  async () => {
    console.log(`
Available secrets manager's operations:
npx hardhat secrets:add <key> <value>
npx hardhat secrets:show <key>
npx hardhat secrets:list
npx hardhat secrets:delete <key>
npx hardhat secrets:clear
      `);
  }
);
