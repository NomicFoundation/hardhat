import fsExtra from "fs-extra";
import { NomicLabsHardhatPluginError } from "hardhat/internal/core/errors";
import { HardhatRuntimeEnvironment, ProjectPathsConfig } from "hardhat/types";
import path from "path";

export const TRUFFLE_FIXTURE_NAME = "truffle-fixture";

export async function hasTruffleFixture(paths: ProjectPathsConfig) {
  try {
    require.resolve(path.join(paths.tests, TRUFFLE_FIXTURE_NAME));
    return true;
  } catch {
    return false;
  }
}

export async function hasMigrations(paths: ProjectPathsConfig) {
  const migrationsDir = path.join(paths.root, "migrations");

  if (!(await fsExtra.pathExists(migrationsDir))) {
    return false;
  }

  const files = await fsExtra.readdir(migrationsDir);
  const jsFiles = files.filter((f) => f.toLowerCase().endsWith(".js"));

  return jsFiles.length > 1;
}

export async function getTruffleFixtureFunction(
  paths: ProjectPathsConfig
): Promise<(env: HardhatRuntimeEnvironment) => Promise<void>> {
  const fixturePath = require.resolve(
    path.join(paths.tests, TRUFFLE_FIXTURE_NAME)
  );

  let fixture = require(fixturePath);
  if (fixture.default !== undefined) {
    fixture = fixture.default;
  }

  if (!(fixture instanceof Function)) {
    throw new NomicLabsHardhatPluginError(
      "@nomiclabs/hardhat-truffle5",
      `Truffle fixture file ${fixturePath} must return a function`
    );
  }

  return fixture;
}
