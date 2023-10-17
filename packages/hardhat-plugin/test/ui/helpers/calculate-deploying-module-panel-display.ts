import { assert } from "chai";
import chalk from "chalk";

import { calculateDeployingModulePanel } from "../../../src/ui/helpers/calculate-deploying-module-panel";
import { UiState, UiStateDeploymentStatus } from "../../../src/ui/types";

import { testFormat } from "./test-format";

describe("ui - calculate starting message display", () => {
  const exampleState: UiState = {
    status: UiStateDeploymentStatus.UNSTARTED,
    chainId: 31337,
    moduleName: "ExampleModule",
    deploymentDir: "/users/example",
    batches: [],
    currentBatch: 0,
    result: null,
    warnings: [],
  };

  it("should display the deploying module message", () => {
    const expectedText = testFormat(`
    Hardhat Ignition 🚀

    ${chalk.bold(`Deploying [ ExampleModule ]`)}
    `);

    const actualText = calculateDeployingModulePanel(exampleState);

    assert.equal(actualText, expectedText);
  });

  it("should display reconciliation warnings", () => {
    const expectedText = testFormat(`
    Hardhat Ignition 🚀

    ${chalk.bold(`Deploying [ ExampleModule ]`)}

    ${chalk.yellow(
      "Warning - previously executed futures are not in the module:"
    )}
    ${chalk.yellow(" - MyModule#Contract1")}
    ${chalk.yellow(" - MyModule#Contract1.call1")}
    ${chalk.yellow(" - MyModule#Contract2")}
    `);

    const actualText = calculateDeployingModulePanel({
      ...exampleState,
      warnings: [
        "MyModule#Contract1",
        "MyModule#Contract1.call1",
        "MyModule#Contract2",
      ],
    });

    assert.equal(actualText, expectedText);
  });
});
