import type { PackageJson } from "@nomicfoundation/hardhat-utils/package";

import path from "node:path";

import {
  ensureDir,
  mkdtemp,
  remove,
  writeJsonFile,
  writeUtf8File,
} from "@nomicfoundation/hardhat-utils/fs";

/**
 * A description of a test project that will be used in a test of the resolver
 * logic.
 *
 * @see useTestProjectTemplate to learn how to use it, and its fields to
 * understand what each field means.
 */
export interface TestProjectTemplate {
  /**
   * The name of the project, to be set in its `package.json` file.
   */
  name: string;

  /**
   * The version of the project, to be set in its `package.json` file.
   */
  version: string;

  /**
   * The files to create in the project, as a map from relative path to content.
   */
  files: Record<string, string>;

  /**
   * The npm dependencies to mock in the project, as a map from installation
   * name to test project.
   *
   * Note that the installation name doesn't need to match the name of the
   * dependency.
   */
  dependencies?: Record<string, TestProjectTemplate>;

  /**
   * The exports field to be used in the project's `package.json` file.
   */
  exports?: PackageJson["exports"];
}

/**
 * The result of `useTestProject`, which contains the path to the test project
 * and a function to clean up the test project.
 */
export interface TestProject {
  path: string;
  clean: () => Promise<void>;
  [Symbol.asyncDispose]: () => Promise<void>;
}

/**
 * Creates a test project based on a template, in a temporary directory.
 *
 * The returned TestProject object is an async disposable, which means that it
 * should be used like this:
 *
 * ```
 * it("example test", async () => {
 *   await using project = await useTestProjectTemplate(template);
 * })
 * ```
 *
 * so that the runtime cleans up the project as soon as the object gets out of
 * scope.
 *
 * If also exposes a `clean` function that can be used to manually clean up the
 * temporary directory.
 *
 * @param template The test project template to use.
 * @returns The test proejct.
 */
export async function useTestProjectTemplate(
  template: TestProjectTemplate,
): Promise<TestProject> {
  const projectPath = await mkdtemp(
    "hh3-solidity-resolver-test" + template.name,
  );

  let cleaned = false;
  const project: TestProject = {
    path: projectPath,
    clean: async () => {
      if (cleaned) {
        return;
      }

      await remove(projectPath);
      cleaned = true;
    },
    [Symbol.asyncDispose]: async () => {
      return project.clean();
    },
  };

  try {
    await initializeTestProject(projectPath, template);
    return project;
  } catch (error) {
    await project.clean();

    throw error;
  }
}

/**
 * Initializes a proejct in the provided path.
 *
 * @param projectPath The root directory of the project to initialize, which
 * must already exist and be empty.
 * @param testProject The project.
 */
async function initializeTestProject(
  projectPath: string,
  testProject: TestProjectTemplate,
) {
  await writeJsonFile(path.join(projectPath, "package.json"), {
    name: testProject.name,
    version: testProject.version,
    exports: testProject.exports,
  });

  for (const [filePath, fileContent] of Object.entries(testProject.files)) {
    const absolutePath = path.join(projectPath, filePath);

    await ensureDir(path.dirname(absolutePath));

    await writeUtf8File(absolutePath, fileContent);
  }

  const nodeModulesPath = path.join(projectPath, "node_modules");
  await ensureDir(nodeModulesPath);

  if (testProject.dependencies !== undefined) {
    for (const [installationName, dependencyProject] of Object.entries(
      testProject.dependencies,
    )) {
      const absolutePath = path.join(nodeModulesPath, installationName);
      await ensureDir(absolutePath);

      await initializeTestProject(absolutePath, dependencyProject);
    }
  }
}
