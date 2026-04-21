import path from "node:path";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import {
  exists,
  getAllFilesMatching,
  isDirectory,
  readdir,
  readJsonFile,
} from "@nomicfoundation/hardhat-utils/fs";
import {
  findClosestPackageRoot,
  type PackageJson,
} from "@nomicfoundation/hardhat-utils/package";

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
export async function getTemplates(
  templatesDir: "hardhat-2" | "hardhat-3",
): Promise<Template[]> {
  const packageRoot = await findClosestPackageRoot(import.meta.url);
  const pathToTemplates = path.join(packageRoot, "templates", templatesDir);

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

      const matchingFiles = await getAllFilesMatching(
        pathToTemplate,
        (f) => {
          // Ignore the package.json file because it is handled separately
          if (f === pathToPackageJson) {
            return false;
          }

          // .gitignore files are expected to be called gitignore in the templates
          // because npm ignores .gitignore files during npm pack (see https://github.com/npm/npm/issues/3763)
          if (path.basename(f) === ".gitignore") {
            return false;
          }
          return true;
        },
        (dir) => path.basename(dir) !== "node_modules",
      );

      const files = matchingFiles.map((f) => path.relative(pathToTemplate, f));

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
