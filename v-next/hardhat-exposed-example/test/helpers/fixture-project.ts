import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";

import path from "node:path";

import {
  createHardhatRuntimeEnvironment,
  importUserConfig,
  resolveHardhatConfigPath,
} from "hardhat/hre";

/**
 * Creates a new Hardhat Runtime Environment based on a fixture project.
 *
 * A fixture project is a Hardhat project located in `../fixture-projects` that
 * has its own hardhat.config.ts and package.json (not part of the monorepo).
 *
 * Note: This function doesn't modify the global environment, the global
 * instance of the HRE, nor the CWD.
 *
 * @param fixtureProjectName The name of the fixture project to use.
 *  e.g. `base-project`
 * @returns A new HRE with the fixture project folder as root.
 */
export async function createFixtureProjectHRE(
  fixtureProjectName: string,
): Promise<HardhatRuntimeEnvironment> {
  const fixtureProjectRoot = path.resolve(
    import.meta.dirname,
    `../fixture-projects/${fixtureProjectName}`,
  );

  const configPath = await resolveHardhatConfigPath(
    path.join(fixtureProjectRoot, "hardhat.config.ts"),
  );

  const userConfig = await importUserConfig(configPath);

  return createHardhatRuntimeEnvironment(
    userConfig,
    {
      config: configPath,
    },
    fixtureProjectRoot,
  );
}
