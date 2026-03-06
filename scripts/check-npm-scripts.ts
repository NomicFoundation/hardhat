import fs from "node:fs";
import path from "node:path";

const templatePackageJson = JSON.parse(
  fs.readFileSync(
    path.join(import.meta.dirname, "../v-next/template-package/package.json"),
    "utf-8",
  ),
);

const vNextDir = path.resolve(import.meta.dirname, "../v-next");
const dirs = fs.readdirSync(vNextDir, { withFileTypes: true });

let errorsFound = false;

for (const dir of dirs) {
  if (!dir.isDirectory()) {
    continue;
  }

  // This config package don't have same scripts.
  if (dir.name === "config") {
    continue;
  }

  // The test reporter is a special case, as it doesn't use itself as test
  // reporter
  if (dir.name === "hardhat-node-test-reporter") {
    continue;
  }

  // Same with the example projects, we don't use the same scripts
  if (dir.name === "example-project" || dir.name === "example-project-solx") {
    continue;
  }

  // TODO: This is a temporary solution until we convert Ignitions tests
  // to Node Test Runner.
  if (dir.name === "ignition-core") {
    continue;
  }

  // TODO: This is a temporary solution until we convert Ignitions tests
  // to Node Test Runner.
  if (dir.name === "ignition-ui") {
    continue;
  }

  // TODO: This is a temporary solution until we convert Ignitions tests
  // to Node Test Runner.
  if (dir.name === "hardhat-ignition") {
    continue;
  }

  // TODO: This is a temporary solution until we convert Ignitions tests
  // to Node Test Runner.
  if (dir.name === "hardhat-ignition-viem") {
    continue;
  }

  // TODO: This is a temporary solution until we convert Ignitions tests
  // to Node Test Runner.
  if (dir.name === "hardhat-ignition-ethers") {
    continue;
  }

  const packageJsonPath = path.resolve(vNextDir, dir.name, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

  for (const scriptName in templatePackageJson.scripts) {
    if (scriptName === "clean") {
      if (
        !packageJson.scripts[scriptName].startsWith(
          templatePackageJson.scripts[scriptName],
        )
      ) {
        console.error(`Mismatch in script ${scriptName} in ${dir.name}`);
        console.error(
          `  Expected to start with: ${templatePackageJson.scripts[scriptName]}`,
        );
        console.error(`  Actual: ${packageJson.scripts[scriptName]}`);
        console.error();

        errorsFound = true;
      }

      continue;
    }

    if (
      templatePackageJson.scripts[scriptName] !==
      packageJson.scripts[scriptName]
    ) {
      console.error(`Mismatch in script ${scriptName} in ${dir.name}`);
      console.error(`  Expected: ${templatePackageJson.scripts[scriptName]}`);
      console.error(`  Actual:   ${packageJson.scripts[scriptName] ?? ""}`);
      console.error();

      errorsFound = true;
    }
  }
}

if (errorsFound) {
  process.exitCode = 1;
}
