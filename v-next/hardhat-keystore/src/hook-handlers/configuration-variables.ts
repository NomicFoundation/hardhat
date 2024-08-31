import type { ConfigurationVariable } from "@ignored/hardhat-vnext/types/config";
import type {
  ConfigurationVariableHooks,
  HookContext,
} from "@ignored/hardhat-vnext/types/hooks";

import { UnencryptedKeystore } from "../keystores/unencrypted-keystore.js";
import { KeystoreFileLoader } from "../loaders/keystore-file-loader.js";
import { UserInteractions } from "../ui/user-interactions.js";
import { getKeystoreFilePath } from "../utils/get-keystore-file-path.js";

export default async (): Promise<Partial<ConfigurationVariableHooks>> => {
  const handlers: Partial<ConfigurationVariableHooks> = {
    fetchValue: async (
      context: HookContext,
      variable: ConfigurationVariable,
      next,
    ) => {
      const loader =
        await _setupLoaderWithContextBasedUserInterruptions(context);

      if (!(await loader.exists())) {
        return next(context, variable);
      }

      const keystore = await loader.load();

      if (!(await keystore.hasKey(variable.name))) {
        return next(context, variable);
      }

      const value = await keystore.readValue(variable.name);

      return value ?? next(context, variable);
    },
  };

  return handlers;
};

async function _setupLoaderWithContextBasedUserInterruptions(
  context: HookContext,
) {
  const keystoreFilePath = await getKeystoreFilePath();
  const userInteractions = new UserInteractions(context.interruptions);

  return new KeystoreFileLoader(
    keystoreFilePath,
    () => new UnencryptedKeystore(userInteractions),
  );
}
