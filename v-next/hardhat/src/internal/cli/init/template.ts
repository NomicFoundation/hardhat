import path from "node:path";

import { assertHardhatInvariant } from "@ignored/hardhat-vnext-errors";
import {
  exists,
  getAllFilesMatching,
  isDirectory,
  readdir,
  readJsonFile,
} from "@ignored/hardhat-vnext-utils/fs";
import {
  findClosestPackageRoot,
  type PackageJson,
} from "@ignored/hardhat-vnext-utils/package";

export interface Template {
  name: string;
  packageJson: PackageJson;
  path: string;
  files: string[];
}

/**
 * getTemplates returns the list of available templates. It retrieves them from
 * the "templates" folder in the package root.
 *
 * @returns The list of available templates.
 */
export async function getTemplates(): Promise<Template[]> {
  const packageRoot = await findClosestPackageRoot(import.meta.url);
  const pathToTemplates = path.join(packageRoot, "templates");

  if (!(await exists(pathToTemplates))) {
    return [];
  }

  const pathsToTemplates = await readdir(pathToTemplates);

  const templates = await Promise.all(
    pathsToTemplates.map(async (name) => {
      const pathToTemplate = path.join(pathToTemplates, name);
      const pathToPackageJson = path.join(pathToTemplate, "package.json");

      if (!(await isDirectory(pathToTemplate))) {
        return;
      }

      // Validate that the the template has a package.json file
      assertHardhatInvariant(
        await exists(pathToPackageJson),
        `package.json for template ${name} is missing`,
      );

      const packageJson: PackageJson =
        await readJsonFile<PackageJson>(pathToPackageJson);
      const files = await getAllFilesMatching(pathToTemplate, (f) => {
        // Ignore the package.json file because it is handled separately
        if (f === pathToPackageJson) {
          return false;
        }
        // We should ignore all the files according to the .gitignore rules
        // However, for simplicity, we just ignore the node_modules folder
        // If we needed to implement a more complex ignore logic, we could
        // use recently introduced glob from node:fs/promises
        if (
          path.relative(pathToTemplate, f).split(path.sep)[0] === "node_modules"
        ) {
          return false;
        }
        return true;
      }).then((fs) => fs.map((f) => path.relative(pathToTemplate, f)));

      return {
        name,
        packageJson,
        path: pathToTemplate,
        files,
      };
    }),
  );

  return templates.filter((t) => t !== undefined);
}
