import fs from "node:fs";
import path from "node:path";

const templatePackageJson = JSON.parse(
  fs.readFileSync(
    path.join(import.meta.dirname, "../packages/template-package/package.json"),
    "utf-8",
  ),
);

const packagesDir = path.resolve(import.meta.dirname, "../packages");
const dirs = fs.readdirSync(packagesDir, { withFileTypes: true });

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

  // Same with the example project, we don't use the same scripts
  if (dir.name === "example-project") {
    continue;
  }

  // ignition-core splits its tests into test:unit and test:integrations,
  // only lints src, and builds in prepack instead of prepublishOnly.
  if (dir.name === "ignition-core") {
    continue;
  }

  // ignition-ui builds its UI with vite in prepack instead of prepublishOnly,
  // and its clean removes the vite and tsc build outputs.
  if (dir.name === "ignition-ui") {
    continue;
  }

  // hardhat-ignition's pretest builds ignition-ui's bundle, it has no
  // test:only, and it builds in prepack instead of prepublishOnly.
  if (dir.name === "hardhat-ignition") {
    continue;
  }

  // hardhat-ignition-viem compiles its test fixtures in test-build before
  // testing, and builds in prepack instead of prepublishOnly.
  if (dir.name === "hardhat-ignition-viem") {
    continue;
  }

  // hardhat-ignition-ethers builds in prepack instead of prepublishOnly, and
  // its clean also removes the test fixtures' build outputs.
  if (dir.name === "hardhat-ignition-ethers") {
    continue;
  }

  const packageJsonPath = path.resolve(packagesDir, dir.name, "package.json");
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
