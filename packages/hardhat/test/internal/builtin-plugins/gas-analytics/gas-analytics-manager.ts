import type {
  GasMeasurement,
  GasStatsJson,
} from "../../../../src/internal/builtin-plugins/gas-analytics/types.js";

import assert from "node:assert/strict";
import path from "node:path";
import { afterEach, before, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertRejectsWithHardhatError,
  disableConsole,
} from "@nomicfoundation/hardhat-test-utils";
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
  makeGroupKey,
  getDisplayKey,
  getProxyLabel,
  GasAnalyticsManagerImplementation,
} from "../../../../src/internal/builtin-plugins/gas-analytics/gas-analytics-manager.js";
import { getFullyQualifiedName } from "../../../../src/utils/contract-names.js";

describe("gas-analytics-manager", () => {
  disableConsole();

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
          proxyChain: [],
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
          runtimeSize: 2048,
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
          proxyChain: [],
        };
        const measurement2: GasMeasurement = {
          type: "deployment",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          gas: 500000,
          runtimeSize: 2048,
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
          proxyChain: [],
        };
        const measurement2: GasMeasurement = {
          type: "deployment",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          gas: 500000,
          runtimeSize: 2048,
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
          proxyChain: [],
        };
        const measurement2: GasMeasurement = {
          type: "deployment",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          gas: 500000,
          runtimeSize: 2048,
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
          proxyChain: [],
        };
        const measurement2: GasMeasurement = {
          type: "deployment",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          gas: 500000,
          runtimeSize: 2048,
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
          proxyChain: [],
        };
        const measurement2: GasMeasurement = {
          type: "deployment",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          gas: 500000,
          runtimeSize: 2048,
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

      it("should load gas measurements from multiple IDs", async () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        const measurement1: GasMeasurement = {
          type: "function",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          functionSig: "transfer(address,uint256)",
          gas: 25000,
          proxyChain: [],
        };
        const measurement2: GasMeasurement = {
          type: "function",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          functionSig: "approve(address,uint256)",
          gas: 46000,
          proxyChain: [],
        };

        manager.addGasMeasurement(measurement1);
        await manager.saveGasMeasurements("runner-1");

        manager.gasMeasurements = [];
        manager.addGasMeasurement(measurement2);
        await manager.saveGasMeasurements("runner-2");

        const newManager = new GasAnalyticsManagerImplementation(tmpDir);
        await newManager._loadGasMeasurements("runner-1", "runner-2");

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
          proxyChain: [],
        };
        const measurement2: GasMeasurement = {
          type: "deployment",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          gas: 500000,
          runtimeSize: 2048,
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

    describe("reportGasStats", () => {
      afterEach(async () => {
        await emptyDir(tmpDir);
      });

      it("should not generate output when report is disabled", async (t) => {
        const consoleMock = t.mock.method(console, "log");
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          functionSig: "transfer(address,uint256)",
          gas: 25000,
          proxyChain: [],
        });
        await manager.saveGasMeasurements("test-id");

        manager.disableReport();
        await manager.reportGasStats("test-id");

        assert.equal(consoleMock.mock.callCount(), 0);
      });

      it("should generate output after enableReport is called", async (t) => {
        const consoleMock = t.mock.method(console, "log");
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          functionSig: "transfer(address,uint256)",
          gas: 25000,
          proxyChain: [],
        });
        await manager.saveGasMeasurements("test-id");

        manager.disableReport();
        manager.enableReport();
        await manager.reportGasStats("test-id");

        assert.ok(
          consoleMock.mock.callCount() > 0,
          "Should have generated output",
        );
        const output = consoleMock.mock.calls
          .map((call) => String(call.arguments[0] ?? ""))
          .join("\n");
        assert.ok(
          output.includes("transfer"),
          "Report should contain the function name",
        );
      });

      it("should aggregate data from multiple runner IDs", async (t) => {
        const consoleMock = t.mock.method(console, "log");
        const manager = new GasAnalyticsManagerImplementation(tmpDir);

        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          functionSig: "transfer(address,uint256)",
          gas: 25000,
          proxyChain: [],
        });
        await manager.saveGasMeasurements("runner-1");

        manager.gasMeasurements = [];
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          functionSig: "transfer(address,uint256)",
          gas: 35000,
          proxyChain: [],
        });
        await manager.saveGasMeasurements("runner-2");

        await manager.reportGasStats("runner-1", "runner-2");

        const output = consoleMock.mock.calls
          .map((call) => String(call.arguments[0] ?? ""))
          .join("\n");
        assert.ok(
          output.includes("25000") && output.includes("35000"),
          "Report should contain the numbers from both runners as they should be displayed as min/max for the same function call",
        );
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
          proxyChain: [],
        });
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          functionSig: "transfer(address,uint256)",
          gas: 30000,
          proxyChain: [],
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
        assert.deepEqual(contractMeasurements.deployments, []);
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
          runtimeSize: 2048,
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
        assert.deepEqual(contractMeasurements.deployments, [500000]);
        assert.equal(contractMeasurements.deploymentRuntimeSize, 2048);
        assert.equal(contractMeasurements.functions.size, 0);
      });

      it("should aggregate both deployment and function measurements", () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        manager.addGasMeasurement({
          type: "deployment",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          gas: 500000,
          runtimeSize: 2048,
        });
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          functionSig: "transfer(address,uint256)",
          gas: 25000,
          proxyChain: [],
        });
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          functionSig: "balanceOf(address)",
          gas: 15000,
          proxyChain: [],
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

        assert.deepEqual(contractMeasurements.deployments, [500000]);
        assert.equal(contractMeasurements.deploymentRuntimeSize, 2048);

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
          proxyChain: [],
        });
        manager.addGasMeasurement({
          type: "deployment",
          contractFqn: "project/contracts/TokenB.sol:TokenB",
          gas: 600000,
          runtimeSize: 3072,
        });
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/TokenB.sol:TokenB",
          functionSig: "burn(uint256)",
          gas: 30000,
          proxyChain: [],
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
        assert.deepEqual(tokenAMeasurements.deployments, []);
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
        assert.deepEqual(tokenBMeasurements.deployments, [600000]);
        assert.equal(tokenBMeasurements.deploymentRuntimeSize, 3072);
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
          proxyChain: [],
        });
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          functionSig: "transfer(address,uint256)",
          gas: 30000,
          proxyChain: [],
        });
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          functionSig: "transfer(address,uint256)",
          gas: 20000,
          proxyChain: [],
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
          proxyChain: [],
        });
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          functionSig: "transfer(address,uint256,bytes)",
          gas: 35000,
          proxyChain: [],
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

      it("should aggregate deployment measurements per contract", () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        manager.addGasMeasurement({
          type: "deployment",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          gas: 500000,
          runtimeSize: 2048,
        });
        manager.addGasMeasurement({
          type: "deployment",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          gas: 600000,
          runtimeSize: 3072,
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
        assert.deepEqual(contractMeasurements.deployments, [500000, 600000]);
        assert.equal(contractMeasurements.deploymentRuntimeSize, 2048);
      });

      it("should group proxied function calls separately from direct calls", () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        const proxyChain = [
          "project/contracts/Proxies.sol:Proxy",
          "project/contracts/Impl.sol:Impl",
        ];
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/Impl.sol:Impl",
          functionSig: "foo()",
          gas: 10000,
          proxyChain: [],
        });
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/Impl.sol:Impl",
          functionSig: "foo()",
          gas: 20000,
          proxyChain,
        });

        const result = manager._aggregateGasMeasurements();

        assert.equal(result.size, 2);
        const directKey = makeGroupKey("project/contracts/Impl.sol:Impl", []);
        const proxiedKey = makeGroupKey(
          "project/contracts/Impl.sol:Impl",
          proxyChain,
        );
        const directMeasurements = result.get(directKey);
        const proxiedMeasurements = result.get(proxiedKey);
        assert.ok(
          directMeasurements !== undefined,
          "Direct measurements should be defined",
        );
        assert.ok(
          proxiedMeasurements !== undefined,
          "Proxied measurements should be defined",
        );
        assert.deepEqual(directMeasurements.functions.get("foo()"), [10000]);
        assert.deepEqual(proxiedMeasurements.functions.get("foo()"), [20000]);
        assert.deepEqual(directMeasurements.proxyChain, []);
        assert.deepEqual(proxiedMeasurements.proxyChain, proxyChain);
      });

      it("should group different proxy chains separately", () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/Impl.sol:Impl",
          functionSig: "foo()",
          gas: 10000,
          proxyChain: [
            "project/contracts/Proxies.sol:Proxy",
            "project/contracts/Impl.sol:Impl",
          ],
        });
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/Impl.sol:Impl",
          functionSig: "foo()",
          gas: 30000,
          proxyChain: [
            "project/contracts/Proxies.sol:Proxy2",
            "project/contracts/Proxies.sol:Proxy",
            "project/contracts/Impl.sol:Impl",
          ],
        });

        const result = manager._aggregateGasMeasurements();

        assert.equal(result.size, 2);
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
          proxyChain: [],
        });
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          functionSig: "transfer(address,uint256)",
          gas: 30000,
          proxyChain: [],
        });
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          functionSig: "transfer(address,uint256)",
          gas: 20000,
          proxyChain: [],
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
        assert.equal(transferStats.count, 3);
      });

      it("should calculate stats for deployment gas measurements", () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        manager.addGasMeasurement({
          type: "deployment",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          gas: 400000,
          runtimeSize: 2048,
        });
        manager.addGasMeasurement({
          type: "deployment",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          gas: 500000,
          runtimeSize: 2048,
        });
        manager.addGasMeasurement({
          type: "deployment",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          gas: 600000,
          runtimeSize: 3072,
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
        assert.equal(contractStats.deployment.min, 400000);
        assert.equal(contractStats.deployment.max, 600000);
        assert.equal(contractStats.deployment.avg, 500000);
        assert.equal(contractStats.deployment.median, 500000);
        assert.equal(contractStats.deployment.count, 3);
        assert.equal(contractStats.deployment.runtimeSize, 2048);
      });

      it("should calculate stats for multiple contracts", () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/TokenA.sol:TokenA",
          functionSig: "mint(uint256)",
          gas: 50000,
          proxyChain: [],
        });
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/TokenB.sol:TokenB",
          functionSig: "burn(uint256)",
          gas: 30000,
          proxyChain: [],
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
          proxyChain: [],
        });
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          functionSig: "transfer(address,uint256,bytes)",
          gas: 35000,
          proxyChain: [],
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
        assert.equal(transferOverload1.count, 1);

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
        assert.equal(transferOverload2.count, 1);
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
          proxyChain: [],
        });
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          functionSig: "transfer(address,uint256)",
          gas: 33334,
          proxyChain: [],
        });
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          functionSig: "transfer(address,uint256)",
          gas: 33335,
          proxyChain: [],
        });
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          functionSig: "transfer(address,uint256)",
          gas: 33340,
          proxyChain: [],
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
        assert.equal(transferStats.avg, 33335);
        assert.equal(transferStats.median, 33335);
      });

      it("should duplicate deployment stats to proxied groups", () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        const proxyChain = [
          "project/contracts/Proxies.sol:Proxy",
          "project/contracts/Impl.sol:Impl",
        ];
        manager.addGasMeasurement({
          type: "deployment",
          contractFqn: "project/contracts/Impl.sol:Impl",
          gas: 500000,
          runtimeSize: 2048,
        });
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/Impl.sol:Impl",
          functionSig: "foo()",
          gas: 10000,
          proxyChain: [],
        });
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/Impl.sol:Impl",
          functionSig: "foo()",
          gas: 20000,
          proxyChain,
        });

        const gasStats = manager._calculateGasStats();

        const directKey = makeGroupKey("project/contracts/Impl.sol:Impl", []);
        const proxiedKey = makeGroupKey(
          "project/contracts/Impl.sol:Impl",
          proxyChain,
        );

        const directStats = gasStats.get(directKey);
        const proxiedStats = gasStats.get(proxiedKey);
        assert.ok(directStats !== undefined, "Direct stats should be defined");
        assert.ok(
          proxiedStats !== undefined,
          "Proxied stats should be defined",
        );

        assert.ok(
          directStats.deployment !== undefined,
          "Direct deployment should be defined",
        );
        assert.ok(
          proxiedStats.deployment !== undefined,
          "Proxied deployment should be defined",
        );
        assert.equal(proxiedStats.deployment.min, 500000);
        assert.equal(proxiedStats.deployment.runtimeSize, 2048);
        assert.deepEqual(proxiedStats.proxyChain, proxyChain);
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
        // Contracts are added in non-alphabetical order to test sorting
        gasStats.set("project/contracts/TokenA.sol:TokenA", {
          proxyChain: [],
          deployment: undefined,
          functions: new Map([
            // Functions are added in non-alphabetical order to test sorting
            [
              "transfer(address,uint256,bytes)",
              {
                min: 32000,
                max: 36000,
                avg: 34000,
                median: 34000,
                count: 2,
              },
            ],
            [
              "transfer(address,uint256)",
              {
                min: 22000,
                max: 28000,
                avg: 25000,
                median: 25000,
                count: 2,
              },
            ],
          ]),
        });

        gasStats.set("project/contracts/MyContract.sol:MyContract", {
          proxyChain: [],
          deployment: {
            min: 400000,
            max: 600000,
            avg: 500000,
            median: 500000,
            count: 3,
            runtimeSize: 2048,
          },
          functions: new Map([
            // Functions are added in non-alphabetical order to test sorting
            [
              "transfer",
              {
                min: 20000,
                max: 30000,
                avg: 25000,
                median: 25000,
                count: 3,
              },
            ],
            [
              "balanceOf",
              {
                min: 15000,
                max: 15000,
                avg: 15000,
                median: 15000,
                count: 1,
              },
            ],
          ]),
        });
        // ║ Function name                   | Min             | Average | Median | Max   | #calls ║
        // ║ Function name                   │ Min             │ Average │ Median │ Max   │ #calls ║
        const report = manager._generateGasStatsReport(gasStats);

        const expectedReport = `
╔═════════════════════════════════════════════════════════════════════════════════════╗
║                                ${chalk.bold("Gas Usage Statistics")}                                 ║
╚═════════════════════════════════════════════════════════════════════════════════════╝
╔═════════════════════════════════════════════════════════════════════════════════════╗
║ ${chalk.cyan.bold("contracts/MyContract.sol:MyContract")}                                                 ║
╟─────────────────────────────────┬────────┬─────────┬────────┬────────┬──────────────╢
║ ${chalk.yellow("Function name")}                   │ ${chalk.yellow("Min")}    │ ${chalk.yellow("Average")} │ ${chalk.yellow("Median")} │ ${chalk.yellow("Max")}    │ ${chalk.yellow("#calls")}       ║
╟─────────────────────────────────┼────────┼─────────┼────────┼────────┼──────────────╢
║ balanceOf                       │ 15000  │ 15000   │ 15000  │ 15000  │ 1            ║
║ transfer                        │ 20000  │ 25000   │ 25000  │ 30000  │ 3            ║
╟─────────────────────────────────┼────────┼─────────┼────────┼────────┼──────────────╢
║ ${chalk.yellow("Deployment")}                      │ ${chalk.yellow("Min")}    │ ${chalk.yellow("Average")} │ ${chalk.yellow("Median")} │ ${chalk.yellow("Max")}    │ ${chalk.yellow("#deployments")} ║
╟─────────────────────────────────┼────────┼─────────┼────────┼────────┼──────────────╢
║                                 │ 400000 │ 500000  │ 500000 │ 600000 │ 3            ║
╟─────────────────────────────────┼────────┼─────────┴────────┴────────┴──────────────╢
║ ${chalk.yellow("Bytecode size")}                   │ 2048   │                                          ║
╚═════════════════════════════════╧════════╧══════════════════════════════════════════╝
╔═════════════════════════════════════════════════════════════════════════════════════╗
║ ${chalk.cyan.bold("contracts/TokenA.sol:TokenA")}                                                         ║
╟─────────────────────────────────┬────────┬─────────┬────────┬────────┬──────────────╢
║ ${chalk.yellow("Function name")}                   │ ${chalk.yellow("Min")}    │ ${chalk.yellow("Average")} │ ${chalk.yellow("Median")} │ ${chalk.yellow("Max")}    │ ${chalk.yellow("#calls")}       ║
╟─────────────────────────────────┼────────┼─────────┼────────┼────────┼──────────────╢
║ transfer(address,uint256)       │ 22000  │ 25000   │ 25000  │ 28000  │ 2            ║
║ transfer(address,uint256,bytes) │ 32000  │ 34000   │ 34000  │ 36000  │ 2            ║
╚═════════════════════════════════╧════════╧═════════╧════════╧════════╧══════════════╝
`.trim();

        assert.equal(report, expectedReport);
      });

      it("should sort overloads with same parameter count correctly", () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        const gasStats = new Map();
        gasStats.set("project/contracts/TestContract.sol:TestContract", {
          proxyChain: [],
          deployment: undefined,
          functions: new Map([
            [
              "transfer(address,uint256)",
              {
                min: 25000,
                max: 25000,
                avg: 25000,
                median: 25000,
                count: 1,
              },
            ],
            [
              "transfer(address,bytes32)",
              {
                min: 23000,
                max: 23000,
                avg: 23000,
                median: 23000,
                count: 1,
              },
            ],
          ]),
        });

        const report = manager._generateGasStatsReport(gasStats);

        const lines = report.split("\n");
        const transferBytes32Line = lines.findIndex((line) =>
          line.includes("transfer(address,bytes32)"),
        );
        const transferUint256Line = lines.findIndex((line) =>
          line.includes("transfer(address,uint256)"),
        );

        assert.ok(
          transferBytes32Line < transferUint256Line,
          "transfer(address,bytes32) should come before transfer(address,uint256)",
        );
      });

      it("should sort overloads with different parameter counts correctly", () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        const gasStats = new Map();
        gasStats.set("project/contracts/TestContract.sol:TestContract", {
          proxyChain: [],
          deployment: undefined,
          functions: new Map([
            [
              "mint(uint256,bytes)",
              {
                min: 35000,
                max: 35000,
                avg: 35000,
                median: 35000,
                count: 1,
              },
            ],
            [
              "mint(uint256)",
              {
                min: 25000,
                max: 25000,
                avg: 25000,
                median: 25000,
                count: 1,
              },
            ],
          ]),
        });

        const report = manager._generateGasStatsReport(gasStats);

        const lines = report.split("\n");
        const mintUint256Line = lines.findIndex((line) =>
          line.includes("mint(uint256)"),
        );
        const mintBytesLine = lines.findIndex((line) =>
          line.includes("mint(uint256,bytes)"),
        );

        assert.ok(
          mintUint256Line < mintBytesLine,
          "mint(uint256) should come before mint(uint256,bytes)",
        );
      });
    });

    describe("_generateGasStatsJson", () => {
      it("should return empty contracts object when no measurements", () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        const result = manager._generateGasStatsJson(new Map());
        assert.deepEqual(result, { contracts: {} });
      });

      it("should include both deployment and functions stats", () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        manager.addGasMeasurement({
          type: "deployment",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          gas: 500000,
          runtimeSize: 2048,
        });
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          functionSig: "transfer(address,uint256)",
          gas: 25000,
          proxyChain: [],
        });
        const stats = manager._calculateGasStats();
        const result = manager._generateGasStatsJson(stats);

        const contract =
          result.contracts["contracts/MyContract.sol:MyContract"];
        assert.ok(contract !== undefined, "contract entry should exist");
        assert.equal(contract.sourceName, "contracts/MyContract.sol");
        assert.equal(contract.contractName, "MyContract");
        assert.deepEqual(contract.deployment, {
          min: 500000,
          max: 500000,
          avg: 500000,
          median: 500000,
          count: 1,
          runtimeSize: 2048,
        });
        assert.ok(contract.functions !== null, "functions should not be null");
        assert.deepEqual(contract.functions.transfer, {
          min: 25000,
          max: 25000,
          avg: 25000,
          median: 25000,
          count: 1,
        });
      });

      it("should set deployment to null when contract has only function calls", () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/Token.sol:Token",
          functionSig: "balanceOf(address)",
          gas: 15000,
          proxyChain: [],
        });
        const stats = manager._calculateGasStats();
        const result = manager._generateGasStatsJson(stats);

        const contract = result.contracts["contracts/Token.sol:Token"];
        assert.ok(contract !== undefined, "contract entry should exist");
        assert.equal(contract.deployment, null);
        assert.ok(contract.functions !== null, "functions should not be null");
      });

      it("should set functions to null when contract has only deployments", () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        manager.addGasMeasurement({
          type: "deployment",
          contractFqn: "project/contracts/Factory.sol:Factory",
          gas: 300000,
          runtimeSize: 1024,
        });
        const stats = manager._calculateGasStats();
        const result = manager._generateGasStatsJson(stats);

        const contract = result.contracts["contracts/Factory.sol:Factory"];
        assert.ok(contract !== undefined, "contract entry should exist");
        assert.ok(
          contract.deployment !== null,
          "deployment should not be null",
        );
        assert.equal(contract.functions, null);
      });

      it("should sort contracts alphabetically by user-friendly FQN", () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        manager.addGasMeasurement({
          type: "deployment",
          contractFqn: "project/contracts/ZContract.sol:ZContract",
          gas: 100000,
          runtimeSize: 512,
        });
        manager.addGasMeasurement({
          type: "deployment",
          contractFqn: "project/contracts/AContract.sol:AContract",
          gas: 200000,
          runtimeSize: 512,
        });
        const stats = manager._calculateGasStats();
        const result = manager._generateGasStatsJson(stats);

        const keys = Object.keys(result.contracts);
        assert.equal(keys[0], "contracts/AContract.sol:AContract");
        assert.equal(keys[1], "contracts/ZContract.sol:ZContract");
      });

      it("should sort functions alphabetically within a contract", () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/Token.sol:Token",
          functionSig: "transfer(address,uint256)",
          gas: 25000,
          proxyChain: [],
        });
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/Token.sol:Token",
          functionSig: "approve(address,uint256)",
          gas: 46000,
          proxyChain: [],
        });
        const stats = manager._calculateGasStats();
        const result = manager._generateGasStatsJson(stats);

        const tokenContract = result.contracts["contracts/Token.sol:Token"];
        assert.ok(tokenContract !== undefined, "token contract should exist");
        assert.ok(
          tokenContract.functions !== null,
          "functions should not be null",
        );
        const fns = Object.keys(tokenContract.functions);
        assert.equal(fns[0], "approve");
        assert.equal(fns[1], "transfer");
      });

      it("should use full signatures as keys for overloaded functions", () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/Token.sol:Token",
          functionSig: "transfer(address,uint256)",
          gas: 25000,
          proxyChain: [],
        });
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/Token.sol:Token",
          functionSig: "transfer(address,uint256,bytes)",
          gas: 35000,
          proxyChain: [],
        });
        const stats = manager._calculateGasStats();
        const result = manager._generateGasStatsJson(stats);

        const overloadedContract =
          result.contracts["contracts/Token.sol:Token"];
        assert.ok(overloadedContract !== undefined, "contract should exist");
        assert.ok(
          overloadedContract.functions !== null,
          "functions should not be null",
        );
        assert.ok(
          "transfer(address,uint256)" in overloadedContract.functions,
          "overloaded function should use full signature",
        );
        assert.ok(
          "transfer(address,uint256,bytes)" in overloadedContract.functions,
          "overloaded function should use full signature",
        );
      });

      it("should strip project/ prefix from contract keys via getUserFqn", () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        manager.addGasMeasurement({
          type: "deployment",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          gas: 100000,
          runtimeSize: 512,
        });
        const stats = manager._calculateGasStats();
        const result = manager._generateGasStatsJson(stats);

        assert.ok(
          "contracts/MyContract.sol:MyContract" in result.contracts,
          "key should not have project/ prefix",
        );
        assert.ok(
          !("project/contracts/MyContract.sol:MyContract" in result.contracts),
          "key with project/ prefix should not exist",
        );
      });

      it("should strip npm package version from contract keys", () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        manager.addGasMeasurement({
          type: "function",
          contractFqn:
            "npm/@openzeppelin/contracts@5.0.0/token/ERC20/ERC20.sol:ERC20",
          functionSig: "approve(address,uint256)",
          gas: 46200,
          proxyChain: [],
        });
        const stats = manager._calculateGasStats();
        const result = manager._generateGasStatsJson(stats);

        const key = "@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20";
        assert.ok(key in result.contracts, "key should not have npm version");
        const erc20Contract = result.contracts[key];
        assert.ok(erc20Contract !== undefined, "ERC20 contract should exist");
        assert.equal(
          erc20Contract.sourceName,
          "@openzeppelin/contracts/token/ERC20/ERC20.sol",
        );
        assert.equal(erc20Contract.contractName, "ERC20");
      });

      it("should match artifact format — FQN key equals getFullyQualifiedName(sourceName, contractName)", () => {
        const sourceName = "contracts/MyToken.sol";
        const contractName = "MyToken";
        const internalFqn = `project/${sourceName}:${contractName}`;

        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        manager.addGasMeasurement({
          type: "deployment",
          contractFqn: internalFqn,
          gas: 250000,
          runtimeSize: 1024,
        });
        const stats = manager._calculateGasStats();
        const result = manager._generateGasStatsJson(stats);

        const expectedKey = getFullyQualifiedName(sourceName, contractName);
        const contract = result.contracts[expectedKey];

        assert.ok(
          contract !== undefined,
          `contract should exist at key ${expectedKey}`,
        );
        assert.equal(contract.sourceName, sourceName);
        assert.equal(contract.contractName, contractName);
      });

      it("should include proxyChain in JSON output and use display key", () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        manager.addGasMeasurement({
          type: "deployment",
          contractFqn: "project/contracts/Impl.sol:Impl",
          gas: 500000,
          runtimeSize: 2048,
        });
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/Impl.sol:Impl",
          functionSig: "foo()",
          gas: 10000,
          proxyChain: [],
        });
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/Impl.sol:Impl",
          functionSig: "foo()",
          gas: 20000,
          proxyChain: [
            "project/contracts/Proxies.sol:Proxy",
            "project/contracts/Impl.sol:Impl",
          ],
        });

        const stats = manager._calculateGasStats();
        const result = manager._generateGasStatsJson(stats);

        const directContract = result.contracts["contracts/Impl.sol:Impl"];
        assert.ok(directContract !== undefined, "direct entry should exist");
        assert.deepEqual(directContract.proxyChain, []);
        assert.equal(directContract.sourceName, "contracts/Impl.sol");
        assert.equal(directContract.contractName, "Impl");

        const proxiedContract =
          result.contracts[
            "contracts/Impl.sol:Impl (via contracts/Proxies.sol:Proxy)"
          ];
        assert.ok(proxiedContract !== undefined, "proxied entry should exist");
        assert.deepEqual(proxiedContract.proxyChain, [
          "contracts/Proxies.sol:Proxy",
          "contracts/Impl.sol:Impl",
        ]);
        assert.equal(proxiedContract.sourceName, "contracts/Impl.sol");
        assert.equal(proxiedContract.contractName, "Impl");
        assert.ok(
          proxiedContract.deployment !== null,
          "proxied entry should have duplicated deployment stats",
        );
      });
    });

    describe("writeGasStatsJson", () => {
      afterEach(async () => {
        await emptyDir(tmpDir);
      });

      it("should throw if outputPath is a directory", async () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        await assertRejectsWithHardhatError(
          manager.writeGasStatsJson(tmpDir, "test-id"),
          HardhatError.ERRORS.CORE.BUILTIN_TASKS.INVALID_FILE_PATH,
          { path: tmpDir },
        );
      });

      it("should write JSON file at the specified path", async () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          functionSig: "transfer(address,uint256)",
          gas: 25000,
          proxyChain: [],
        });
        await manager.saveGasMeasurements("test-id");

        const outputPath = path.join(tmpDir, "gas-output.json");
        await manager.writeGasStatsJson(outputPath, "test-id");

        const json = await readJsonFile<GasStatsJson>(outputPath);
        assert.ok(
          "contracts/MyContract.sol:MyContract" in json.contracts,
          "output should contain the contract",
        );
        const writtenContract =
          json.contracts["contracts/MyContract.sol:MyContract"];
        assert.ok(
          writtenContract !== undefined,
          "contract should exist in output",
        );
        assert.ok(
          writtenContract.functions !== null,
          "functions should not be null",
        );
        assert.deepEqual(writtenContract.functions.transfer, {
          min: 25000,
          max: 25000,
          avg: 25000,
          median: 25000,
          count: 1,
        });
      });

      it("should create parent directories if they do not exist", async () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        manager.addGasMeasurement({
          type: "deployment",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          gas: 500000,
          runtimeSize: 2048,
        });
        await manager.saveGasMeasurements("test-id");

        const outputPath = path.join(
          tmpDir,
          "nested",
          "deep",
          "gas-output.json",
        );
        await manager.writeGasStatsJson(outputPath, "test-id");

        const json = await readJsonFile<GasStatsJson>(outputPath);
        assert.ok(
          "contracts/MyContract.sol:MyContract" in json.contracts,
          "written JSON should contain the contract",
        );
      });

      it("should resolve a relative path against process.cwd()", async () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          functionSig: "transfer(address,uint256)",
          gas: 25000,
          proxyChain: [],
        });
        await manager.saveGasMeasurements("test-id");

        const originalCwd = process.cwd();
        process.chdir(tmpDir);
        try {
          await manager.writeGasStatsJson("relative-output.json", "test-id");
        } finally {
          process.chdir(originalCwd);
        }

        const expectedPath = path.join(tmpDir, "relative-output.json");
        const json = await readJsonFile<GasStatsJson>(expectedPath);
        assert.ok(
          "contracts/MyContract.sol:MyContract" in json.contracts,
          "output should contain the contract",
        );
      });

      it("should not write file when report is disabled", async () => {
        const manager = new GasAnalyticsManagerImplementation(tmpDir);
        manager.addGasMeasurement({
          type: "function",
          contractFqn: "project/contracts/MyContract.sol:MyContract",
          functionSig: "transfer(address,uint256)",
          gas: 25000,
          proxyChain: [],
        });
        await manager.saveGasMeasurements("test-id");

        manager.disableReport();
        const outputPath = path.join(tmpDir, "should-not-exist.json");
        await manager.writeGasStatsJson(outputPath, "test-id");

        const files = await getAllFilesMatching(tmpDir, (f) =>
          f.endsWith("should-not-exist.json"),
        );
        assert.equal(files.length, 0, "file should not have been written");
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

    describe("makeGroupKey", () => {
      it("should return contractFqn for empty proxyChain", () => {
        assert.equal(
          makeGroupKey("project/contracts/A.sol:A", []),
          "project/contracts/A.sol:A",
        );
      });

      it("should include proxyChain in key separated by null bytes", () => {
        assert.equal(
          makeGroupKey("project/contracts/A.sol:A", ["Proxy", "A"]),
          "project/contracts/A.sol:A\0Proxy\0A",
        );
      });

      it("should produce different keys for different proxy chains", () => {
        const key1 = makeGroupKey("project/contracts/A.sol:A", ["Proxy", "A"]);
        const key2 = makeGroupKey("project/contracts/A.sol:A", [
          "Proxy2",
          "Proxy",
          "A",
        ]);
        assert.notEqual(key1, key2);
      });
    });

    describe("getDisplayKey", () => {
      it("should return userFqn for empty proxyChain", () => {
        assert.equal(
          getDisplayKey("contracts/A.sol:A", []),
          "contracts/A.sol:A",
        );
      });

      it("should strip implementation and format single proxy", () => {
        assert.equal(
          getDisplayKey("contracts/Impl.sol:Impl", [
            "project/contracts/Proxies.sol:Proxy",
            "project/contracts/Impl.sol:Impl",
          ]),
          "contracts/Impl.sol:Impl (via contracts/Proxies.sol:Proxy)",
        );
      });

      it("should strip implementation and format multiple proxies", () => {
        assert.equal(
          getDisplayKey("contracts/Impl.sol:Impl", [
            "project/contracts/Proxies.sol:Proxy2",
            "project/contracts/Proxies.sol:Proxy",
            "project/contracts/Impl.sol:Impl",
          ]),
          "contracts/Impl.sol:Impl (via contracts/Proxies.sol:Proxy2 → contracts/Proxies.sol:Proxy)",
        );
      });

      it("should return userFqn when proxyChain has only the implementation", () => {
        assert.equal(
          getDisplayKey("contracts/Impl.sol:Impl", [
            "project/contracts/Impl.sol:Impl",
          ]),
          "contracts/Impl.sol:Impl",
        );
      });
    });

    describe("getProxyLabel", () => {
      it("should return undefined for empty proxyChain", () => {
        assert.equal(getProxyLabel([]), undefined);
      });

      it("should return undefined when only implementation in chain", () => {
        assert.equal(
          getProxyLabel(["project/contracts/Impl.sol:Impl"]),
          undefined,
        );
      });

      it("should format single proxy and strip project/ prefix", () => {
        assert.equal(
          getProxyLabel([
            "project/contracts/Proxies.sol:Proxy",
            "project/contracts/Impl.sol:Impl",
          ]),
          "(via contracts/Proxies.sol:Proxy)",
        );
      });

      it("should format multiple proxies and strip project/ prefix", () => {
        assert.equal(
          getProxyLabel([
            "project/contracts/Proxies.sol:Proxy2",
            "project/contracts/Proxies.sol:Proxy",
            "project/contracts/Impl.sol:Impl",
          ]),
          "(via contracts/Proxies.sol:Proxy2 → contracts/Proxies.sol:Proxy)",
        );
      });

      it("should strip npm package version from proxy names", () => {
        assert.equal(
          getProxyLabel([
            "npm/@openzeppelin/contracts@5.0.0/proxy/Proxy.sol:Proxy",
            "project/contracts/Impl.sol:Impl",
          ]),
          "(via @openzeppelin/contracts/proxy/Proxy.sol:Proxy)",
        );
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
  });
});
