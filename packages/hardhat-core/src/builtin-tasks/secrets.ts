import { HardhatError } from "../internal/core/errors";
import { scope } from "../internal/core/config/config-env";
import { ERRORS } from "../internal/core/errors-list";

const secretsScope = scope("secrets", "Manage your secrets");

secretsScope
  .task("set", "Set a secret")
  .addPositionalParam("key", "The key of the secret")
  .setAction(async () => {
    throw new HardhatError(ERRORS.TASK_DEFINITIONS.SECRETS_ONLY_MANAGED_IN_CLI);
  });

secretsScope
  .task("get ", "Get a secret")
  .addPositionalParam("key", "The key of the secret")
  .setAction(async () => {
    throw new HardhatError(ERRORS.TASK_DEFINITIONS.SECRETS_ONLY_MANAGED_IN_CLI);
  });

secretsScope.task("list", "List all the secrets' keys").setAction(async () => {
  throw new HardhatError(ERRORS.TASK_DEFINITIONS.SECRETS_ONLY_MANAGED_IN_CLI);
});

secretsScope
  .task("delete", "Delete a secret")
  .addPositionalParam("key", "The key of the secret")
  .setAction(async () => {
    throw new HardhatError(ERRORS.TASK_DEFINITIONS.SECRETS_ONLY_MANAGED_IN_CLI);
  });
