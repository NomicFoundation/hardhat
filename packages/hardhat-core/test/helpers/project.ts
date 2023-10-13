import * as fsExtra from "fs-extra";
import path from "path";
import { getRealPath } from "../../src/internal/util/fs-utils";

/**
 * This helper adds mocha hooks to run the tests inside one of the projects
 * from test/fixture-projects.
 *
 * @param projectName The base name of the folder with the project to use.
 */
export function useFixtureProject(projectName: string) {
  let projectPath: string;
  let prevWorkingDir: string;

  before(async () => {
    projectPath = await getFixtureProjectPath(projectName);
  });

  before(() => {
    prevWorkingDir = process.cwd();
    process.chdir(projectPath);
  });

  after(() => {
    process.chdir(prevWorkingDir);
  });
}

export async function getFixtureProjectPath(
  projectName: string
): Promise<string> {
  const normalizedProjectName = projectName.replaceAll("/", path.sep);

  const projectPath = path.join(
    __dirname,
    "..",
    "fixture-projects",
    normalizedProjectName
  );
  if (!(await fsExtra.pathExists(projectPath))) {
    throw new Error(`Fixture project ${projectName} doesn't exist`);
  }

  return getRealPath(projectPath);
}
