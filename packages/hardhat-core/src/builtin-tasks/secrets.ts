import { HardhatError } from "../internal/core/errors";
import { scope } from "../internal/core/config/config-env";
import { ERRORS } from "../internal/core/errors-list";

const secretsScope = scope("secrets", "Manage your secrets");

secretsScope
  .task("set", "Set a secret")
  .addPositionalParam("key", "The key of the secret")
  .addOptionalPositionalParam("value", "The value of the secret")
  .setAction(async () => {
    throw new HardhatError(ERRORS.SECRETS.SECRETS_ONLY_MANAGED_IN_CLI);
  });

secretsScope
  .task("get", "Get a secret")
  .addPositionalParam("key", "The key of the secret")
  .setAction(async () => {
    throw new HardhatError(ERRORS.SECRETS.SECRETS_ONLY_MANAGED_IN_CLI);
  });

secretsScope.task("list", "List all the secrets' keys").setAction(async () => {
  throw new HardhatError(ERRORS.SECRETS.SECRETS_ONLY_MANAGED_IN_CLI);
});

secretsScope
  .task("delete", "Delete a secret")
  .addPositionalParam("key", "The key of the secret")
  .setAction(async () => {
    throw new HardhatError(ERRORS.SECRETS.SECRETS_ONLY_MANAGED_IN_CLI);
  });

secretsScope
  .task("path", "Show the path of the secrets file")
  .setAction(async () => {
    throw new HardhatError(ERRORS.SECRETS.SECRETS_ONLY_MANAGED_IN_CLI);
  });

// TODO: proper naming
secretsScope
  .task("setup", "Show a list of all the secrets that are not set")
  .setAction(async () => {
    // throw new HardhatError(ERRORS.SECRETS.SECRETS_ONLY_MANAGED_IN_CLI);
  });
