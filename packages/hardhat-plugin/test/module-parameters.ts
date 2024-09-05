/* eslint-disable import/no-unused-modules */

import { assert } from "chai";

import { useEphemeralIgnitionProject } from "./test-helpers/use-ignition-project";

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
        }
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
        }
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
        }
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
          }
        ),
        /Could not find a module file at the path: .\/ignition\/modules\/nonexistant.ts/
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
          }
        ),
        /Could not find a module file at the path: .\/ignition\/modules\/nonexistant.ts/
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
          }
        ),
        /Parameter "unlockTime" exceeds maximum safe integer size. Encode the value as a string using bigint notation: `\${value}n`/
      );
    });
  });
});
