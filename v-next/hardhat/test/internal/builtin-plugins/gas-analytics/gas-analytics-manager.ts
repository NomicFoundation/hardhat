import type { GasMeasurement } from "../../../../src/internal/builtin-plugins/gas-analytics/types.js";

import assert from "node:assert/strict";
import path from "node:path";
import { afterEach, before, describe, it } from "node:test";

import {
  emptyDir,
  getAllFilesMatching,
  mkdtemp,
  readJsonFile,
} from "@nomicfoundation/hardhat-utils/fs";
import chalk from "chalk";

import {
  avg,
  median,
  getUserFqn,
  getFunctionName,
  findDuplicates,
  roundTo,
  GasAnalyticsManagerImplementation,
} from "../../../../src/internal/builtin-plugins/gas-analytics/gas-analytics-manager.js";

describe("gas-analytics-manager", () => {
  describe("GasAnalyticsManager", () => {
    let tmpDir: string;
    before(async () => {
      tmpDir = await mkdtemp("gas-stats-test-");
    });

    describe("constructor", () => {
      it("should initialize with empty gasMeasurements array", () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        assert.deepEqual(manager.gasMeasurements, []);
      });
    });

    describe("addGasMeasurement", () => {
      it("should add function gas measurement to the array", () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        const functionMeasurement: GasMeasurement = {
          type: "function",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          functionSig: "transfer(address,uint256)",
          gas: 25000,
        };

        manager.addGasMeasurement(functionMeasurement);

        assert.equal(manager.gasMeasurements.length, 1);
        assert.deepEqual(manager.gasMeasurements[0], functionMeasurement);
      });

      it("should add deployment gas measurement to the array", () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        const deploymentMeasurement: GasMeasurement = {
          type: "deployment",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          gas: 500000,
          size: 2048,
        };

        manager.addGasMeasurement(deploymentMeasurement);

        assert.equal(manager.gasMeasurements.length, 1);
        assert.deepEqual(manager.gasMeasurements[0], deploymentMeasurement);
      });
    });

    describe("saveGasMeasurements", () => {
      it("should save gas measurements in memory", async () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        const measurement1: GasMeasurement = {
          type: "function",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          functionSig: "transfer(address,uint256)",
          gas: 25000,
        };
        const measurement2: GasMeasurement = {
          type: "deployment",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          gas: 500000,
          size: 2048,
        };

        manager.addGasMeasurement(measurement1);
        manager.addGasMeasurement(measurement2);

        await manager.saveGasMeasurements("test-id");

        assert.equal(manager.gasMeasurements.length, 2);
        assert.deepEqual(manager.gasMeasurements[0], measurement1);
        assert.deepEqual(manager.gasMeasurements[1], measurement2);
      });

      it("should save gas measurements in disk", async () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        const measurement1: GasMeasurement = {
          type: "function",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          functionSig: "transfer(address,uint256)",
          gas: 25000,
        };
        const measurement2: GasMeasurement = {
          type: "deployment",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          gas: 500000,
          size: 2048,
        };

        manager.addGasMeasurement(measurement1);
        manager.addGasMeasurement(measurement2);

        await manager.saveGasMeasurements("test-id");

        const gasMeasurementsPath = await getAllFilesMatching(
          path.join(tmpDir, "gas-stats", "test-id"),
        );

        assert.ok(
          gasMeasurementsPath.length !== 0,
          "The gas measurements should be saved to disk",
        );

        const gasMeasurements = await readJsonFile<GasMeasurement[]>(
          gasMeasurementsPath[0],
        );
        assert.equal(gasMeasurements.length, 2);
        assert.deepEqual(gasMeasurements[0], measurement1);
        assert.deepEqual(gasMeasurements[1], measurement2);
      });
    });

    describe("clearGasMeasurements", () => {
      it("should clear gas measurements in memory", async () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        const measurement1: GasMeasurement = {
          type: "function",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          functionSig: "transfer(address,uint256)",
          gas: 25000,
        };
        const measurement2: GasMeasurement = {
          type: "deployment",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          gas: 500000,
          size: 2048,
        };

        manager.addGasMeasurement(measurement1);
        manager.addGasMeasurement(measurement2);

        await manager.saveGasMeasurements("test-id");

        await manager.clearGasMeasurements("test-id");

        assert.equal(manager.gasMeasurements.length, 0);
      });

      it("should clear gas measurements in disk", async () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        const measurement1: GasMeasurement = {
          type: "function",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          functionSig: "transfer(address,uint256)",
          gas: 25000,
        };
        const measurement2: GasMeasurement = {
          type: "deployment",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          gas: 500000,
          size: 2048,
        };

        manager.addGasMeasurement(measurement1);
        manager.addGasMeasurement(measurement2);

        await manager.saveGasMeasurements("test-id");

        await manager.clearGasMeasurements("test-id");

        const gasMeasurementsPath = await getAllFilesMatching(
          path.join(tmpDir, "gas-stats", "test-id"),
        );

        assert.ok(
          gasMeasurementsPath.length === 0,
          "The gas measurements should be cleared from disk",
        );
      });
    });

    describe("_loadGasMeasurements", () => {
      afterEach(async () => {
        await emptyDir(tmpDir);
      });

      it("should load gas measurements from disk", async () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        const measurement1: GasMeasurement = {
          type: "function",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          functionSig: "transfer(address,uint256)",
          gas: 25000,
        };
        const measurement2: GasMeasurement = {
          type: "deployment",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          gas: 500000,
          size: 2048,
        };
        manager.addGasMeasurement(measurement1);
        manager.addGasMeasurement(measurement2);

        await manager.saveGasMeasurements("test-id");

        const newManager = new GasAnalyticsManagerImplementation(tmpDir);
        await newManager._loadGasMeasurements("test-id");

        assert.equal(newManager.gasMeasurements.length, 2);
        assert.deepEqual(newManager.gasMeasurements[0], measurement1);
        assert.deepEqual(newManager.gasMeasurements[1], measurement2);
      });

      it("should load gas measurements from multiple files", async () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        const measurement1: GasMeasurement = {
          type: "function",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          functionSig: "transfer(address,uint256)",
          gas: 25000,
        };
        const measurement2: GasMeasurement = {
          type: "deployment",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          gas: 500000,
          size: 2048,
        };
        manager.addGasMeasurement(measurement1);
        manager.addGasMeasurement(measurement2);

        await manager.saveGasMeasurements("test-id");
        // Save again to create a second file
        await manager.saveGasMeasurements("test-id");

        const newManager = new GasAnalyticsManagerImplementation(tmpDir);
        await newManager._loadGasMeasurements("test-id");

        assert.equal(newManager.gasMeasurements.length, 4);
        assert.deepEqual(newManager.gasMeasurements[0], measurement1);
        assert.deepEqual(newManager.gasMeasurements[1], measurement2);
        assert.deepEqual(newManager.gasMeasurements[2], measurement1);
        assert.deepEqual(newManager.gasMeasurements[3], measurement2);
      });
    });

    describe("_aggregateGasMeasurements", () => {
      it("should return empty map for no measurements", () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);

        const result = manager._aggregateGasMeasurements();

        assert.equal(result.size, 0);
      });

      it("should aggregate function measurements for single contract", () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          functionSig: "transfer(address,uint256)",
          gas: 25000,
        });
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          functionSig: "transfer(address,uint256)",
          gas: 30000,
        });

        const result = manager._aggregateGasMeasurements();

        assert.equal(result.size, 1);
        const contractMeasurements = result.get(
          "project/contracts/MyContract.sol:MyContract",
        );
        assert.ok(
          contractMeasurements !== undefined,
          "Contract measurements should be defined",
        );
        assert.equal(contractMeasurements.deployment, undefined);
        assert.equal(contractMeasurements.functions.size, 1);

        const transferMeasurements = contractMeasurements.functions.get(
          "transfer(address,uint256)",
        );
        assert.ok(
          transferMeasurements !== undefined,
          "Function measurements should be defined",
        );
        assert.deepEqual(transferMeasurements, [25000, 30000]);
      });

      it("should aggregate deployment measurement for single contract", () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        manager.addGasMeasurement({
          type: "deployment",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          gas: 500000,
          size: 2048,
        });

        const result = manager._aggregateGasMeasurements();

        assert.equal(result.size, 1);
        const contractMeasurements = result.get(
          "project/contracts/MyContract.sol:MyContract",
        );
        assert.ok(
          contractMeasurements !== undefined,
          "Contract measurements should be defined",
        );
        assert.ok(
          contractMeasurements.deployment !== undefined,
          "Deployment should be defined",
        );
        assert.equal(contractMeasurements.deployment.gas, 500000);
        assert.equal(contractMeasurements.deployment.size, 2048);
        assert.equal(contractMeasurements.functions.size, 0);
      });

      it("should aggregate both deployment and function measurements", () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        manager.addGasMeasurement({
          type: "deployment",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          gas: 500000,
          size: 2048,
        });
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          functionSig: "transfer(address,uint256)",
          gas: 25000,
        });
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          functionSig: "balanceOf(address)",
          gas: 15000,
        });

        const result = manager._aggregateGasMeasurements();

        assert.equal(result.size, 1);
        const contractMeasurements = result.get(
          "project/contracts/MyContract.sol:MyContract",
        );
        assert.ok(
          contractMeasurements !== undefined,
          "Contract measurements should be defined",
        );

        assert.ok(
          contractMeasurements.deployment !== undefined,
          "Deployment should be defined",
        );
        assert.equal(contractMeasurements.deployment.gas, 500000);
        assert.equal(contractMeasurements.deployment.size, 2048);

        assert.equal(contractMeasurements.functions.size, 2);
        const transferMeasurements = contractMeasurements.functions.get(
          "transfer(address,uint256)",
        );
        assert.ok(
          transferMeasurements !== undefined,
          "Transfer measurements should be defined",
        );
        assert.deepEqual(transferMeasurements, [25000]);

        const balanceOfMeasurements =
          contractMeasurements.functions.get("balanceOf(address)");
        assert.ok(
          balanceOfMeasurements !== undefined,
          "BalanceOf measurements should be defined",
        );
        assert.deepEqual(balanceOfMeasurements, [15000]);
      });

      it("should aggregate measurements for multiple contracts", () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/TokenA.sol:TokenA",
          functionSig: "mint(uint256)",
          gas: 50000,
        });
        manager.addGasMeasurement({
          type: "deployment",
          contractFqn: "project/contracts/TokenB.sol:TokenB",
          gas: 600000,
          size: 3072,
        });
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/TokenB.sol:TokenB",
          functionSig: "burn(uint256)",
          gas: 30000,
        });

        const result = manager._aggregateGasMeasurements();

        assert.equal(result.size, 2);

        const tokenAMeasurements = result.get(
          "project/contracts/TokenA.sol:TokenA",
        );
        assert.ok(
          tokenAMeasurements !== undefined,
          "TokenA measurements should be defined",
        );
        assert.equal(tokenAMeasurements.deployment, undefined);
        assert.equal(tokenAMeasurements.functions.size, 1);
        const mintMeasurements =
          tokenAMeasurements.functions.get("mint(uint256)");
        assert.ok(
          mintMeasurements !== undefined,
          "Mint measurements should be defined",
        );
        assert.deepEqual(mintMeasurements, [50000]);

        const tokenBMeasurements = result.get(
          "project/contracts/TokenB.sol:TokenB",
        );
        assert.ok(
          tokenBMeasurements !== undefined,
          "TokenB measurements should be defined",
        );
        assert.ok(
          tokenBMeasurements.deployment !== undefined,
          "TokenB deployment should be defined",
        );
        assert.equal(tokenBMeasurements.deployment.gas, 600000);
        assert.equal(tokenBMeasurements.deployment.size, 3072);
        assert.equal(tokenBMeasurements.functions.size, 1);
        const burnMeasurements =
          tokenBMeasurements.functions.get("burn(uint256)");
        assert.ok(
          burnMeasurements !== undefined,
          "Burn measurements should be defined",
        );
        assert.deepEqual(burnMeasurements, [30000]);
      });

      it("should aggregate multiple measurements for same function", () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          functionSig: "transfer(address,uint256)",
          gas: 25000,
        });
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          functionSig: "transfer(address,uint256)",
          gas: 30000,
        });
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          functionSig: "transfer(address,uint256)",
          gas: 20000,
        });

        const result = manager._aggregateGasMeasurements();

        assert.equal(result.size, 1);
        const contractMeasurements = result.get(
          "project/contracts/MyContract.sol:MyContract",
        );
        assert.ok(
          contractMeasurements !== undefined,
          "Contract measurements should be defined",
        );
        assert.equal(contractMeasurements.functions.size, 1);

        const transferMeasurements = contractMeasurements.functions.get(
          "transfer(address,uint256)",
        );
        assert.ok(
          transferMeasurements !== undefined,
          "Function measurements should be defined",
        );
        assert.deepEqual(transferMeasurements, [25000, 30000, 20000]);
      });

      it("should handle overloaded function signatures", () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          functionSig: "transfer(address,uint256)",
          gas: 25000,
        });
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          functionSig: "transfer(address,uint256,bytes)",
          gas: 35000,
        });

        const result = manager._aggregateGasMeasurements();

        assert.equal(result.size, 1);
        const contractMeasurements = result.get(
          "project/contracts/MyContract.sol:MyContract",
        );
        assert.ok(
          contractMeasurements !== undefined,
          "Contract measurements should be defined",
        );
        assert.equal(contractMeasurements.functions.size, 2);

        const transfer1Measurements = contractMeasurements.functions.get(
          "transfer(address,uint256)",
        );
        assert.ok(
          transfer1Measurements !== undefined,
          "First transfer measurements should be defined",
        );
        assert.deepEqual(transfer1Measurements, [25000]);

        const transfer2Measurements = contractMeasurements.functions.get(
          "transfer(address,uint256,bytes)",
        );
        assert.ok(
          transfer2Measurements !== undefined,
          "Second transfer measurements should be defined",
        );
        assert.deepEqual(transfer2Measurements, [35000]);
      });

      it("should only keep latest deployment measurement per contract", () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        manager.addGasMeasurement({
          type: "deployment",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          gas: 500000,
          size: 2048,
        });
        manager.addGasMeasurement({
          type: "deployment",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          gas: 600000,
          size: 3072,
        });

        const result = manager._aggregateGasMeasurements();

        assert.equal(result.size, 1);
        const contractMeasurements = result.get(
          "project/contracts/MyContract.sol:MyContract",
        );
        assert.ok(
          contractMeasurements !== undefined,
          "Contract measurements should be defined",
        );
        assert.ok(
          contractMeasurements.deployment !== undefined,
          "Deployment should be defined",
        );
        assert.equal(contractMeasurements.deployment.gas, 600000);
        assert.equal(contractMeasurements.deployment.size, 3072);
      });
    });

    describe("_calculateGasStats", () => {
      it("should calculate stats for a single function with multiple gas measurements", () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          functionSig: "transfer(address,uint256)",
          gas: 25000,
        });
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          functionSig: "transfer(address,uint256)",
          gas: 30000,
        });
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          functionSig: "transfer(address,uint256)",
          gas: 20000,
        });

        const gasStats = manager._calculateGasStats();

        assert.equal(gasStats.size, 1);
        const contractStats = gasStats.get(
          "project/contracts/MyContract.sol:MyContract",
        );
        assert.ok(
          contractStats !== undefined,
          "Contract stats should be defined",
        );
        assert.equal(contractStats.functions.size, 1);

        const transferStats = contractStats.functions.get("transfer");
        assert.ok(
          transferStats !== undefined,
          "transfer function stats should be defined",
        );
        assert.equal(transferStats.min, 20000);
        assert.equal(transferStats.max, 30000);
        assert.equal(transferStats.avg, 25000);
        assert.equal(transferStats.median, 25000);
        assert.equal(transferStats.calls, 3);
      });

      it("should calculate stats for deployment gas measurements", () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        manager.addGasMeasurement({
          type: "deployment",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          gas: 500000,
          size: 2048,
        });

        const gasStats = manager._calculateGasStats();

        assert.equal(gasStats.size, 1);
        const contractStats = gasStats.get(
          "project/contracts/MyContract.sol:MyContract",
        );
        assert.ok(
          contractStats !== undefined,
          "Contract stats should be defined",
        );
        assert.ok(
          contractStats.deployment !== undefined,
          "Deployment stats should be defined",
        );
        assert.equal(contractStats.deployment.gas, 500000);
        assert.equal(contractStats.deployment.size, 2048);
      });

      it("should calculate stats for multiple contracts", () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/TokenA.sol:TokenA",
          functionSig: "mint(uint256)",
          gas: 50000,
        });
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/TokenB.sol:TokenB",
          functionSig: "burn(uint256)",
          gas: 30000,
        });

        const gasStats = manager._calculateGasStats();

        assert.equal(gasStats.size, 2);

        const tokenAStats = gasStats.get("project/contracts/TokenA.sol:TokenA");
        assert.ok(tokenAStats !== undefined, "TokenA stats should be defined");
        assert.equal(tokenAStats.functions.size, 1);
        assert.ok(
          tokenAStats.functions.get("mint") !== undefined,
          "mint function stats should be defined",
        );

        const tokenBStats = gasStats.get("project/contracts/TokenB.sol:TokenB");
        assert.ok(tokenBStats !== undefined, "TokenB stats should be defined");
        assert.equal(tokenBStats.functions.size, 1);
        assert.ok(
          tokenBStats.functions.get("burn") !== undefined,
          "burn function stats should be defined",
        );
      });

      it("should handle overloaded functions by using full signature", () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          functionSig: "transfer(address,uint256)",
          gas: 25000,
        });
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          functionSig: "transfer(address,uint256,bytes)",
          gas: 35000,
        });

        const gasStats = manager._calculateGasStats();

        assert.equal(gasStats.size, 1);
        const contractStats = gasStats.get(
          "project/contracts/MyContract.sol:MyContract",
        );
        assert.ok(
          contractStats !== undefined,
          "Contract stats should be defined",
        );
        assert.equal(contractStats.functions.size, 2);

        const transferOverload1 = contractStats.functions.get(
          "transfer(address,uint256)",
        );
        assert.ok(
          transferOverload1 !== undefined,
          "transfer(address,uint256) function stats should be defined",
        );
        assert.equal(transferOverload1.min, 25000);
        assert.equal(transferOverload1.max, 25000);
        assert.equal(transferOverload1.avg, 25000);
        assert.equal(transferOverload1.median, 25000);
        assert.equal(transferOverload1.calls, 1);

        const transferOverload2 = contractStats.functions.get(
          "transfer(address,uint256,bytes)",
        );
        assert.ok(
          transferOverload2 !== undefined,
          "transfer(address,uint256,bytes) function stats should be defined",
        );
        assert.equal(transferOverload2.min, 35000);
        assert.equal(transferOverload2.max, 35000);
        assert.equal(transferOverload2.avg, 35000);
        assert.equal(transferOverload2.median, 35000);
        assert.equal(transferOverload2.calls, 1);
      });

      it("should handle empty gas measurements", () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);

        const gasStats = manager._calculateGasStats();

        assert.equal(gasStats.size, 0);
      });

      it("should round average and median to 2 decimal places", () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          functionSig: "transfer(address,uint256)",
          gas: 33330,
        });
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          functionSig: "transfer(address,uint256)",
          gas: 33334,
        });
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          functionSig: "transfer(address,uint256)",
          gas: 33335,
        });
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          functionSig: "transfer(address,uint256)",
          gas: 33340,
        });

        const gasStats = manager._calculateGasStats();

        const contractStats = gasStats.get(
          "project/contracts/MyContract.sol:MyContract",
        );
        const transferStats = contractStats?.functions.get("transfer");

        assert.ok(
          transferStats !== undefined,
          "transfer function stats should be defined",
        );
        assert.equal(transferStats.avg, 33334.75);
        assert.equal(transferStats.median, 33334.5);
      });
    });

    describe("_generateGasStatsReport", () => {
      it("should generate an empty report for no gas stats", () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);

        const report = manager._generateGasStatsReport(new Map());

        assert.equal(report, "");
      });

      it("should generate a report", () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        const gasStats = new Map();
        gasStats.set("project/contracts/MyContract.sol:MyContract", {
          deployment: { gas: 500000, size: 2048 },
          functions: new Map([
            [
              "transfer",
              {
                min: 20000,
                max: 30000,
                avg: 25000,
                median: 25000,
                calls: 3,
              },
            ],
            [
              "balanceOf",
              {
                min: 15000,
                max: 15000,
                avg: 15000,
                median: 15000,
                calls: 1,
              },
            ],
          ]),
        });

        gasStats.set("project/contracts/TokenA.sol:TokenA", {
          deployment: undefined,
          functions: new Map([
            [
              "transfer(address,uint256)",
              {
                min: 22000,
                max: 28000,
                avg: 25000,
                median: 25000,
                calls: 2,
              },
            ],
            [
              "transfer(address,uint256,bytes)",
              {
                min: 32000,
                max: 36000,
                avg: 34000,
                median: 34000,
                calls: 2,
              },
            ],
          ]),
        });

        const report = manager._generateGasStatsReport(gasStats);

        const expectedReport = `
| ${chalk.cyan.bold("contracts/MyContract.sol:MyContract")} |                 |         |        |       |        |
| ----------------------------------- | --------------- | ------- | ------ | ----- | ------ |
| ${chalk.yellow("Deployment Cost")}                     | ${chalk.yellow("Deployment Size")} |         |        |       |        |
| 500000                              | 2048            |         |        |       |        |
| ${chalk.yellow("Function name")}                       | ${chalk.yellow("Min")}             | ${chalk.yellow("Average")} | ${chalk.yellow("Median")} | ${chalk.yellow("Max")}   | ${chalk.yellow("#calls")} |
| transfer                            | 20000           | 25000   | 25000  | 30000 | 3      |
| balanceOf                           | 15000           | 15000   | 15000  | 15000 | 1      |
|                                     |                 |         |        |       |        |
| ${chalk.cyan.bold("contracts/TokenA.sol:TokenA")}         |                 |         |        |       |        |
| ----------------------------------- | --------------- | ------- | ------ | ----- | ------ |
| ${chalk.yellow("Function name")}                       | ${chalk.yellow("Min")}             | ${chalk.yellow("Average")} | ${chalk.yellow("Median")} | ${chalk.yellow("Max")}   | ${chalk.yellow("#calls")} |
| transfer(address,uint256)           | 22000           | 25000   | 25000  | 28000 | 2      |
| transfer(address,uint256,bytes)     | 32000           | 34000   | 34000  | 36000 | 2      |
`.trim();

        assert.equal(report, expectedReport);
      });
    });
  });

  describe("helpers", () => {
    describe("avg", () => {
      it("should calculate average of numbers", () => {
        assert.equal(avg([1, 2, 3, 4, 5]), 3);
        assert.equal(avg([10, 20, 30]), 20);
        assert.equal(avg([1]), 1);
        assert.equal(avg([0, 0, 0]), 0);
        assert.equal(avg([5.5, 2.5]), 4);
      });
    });

    describe("median", () => {
      it("should calculate median for odd length arrays", () => {
        assert.equal(median([1, 2, 3]), 2);
        assert.equal(median([5, 1, 3]), 3);
        assert.equal(median([1]), 1);
      });

      it("should calculate median for even length arrays", () => {
        assert.equal(median([1, 2]), 1.5);
        assert.equal(median([1, 2, 3, 4]), 2.5);
        assert.equal(median([10, 20, 30, 40]), 25);
      });

      it("should handle unsorted arrays", () => {
        assert.equal(median([3, 1, 2]), 2);
        assert.equal(median([4, 1, 3, 2]), 2.5);
      });
    });

    describe("getUserFqn", () => {
      it("should remove project/ prefix", () => {
        assert.equal(
          getUserFqn("project/contracts/MyContract.sol"),
          "contracts/MyContract.sol",
        );
        assert.equal(getUserFqn("project/test.sol"), "test.sol");
      });

      it("should handle npm packages", () => {
        assert.equal(
          getUserFqn("npm/package@1.0.0/Contract.sol"),
          "package/Contract.sol",
        );
        assert.equal(
          getUserFqn("npm/@scope/package@1.0.0/Contract.sol"),
          "@scope/package/Contract.sol",
        );
      });

      it("should handle npm packages without version match", () => {
        assert.equal(getUserFqn("npm/invalid-format"), "invalid-format");
      });

      it("should return input as-is for other formats", () => {
        assert.equal(getUserFqn("other/format"), "other/format");
        assert.equal(getUserFqn("simple"), "simple");
      });
    });

    describe("getFunctionName", () => {
      it("should extract function name from signature", () => {
        assert.equal(getFunctionName("transfer(address,uint256)"), "transfer");
        assert.equal(getFunctionName("balanceOf(address)"), "balanceOf");
        assert.equal(getFunctionName("approve(address,uint256)"), "approve");
      });

      it("should handle functions without parameters", () => {
        assert.equal(getFunctionName("totalSupply()"), "totalSupply");
      });

      it("should handle simple names without parentheses", () => {
        assert.equal(getFunctionName("simple"), "simple");
      });
    });

    describe("findDuplicates", () => {
      it("should find duplicate strings", () => {
        const result = findDuplicates(["a", "b", "a", "c", "b"]);
        assert.deepEqual(result.sort(), ["a", "b"]);
      });

      it("should find duplicate numbers", () => {
        const result = findDuplicates([1, 2, 1, 3, 2]);
        assert.deepEqual(result.sort(), [1, 2]);
      });

      it("should return empty array when no duplicates", () => {
        assert.deepEqual(findDuplicates(["a", "b", "c"]), []);
        assert.deepEqual(findDuplicates([1, 2, 3]), []);
      });

      it("should handle empty array", () => {
        assert.deepEqual(findDuplicates([]), []);
      });

      it("should handle single element", () => {
        assert.deepEqual(findDuplicates(["a"]), []);
      });
    });

    describe("roundTo", () => {
      it("should round to specified decimal places", () => {
        assert.equal(roundTo(3.14159, 2), 3.14);
        assert.equal(roundTo(3.14159, 3), 3.142);
        assert.equal(roundTo(3.14159, 0), 3);
      });

      it("should handle rounding up", () => {
        assert.equal(roundTo(3.156, 2), 3.16);
        assert.equal(roundTo(3.999, 2), 4);
      });

      it("should handle negative numbers", () => {
        assert.equal(roundTo(-3.14159, 2), -3.14);
        assert.equal(roundTo(-3.156, 2), -3.16);
      });

      it("should handle zero", () => {
        assert.equal(roundTo(0, 2), 0);
      });
    });
  });
});
