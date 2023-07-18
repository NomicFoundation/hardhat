/* eslint-disable import/no-unused-modules */
import { defineModule } from "@ignored/ignition-core";
import { assert } from "chai";

import { useEphemeralIgnitionProject } from "./use-ignition-project";

describe("calls", () => {
  useEphemeralIgnitionProject("minimal-new-api");

  it("should be able to call contracts", async function () {
    const moduleDefinition = defineModule("SetAddressModule", (m) => {
      const bar = m.contract("Bar");
      const usesContract = m.contract("UsesContract", [
        "0x0000000000000000000000000000000000000000",
      ]);

      m.call(usesContract, "setAddress", [bar]);

      return { bar, usesContract };
    });

    const result = await this.deploy(moduleDefinition);

    assert.isDefined(result.bar);
    assert.isDefined(result.usesContract);

    const usedAddress = await result.usesContract.contractAddress();

    assert.equal(usedAddress, result.bar.address);
  });

  it("should be able to call contracts with array args", async function () {
    const moduleDefinition = defineModule("ArrayArgModule", (m) => {
      const captureArraysContract = m.contract("CaptureArraysContract");

      m.call(captureArraysContract, "recordArrays", [
        [1, 2, 3],
        ["a", "b", "c"],
        [true, false, true],
      ]);

      return { captureArraysContract };
    });

    const result = await this.deploy(moduleDefinition);

    assert.isDefined(result.captureArraysContract);

    const captureSuceeded = await result.captureArraysContract.arraysCaptured();

    assert(captureSuceeded);
  });

  it("should be able to call contracts with arrays nested in objects args", async function () {
    const moduleDefinition = defineModule("ArrayNestedModule", (m) => {
      const captureComplexObjectContract = m.contract(
        "CaptureComplexObjectContract"
      );

      m.call(captureComplexObjectContract, "testComplexObject", [
        {
          firstBool: true,
          secondArray: [1, 2, 3],
          thirdSubcomplex: { sub: "sub" },
        },
      ]);

      return { captureComplexObjectContract };
    });

    const result = await this.deploy(moduleDefinition);

    assert.isDefined(result.captureComplexObjectContract);

    const captureSuceeded =
      await result.captureComplexObjectContract.complexArgCaptured();

    assert(captureSuceeded);
  });

  it("should be able to make calls in order", async function () {
    const moduleDefinition = defineModule("OrderedModule", (m) => {
      const trace = m.contract("Trace", ["first"]);

      const second = m.call(trace, "addEntry", ["second"], { id: "AddEntry1" });

      m.call(trace, "addEntry", ["third"], {
        id: "AddEntry2",
        after: [second],
      });

      return { trace };
    });

    const result = await this.deploy(moduleDefinition);

    assert.isDefined(result.trace);

    const entry1 = await result.trace.entries(0);
    const entry2 = await result.trace.entries(1);
    const entry3 = await result.trace.entries(2);

    assert.deepStrictEqual(
      [entry1, entry2, entry3],
      ["first", "second", "third"]
    );
  });

  describe("passing value", () => {
    it("should be able to call a contract passing a value", async function () {
      const moduleDefinition = defineModule("PassingValue", (m) => {
        const passingValue = m.contract("PassingValue");

        m.call(passingValue, "deposit", [], {
          value: BigInt(this.hre.ethers.utils.parseEther("1").toString()),
        });

        return { passingValue };
      });

      const result = await this.deploy(moduleDefinition);

      assert.isDefined(result.passingValue);

      const actualInstanceBalance = await this.hre.ethers.provider.getBalance(
        result.passingValue.address
      );

      assert.equal(
        actualInstanceBalance.toString(),
        this.hre.ethers.utils.parseEther("1").toString()
      );
    });

    it("should be able to call a contract passing a value via a parameter", async function () {
      const submoduleDefinition = defineModule("Submodule", (m) => {
        // const depositValue = m.getParameter("depositValue", 1000);

        const passingValue = m.contract("PassingValue");

        m.call(passingValue, "deposit", [], {
          // TODO: bring back passing this by parameter
          value: BigInt(this.hre.ethers.utils.parseEther("1")),
        });

        return { passingValue };
      });

      const moduleDefinition = defineModule("Module", (m) => {
        const { passingValue } = m.useModule(submoduleDefinition);

        return { passingValue };
      });

      const result = await this.deploy(moduleDefinition, {
        Module: {
          depositValue: BigInt(this.hre.ethers.utils.parseEther("1")),
        },
      });

      assert.isDefined(result.passingValue);

      const actualInstanceBalance = await this.hre.ethers.provider.getBalance(
        result.passingValue.address
      );

      assert.equal(
        actualInstanceBalance.toString(),
        this.hre.ethers.utils.parseEther("1").toString()
      );
    });
  });

  it("should note fail if call fails");
});
