/* eslint-disable import/no-unused-modules */
import { buildModule } from "@ignored/hardhat-vnext-ignition-core";
import { assert } from "chai";

import { useEphemeralIgnitionProject } from "./test-helpers/use-ignition-project.js";

describe("module parameters", () => {
  describe("a standard hardhat project", () => {
    useEphemeralIgnitionProject("lock");

    it("should run if provided with a valid module parameters file", async function () {
      await this.hre.run(
        {
          scope: "ignition",
          task: "deploy",
        },
        {
          modulePath: "./ignition/modules/Lock.ts",
          parameters: "./ignition/modules/parameters.json",
        },
      );
    });

    it("should run if provided with a valid module parameters file in JSON5 format", async function () {
      await this.hre.run(
        {
          scope: "ignition",
          task: "deploy",
        },
        {
          modulePath: "./ignition/modules/Lock.ts",
          parameters: "./ignition/modules/parameters-json5.json5",
        },
      );
    });

    it("should run if provided with a valid module parameters file encoding a bigint as a string", async function () {
      await this.hre.run(
        {
          scope: "ignition",
          task: "deploy",
        },
        {
          modulePath: "./ignition/modules/Lock.ts",
          parameters: "./ignition/modules/parameters-bigints-as-strings.json",
        },
      );
    });

    it("should fail if the module path is invalid", async function () {
      await assert.isRejected(
        this.hre.run(
          {
            scope: "ignition",
            task: "deploy",
          },
          {
            modulePath: "./ignition/modules/nonexistant.ts",
          },
        ),
        /Could not find a module file at the path: .\/ignition\/modules\/nonexistant.ts/,
      );
    });

    it("should fail if the module parameters path is invalid", async function () {
      await assert.isRejected(
        this.hre.run(
          {
            scope: "ignition",
            task: "deploy",
          },
          {
            modulePath: "./ignition/modules/nonexistant.ts",
            parameters: "./ignition/modules/nonexistant.json",
          },
        ),
        /Could not find a module file at the path: .\/ignition\/modules\/nonexistant.ts/,
      );
    });

    it("should fail if parameters file number is larger than allowed", async function () {
      await assert.isRejected(
        this.hre.run(
          {
            scope: "ignition",
            task: "deploy",
          },
          {
            modulePath: "./ignition/modules/Lock.ts",
            parameters: "./ignition/modules/parameters-too-large.json",
          },
        ),
        /Parameter "unlockTime" exceeds maximum safe integer size. Encode the value as a string using bigint notation: `\${value}n`/,
      );
    });

    it("should use a global parameter if no module parameter is available", async function () {
      const ignitionModule = buildModule("Test", (m) => {
        const unlockTime = m.getParameter("unlockTime");

        const lock = m.contract("Lock", [unlockTime]);

        return { lock };
      });

      const result = await this.hre.ignition.deploy(ignitionModule, {
        parameters: { $global: { unlockTime: 1893499200000 } },
      });

      assert.equal(await result.lock.read.unlockTime(), 1893499200000);
    });

    it("should use a global parameter instead of the default value", async function () {
      const ignitionModule = buildModule("Test", (m) => {
        const unlockTime = m.getParameter("unlockTime", 100);

        const lock = m.contract("Lock", [unlockTime]);

        return { lock };
      });

      const result = await this.hre.ignition.deploy(ignitionModule, {
        parameters: { $global: { unlockTime: 1893499200000 } },
      });

      assert.equal(await result.lock.read.unlockTime(), 1893499200000);
    });

    it("should use the module parameter even if global parameters exist but not that specific parameter", async function () {
      const ignitionModule = buildModule("Test", (m) => {
        const unlockTime = m.getParameter("moduleLevelParam");

        const lock = m.contract("Lock", [unlockTime]);

        return { lock };
      });

      const result = await this.hre.ignition.deploy(ignitionModule, {
        parameters: {
          $global: { globalLevelParam: "should-not-be-read" },
          Test: {
            moduleLevelParam: 1893499200000,
          },
        },
      });

      assert.equal(await result.lock.read.unlockTime(), 1893499200000);
    });

    it("should use the global parameter even if module parameters exist but not that specific parameter", async function () {
      const ignitionModule = buildModule("Test", (m) => {
        const unlockTime = m.getParameter("globalLevelParam");

        const lock = m.contract("Lock", [unlockTime]);

        return { lock };
      });

      const result = await this.hre.ignition.deploy(ignitionModule, {
        parameters: {
          $global: { globalLevelParam: 1893499200000 },
          Test: {
            moduleLevelParam: "should-not-be-read",
          },
        },
      });

      assert.equal(await result.lock.read.unlockTime(), 1893499200000);
    });

    it("should use a module parameter instead of a global parameter if both are present", async function () {
      const ignitionModule = buildModule("Test", (m) => {
        const unlockTime = m.getParameter("unlockTime", 100);

        const lock = m.contract("Lock", [unlockTime]);

        return { lock };
      });

      const result = await this.hre.ignition.deploy(ignitionModule, {
        parameters: {
          $global: { unlockTime: 1893499200000 },
          Test: { unlockTime: 9876543210000 },
        },
      });

      assert.equal(await result.lock.read.unlockTime(), 9876543210000);
    });
  });
});
