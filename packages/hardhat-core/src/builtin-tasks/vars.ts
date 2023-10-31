import { HardhatError } from "../internal/core/errors";
import { scope } from "../internal/core/config/config-env";
import { ERRORS } from "../internal/core/errors-list";

const varsScope = scope("vars", "Manage your key-value pairs");

varsScope
  .task("set", "Set a new key-value pair")
  .addPositionalParam("key", "The key associated with the value")
  .addOptionalPositionalParam("value", "The value to store")
  .setAction(async () => {
    throw new HardhatError(ERRORS.VARS.ONLY_MANAGED_IN_CLI);
  });

varsScope
  .task("get", "Get the value associated with a key")
  .addPositionalParam("key", "The key associated to the value to retrieve")
  .setAction(async () => {
    throw new HardhatError(ERRORS.VARS.ONLY_MANAGED_IN_CLI);
  });

varsScope
  .task("list", "List the keys for all the key-value pairs")
  .setAction(async () => {
    throw new HardhatError(ERRORS.VARS.ONLY_MANAGED_IN_CLI);
  });

varsScope
  .task("delete", "Delete a key-value pair")
  .addPositionalParam(
    "key",
    "The key associated to the value you want to delete"
  )
  .setAction(async () => {
    throw new HardhatError(ERRORS.VARS.ONLY_MANAGED_IN_CLI);
  });

varsScope
  .task("path", "Show the file path where all the key-value pairs are stored")
  .setAction(async () => {
    throw new HardhatError(ERRORS.VARS.ONLY_MANAGED_IN_CLI);
  });

varsScope
  .task("setup", "Display a list of key-value pairs that need to be set up")
  .setAction(async () => {
    throw new HardhatError(ERRORS.VARS.ONLY_MANAGED_IN_CLI);
  });
