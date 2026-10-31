import type { HardhatConfig } from "../../types/config.js";
import type { PackageJson } from "@nomicfoundation/hardhat-utils/package";

import path from "node:path";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { isObject } from "@nomicfoundation/hardhat-utils/lang";
import { readClosestPackageJson } from "@nomicfoundation/hardhat-utils/package";

export type TypeScriptMode = HardhatConfig["typescript"];

/**
 * The TypeScript mode of a project whose `package.json` doesn't set one.
 */
const DEFAULT_TYPESCRIPT_MODE: TypeScriptMode = "tsx";

/**
 * The settings that the `"hardhat"` field of a project's `package.json` can
 * have.
 */
const SUPPORTED_HARDHAT_SETTINGS: readonly string[] = ["typescript"];

/**
 * Returns the TypeScript mode set by a project's `package.json`, in its
 * `"hardhat": { "typescript": "node" | "tsx" }` field, or the default one if
 * it doesn't set it.
 *
 * @param packageJson The parsed `package.json` of the project.
 * @param packageJsonPath The path to that `package.json`, used in errors.
 * @returns The TypeScript mode of the project.
 * @throws HardhatError if the `"hardhat"` field is invalid.
 */
export function getTypeScriptMode(
  packageJson: PackageJson,
  packageJsonPath: string,
): TypeScriptMode {
  if (!("hardhat" in packageJson)) {
    return DEFAULT_TYPESCRIPT_MODE;
  }

  const settings = packageJson.hardhat;

  if (!isObject(settings)) {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.GENERAL.INVALID_PACKAGE_JSON_HARDHAT_SETTINGS,
      {
        packageJsonPath,
        reason: `it must be an object, but it's ${JSON.stringify(settings)}`,
      },
    );
  }

  for (const key of Object.keys(settings)) {
    if (!SUPPORTED_HARDHAT_SETTINGS.includes(key)) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.GENERAL.INVALID_PACKAGE_JSON_HARDHAT_SETTINGS,
        {
          packageJsonPath,
          reason: `unknown setting "${key}". The supported settings are: ${SUPPORTED_HARDHAT_SETTINGS.map((s) => `"${s}"`).join(", ")}`,
        },
      );
    }
  }

  if (!("typescript" in settings)) {
    return DEFAULT_TYPESCRIPT_MODE;
  }

  const mode = settings.typescript;

  if (!isTypeScriptMode(mode)) {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.GENERAL.INVALID_PACKAGE_JSON_HARDHAT_SETTINGS,
      {
        packageJsonPath,
        reason: `the "typescript" setting must be "node" or "tsx", but it's ${JSON.stringify(mode)}`,
      },
    );
  }

  return mode;
}

/**
 * Reads the TypeScript mode of a project from its `package.json`.
 *
 * @param projectRoot The root of the project, i.e. the directory with its
 * `package.json`.
 * @returns The TypeScript mode of the project.
 * @throws HardhatError if the `"hardhat"` field is invalid.
 */
export async function readTypeScriptMode(
  projectRoot: string,
): Promise<TypeScriptMode> {
  const packageJson = await readClosestPackageJson(projectRoot);

  return getTypeScriptMode(packageJson, path.join(projectRoot, "package.json"));
}

function isTypeScriptMode(value: unknown): value is TypeScriptMode {
  return value === "node" || value === "tsx";
}
