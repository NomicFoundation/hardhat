/* eslint-disable import/no-unused-modules */
import { buildModule } from "@ignored/ignition-core";
import { assert } from "chai";

import { deployModule } from "./helpers";
import { useEnvironment } from "./useEnvironment";

describe.skip("calls", () => {
  useEnvironment("minimal");

  it("should be able to call contracts", async function () {
    const result = await deployModule(this.hre, (m) => {
      const bar = m.contract("Bar");
      const usesContract = m.contract("UsesContract", {
        args: ["0x0000000000000000000000000000000000000000"],
      });

      m.call(usesContract, "setAddress", {
        args: [bar],
      });

      return { bar, usesContract };
    });

    assert.isDefined(result.bar);
    assert.isDefined(result.usesContract);

    const usedAddress = await result.usesContract.contractAddress();

    assert.equal(usedAddress, result.bar.address);
  });

  it("should be able to call contracts with array args", async function () {
    const result = await deployModule(this.hre, (m) => {
      const captureArraysContract = m.contract("CaptureArraysContract");

      m.call(captureArraysContract, "recordArrays", {
        args: [
          [1, 2, 3],
          ["a", "b", "c"],
          [true, false, true],
        ],
      });

      return { captureArraysContract };
    });

    assert.isDefined(result.captureArraysContract);

    const captureSuceeded = await result.captureArraysContract.arraysCaptured();

    assert(captureSuceeded);
  });

  it("should be able to call contracts with arrays nested in objects args", async function () {
    const result = await deployModule(this.hre, (m) => {
      const captureComplexObjectContract = m.contract(
        "CaptureComplexObjectContract"
      );

      m.call(captureComplexObjectContract, "testComplexObject", {
        args: [
          {
            firstBool: true,
            secondArray: [1, 2, 3],
            thirdSubcomplex: { sub: "sub" },
          },
        ],
      });

      return { captureComplexObjectContract };
    });

    assert.isDefined(result.captureComplexObjectContract);

    const captureSuceeded =
      await result.captureComplexObjectContract.complexArgCaptured();

    assert(captureSuceeded);
  });

  it("should be able to make calls in order", async function () {
    const result = await deployModule(this.hre, (m) => {
      const trace = m.contract("Trace", {
        args: ["first"],
      });

      const second = m.call(trace, "addEntry", {
        args: ["second"],
      });

      m.call(trace, "addEntry", {
        args: ["third"],
        after: [second],
      });

      return { trace };
    });

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
      const result = await deployModule(this.hre, (m) => {
        const passingValue = m.contract("PassingValue");

        m.call(passingValue, "deposit", {
          args: [],
          value: this.hre.ethers.utils.parseEther("1"),
        });

        return { passingValue };
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

    it("should be able to call a contract passing a value via a parameter", async function () {
      const submodule = buildModule("submodule", (m) => {
        const depositValue = m.getParam("depositValue");

        const passingValue = m.contract("PassingValue");

        m.call(passingValue, "deposit", {
          args: [],
          value: depositValue,
        });

        return { passingValue };
      });

      const result = await deployModule(this.hre, (m) => {
        const { passingValue } = m.useModule(submodule, {
          parameters: {
            depositValue: this.hre.ethers.utils.parseEther("1"),
          },
        });

        return { passingValue };
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
