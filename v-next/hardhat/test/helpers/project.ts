import fsPromises from "node:fs/promises";
import path from "node:path";
import { before, after } from "node:test";

import { exists } from "@nomicfoundation/hardhat-utils/fs";

/**
 * This helper adds mocha hooks to run the tests inside one of the projects
 * from test/fixture-projects.
 *
 * @param projectName The base name of the folder with the project to use.
 * @param changeDirTo If provided, the working directory will be changed to this. Must be a child of the project folder.
 */
export function useFixtureProject(projectName: string, changeDirTo?: string) {
  let projectPath: string;
  let prevWorkingDir: string;

  before(async () => {
    projectPath = await getFixtureProjectPath(projectName, changeDirTo);
    prevWorkingDir = process.cwd();
    process.chdir(projectPath);
  });

  after(() => {
    process.chdir(prevWorkingDir);
  });
}

async function getFixtureProjectPath(
  projectName: string,
  changeDirTo?: string,
): Promise<string> {
  const normalizedProjectName = projectName.replaceAll("/", path.sep);

  let projectPath = path.join(
    import.meta.dirname,
    "..",
    "fixture-projects",
    normalizedProjectName,
  );

  if (changeDirTo !== undefined) {
    projectPath = path.join(projectPath, changeDirTo);
  }

  if (!(await exists(projectPath))) {
    console.log("projectPath", projectPath);
    throw new Error(`Fixture project ${projectName} doesn't exist`);
  }

  return getRealPath(projectPath);
}

/**
 * Returns the real path of absolutePath, resolving symlinks.
 *
 * @throws Error if absolutePath doesn't exist.
 */
async function getRealPath(absolutePath: string): Promise<string> {
  try {
    // This method returns the actual casing.
    // Please read Node.js' docs to learn more.
    return await fsPromises.realpath(path.normalize(absolutePath));
  } catch {
    throw new Error(`Invalid directory ${absolutePath}`);
  }
}
