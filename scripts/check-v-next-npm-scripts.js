// @ts-check
const fs = require("fs");
const path = require("path");

const templatePackageJson = require("../v-next/template-package/package.json");

const vNextDir = path.resolve(__dirname, "../v-next");
const dirs = fs.readdirSync(vNextDir, { withFileTypes: true });

let errorsFound = false;

for (const dir of dirs) {
  if (!dir.isDirectory()) {
    continue;
  }

  // The test reporter is a special case, as it doesn't use itself as test
  // reporter
  if (dir.name === "hardhat-node-test-reporter") {
    continue;
  }

  const packageJsonPath = path.resolve(vNextDir, dir.name, "package.json");
  const packageJson = require(packageJsonPath);

  for (const scriptName in templatePackageJson.scripts) {
    if (scriptName === "clean") {
      if (
        !packageJson.scripts[scriptName].startsWith(
          templatePackageJson.scripts[scriptName]
        )
      ) {
        console.error(`Mismatch in script ${scriptName} in ${dir.name}`);
        console.error(
          `  Expected to start with: ${templatePackageJson.scripts[scriptName]}`
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
