import type { SolidityHooks } from "hardhat/types/hooks";

import * as path from "node:path";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

import {
  hasFoundryConfig,
  getForgeRemappings,
  isForgeInstalled,
} from "../foundry/forge.js";

/**
 * Hook handler that adds Foundry remappings from `forge remappings`.
 */
export default async (): Promise<Partial<SolidityHooks>> => {
  // State stored in closure - checked once per HRE lifetime
  let forgeInstalledChecked = false;
  let forgeIsInstalled = false;

  return {
    async readNpmPackageRemappings(
      context,
      packageName,
      packageVersion,
      packagePath,
      next,
    ) {
      const existingRemappings = await next(
        context,
        packageName,
        packageVersion,
        packagePath,
      );

      if (!(await hasFoundryConfig(packagePath))) {
        return existingRemappings;
      }

      // Check forge installation only once
      if (!forgeInstalledChecked) {
        forgeInstalledChecked = true;
        forgeIsInstalled = await isForgeInstalled();
      }

      if (!forgeIsInstalled) {
        throw new HardhatError(
          HardhatError.ERRORS.HARDHAT_FOUNDRY.GENERAL.FORGE_NOT_INSTALLED,
        );
      }

      const forgeRemappings = await getForgeRemappings(packagePath);

      return [
        ...existingRemappings,
        {
          remappings: forgeRemappings,
          source: path.join(packagePath, "foundry.toml"),
        },
      ];
    },
  };
};
