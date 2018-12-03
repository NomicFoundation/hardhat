import * as fs from "fs";

/**
 * This helper adds mocha hooks to run the tests inside one of the projects
 * from test/fixture-projects.
 *
 * @param projectName The base name of the folder with the project to use.
 */
export function useFixtureProject(projectName: string) {
  const projectPath = __dirname + "/../fixture-projects/" + projectName;
  if (!fs.existsSync(projectPath)) {
    throw new Error(`Fixture project ${projectName} doesn't exist`);
  }

  let prevWorkingDir: string;

  beforeEach(() => {
    prevWorkingDir = process.cwd();
    process.chdir(projectPath);
  });

  afterEach(() => {
    process.chdir(prevWorkingDir);
  });
}
