import findup from "find-up";
import { HardhatConfig } from "hardhat/types/config";
import { readFileSync } from "node:fs";

const defaultMochaOptions = {
  // timeout: 10000,
};

// pnpm run build && pnpm unpublish hardhat --force --registry=http://localhost:4873/ && pnpm publish --registry http://localhost:4873 --no-git-checks --force
// pnpm run build && pnpm unpublish @nomicfoundation/mocha-test-plugin --force --registry=http://localhost:4873/ && pnpm publish --registry http://localhost:4873 --no-git-checks --force

let testsAlreadyRun = false;

export async function runTests(
  parallel: boolean,
  bail: boolean,
  testFiles: string[] = [],
  grep?: string,
  hhConfig?: HardhatConfig
): Promise<number> {
  // TODO: remove
  console.debug("[DEBUG]: using mocha test module");

  const { default: Mocha } = await import("mocha");
  type MochaOptions = Mocha.MochaOptions;

  const mochaConfig: MochaOptions =
    hhConfig?.test?.customTestConfig !== undefined
      ? { ...hhConfig.test.customTestConfig }
      : defaultMochaOptions;

  if (grep !== undefined) {
    mochaConfig.grep = grep;
  }

  if (bail) {
    mochaConfig.bail = true;
  }

  if (parallel) {
    mochaConfig.parallel = true;
  }

  if (mochaConfig.parallel === true) {
    const mochaRequire = mochaConfig.require ?? [];
    if (!mochaRequire.includes("hardhat/register")) {
      mochaRequire.push("hardhat/register");
    }
    mochaConfig.require = mochaRequire;
  }

  const mocha = new Mocha(mochaConfig);
  testFiles.forEach((file) => mocha.addFile(file));

  // if the project is of type "module" or if there's some ESM test file,
  // we call loadFilesAsync to enable Mocha's ESM support
  const projectPackageJson = await getProjectPackageJson();
  const isTypeModule = projectPackageJson.type === "module";
  const hasEsmTest = testFiles.some((file) => file.endsWith(".mjs"));
  if (isTypeModule || hasEsmTest) {
    // Because of the way the ESM cache works, loadFilesAsync doesn't work
    // correctly if used twice within the same process, so we throw an error
    // in that case
    if (testsAlreadyRun) {
      // TODO: remove
      // eslint-disable-next-line @nomicfoundation/hardhat-internal-rules/only-hardhat-error
      throw new Error(
        "Your project uses ESM and you've programmatically run your tests twice. This is not supported yet."
      );
    }
    testsAlreadyRun = true;

    // This instructs Mocha to use the more verbose file loading infrastructure
    // which supports both ESM and CJS
    await mocha.loadFilesAsync();
  }

  const testFailures = await new Promise<number>((resolve) => {
    mocha.run(resolve);
  });

  mocha.dispose();

  return testFailures;
}

function getProjectPackageJson(): Promise<any> {
  const packageJsonPath = findup.sync("package.json");

  if (packageJsonPath === null) {
    throw new Error(
      "Expected a package.json file in the current directory or in an ancestor directory"
    );
  }

  return JSON.parse(readFileSync(packageJsonPath, "utf-8"));
}
