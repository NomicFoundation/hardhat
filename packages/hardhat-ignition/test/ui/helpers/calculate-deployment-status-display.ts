import { StatusResult } from "@nomicfoundation/ignition-core";
import { assert } from "chai";
import chalk from "chalk";

import { calculateDeploymentStatusDisplay } from "../../../src/ui/helpers/calculate-deployment-status-display";

import { testFormat } from "./test-format";

describe("ui - calculate deployment status display", () => {
  const exampleAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
  const differentAddress = "0x0011223344556677889900112233445566778899";

  const exampleStatusResult = {
    chainId: 1,
    started: [],
    timedOut: [],
    held: [],
    failed: [],
    successful: [],
    contracts: {},
  };

  describe("successful deployment", () => {
    it("should render a successful deployment", () => {
      const expectedText = testFormat(`
        Deployment deployment-01 (chainId: 1) was successful

        ${chalk.bold("Deployed Addresses")}

        MyModule#Token - 0x1F98431c8aD98523631AE4a59f267346ea31F984
        MyModule#AnotherToken - 0x0011223344556677889900112233445566778899`);

      const statusResult: StatusResult = {
        ...exampleStatusResult,
        successful: ["MyModule#Token", "MyModule#AnotherToken"],
        contracts: {
          "MyModule#Token": {
            id: "MyModule#Token",
            address: exampleAddress,
            contractName: "Token",
            sourceName: "contracts/Token.sol",
            abi: [],
          },
          "MyModule#AnotherToken": {
            id: "MyModule#AnotherToken",
            address: differentAddress,
            contractName: "AnotherToken",
            sourceName: "contracts/AnotherToken.sol",
            abi: [],
          },
        },
      };

      const actualText = calculateDeploymentStatusDisplay(
        "deployment-01",
        statusResult
      );

      assert.equal(actualText, expectedText);
    });

    it("should render a successful deployment with no deploys", () => {
      const expectedText = testFormat(`
        Deployment deployment-01 (chainId: 1) was successful

        ${chalk.italic("No contracts were deployed")}`);

      const statusResult: StatusResult = {
        ...exampleStatusResult,
        successful: ["MyModule#a_call"],
        contracts: {},
      };

      const actualText = calculateDeploymentStatusDisplay(
        "deployment-01",
        statusResult
      );

      assert.equal(actualText, expectedText);
    });
  });

  describe("failed deployment", () => {
    it("should render an execution failure with multiple of each problem type", () => {
      const expectedText = testFormat(`
        Deployment deployment-01 (chainId: 1) failed

        Futures timed out with transactions unconfirmed after maximum fee bumps:
         - MyModule:MyContract1
         - MyModule:AnotherContract1

        Futures failed during execution:
         - MyModule:MyContract3: Reverted with reason x
         - MyModule:AnotherContract3: Reverted with reason y

        To learn how to handle these errors: https://v2.hardhat.org/ignition-errors

        Futures where held by the strategy:
         - MyModule:MyContract2: Vote is not complete
         - MyModule:AnotherContract2: Server timed out`);

      const statusResult: StatusResult = {
        chainId: 1,
        started: [],
        timedOut: [
          { futureId: "MyModule:MyContract1", networkInteractionId: 1 },
          { futureId: "MyModule:AnotherContract1", networkInteractionId: 3 },
        ],
        held: [
          {
            futureId: "MyModule:MyContract2",
            heldId: 1,
            reason: "Vote is not complete",
          },
          {
            futureId: "MyModule:AnotherContract2",
            heldId: 3,
            reason: "Server timed out",
          },
        ],
        failed: [
          {
            futureId: "MyModule:MyContract3",
            networkInteractionId: 1,
            error: "Reverted with reason x",
          },
          {
            futureId: "MyModule:AnotherContract3",
            networkInteractionId: 3,
            error: "Reverted with reason y",
          },
        ],
        successful: ["MyModule#Token", "MyModule#AnotherToken"],
        contracts: {
          "MyModule#Token": {
            id: "MyModule#Token",
            address: exampleAddress,
            contractName: "Token",
            sourceName: "contracts/Token.sol",
            abi: [],
          },
          "MyModule#AnotherToken": {
            id: "MyModule#AnotherToken",
            address: differentAddress,
            contractName: "AnotherToken",
            sourceName: "contracts/AnotherToken.sol",
            abi: [],
          },
        },
      };

      const actualText = calculateDeploymentStatusDisplay(
        "deployment-01",
        statusResult
      );

      assert.equal(actualText, expectedText);
    });
  });

  describe("deployment with started but unfinished futures (e.g. simulation errors)", () => {
    it("should render a successful deployment", () => {
      const expectedText = testFormat(`
        Deployment deployment-01 (chainId: 1) has futures that have started but not completed

         - MyModule#Token
         - MyModule#AnotherToken

        Please rerun your deployment.`);

      const statusResult: StatusResult = {
        ...exampleStatusResult,
        started: ["MyModule#Token", "MyModule#AnotherToken"],
      };

      const actualText = calculateDeploymentStatusDisplay(
        "deployment-01",
        statusResult
      );

      assert.equal(actualText, expectedText);
    });
  });
});
