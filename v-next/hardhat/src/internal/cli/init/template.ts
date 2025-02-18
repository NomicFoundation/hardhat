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

/**
 * This type describes a hardhat project template. It consists of:
 * - name: The name of the template;
 * - packageJson: The parsed package.json file of the template;
 * - path: The absolute path to the template directory;
 * - files: The relative paths to template files within the template directory,
 *   excluding the package.json file.
 */
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
  pathsToTemplates.sort();

  const templates = await Promise.all(
    pathsToTemplates.map(async (dirName) => {
      const name = dirName.replace(/^\d+-/, "");
      const pathToTemplate = path.join(pathToTemplates, dirName);
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
        // .gitignore files are expected to be called gitignore in the templates
        // because npm ignores .gitignore files during npm pack (see https://github.com/npm/npm/issues/3763)
        if (path.basename(f) === ".gitignore") {
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
