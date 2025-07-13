import { buildModule } from "@nomicfoundation/ignition-core";
import { assert } from "chai";

import { getBalanceFor } from "../test-helpers/get-balance-for.js";
import { useEphemeralIgnitionProject } from "../test-helpers/use-ignition-project.js";

describe("calls", () => {
  useEphemeralIgnitionProject("minimal");

  it("should be able to call contracts", async function () {
    const moduleDefinition = buildModule("SetAddressModule", (m) => {
      const bar = m.contract("Bar");
      const usesContract = m.contract("UsesContract", [
        "0x0000000000000000000000000000000000000000",
      ]);

      m.call(usesContract, "setAddress", [bar]);

      return { bar, usesContract };
    });

    const result = await this.ignition.deploy(moduleDefinition);

    assert.isDefined(result.bar);
    assert.isDefined(result.usesContract);

    const usedAddress =
      (await result.usesContract.read.contractAddress()) as string;

    assert.equal(usedAddress.toLowerCase(), result.bar.address.toLowerCase());
  });

  it("should be able to call contracts with array args", async function () {
    const moduleDefinition = buildModule("ArrayArgModule", (m) => {
      const captureArraysContract = m.contract("CaptureArraysContract");

      m.call(captureArraysContract, "recordArrays", [
        [1, 2, 3],
        ["a", "b", "c"],
        [true, false, true],
      ]);

      return { captureArraysContract };
    });

    const result = await this.ignition.deploy(moduleDefinition);

    assert.isDefined(result.captureArraysContract);

    const captureSucceeded =
      await result.captureArraysContract.read.arraysCaptured();

    assert(captureSucceeded === true);
  });

  it("should be able to call contracts with arrays nested in objects args", async function () {
    const moduleDefinition = buildModule("ArrayNestedModule", (m) => {
      const captureComplexObjectContract = m.contract(
        "CaptureComplexObjectContract",
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

    const result = await this.ignition.deploy(moduleDefinition);

    assert.isDefined(result.captureComplexObjectContract);

    const captureSucceeded =
      await result.captureComplexObjectContract.read.complexArgCaptured();

    assert(captureSucceeded === true);
  });

  it("should be able to make calls in order", async function () {
    const moduleDefinition = buildModule("OrderedModule", (m) => {
      const trace = m.contract("Trace", ["first"]);

      const second = m.call(trace, "addEntry", ["second"], { id: "AddEntry1" });

      m.call(trace, "addEntry", ["third"], {
        id: "AddEntry2",
        after: [second],
      });

      return { trace };
    });

    const result = await this.ignition.deploy(moduleDefinition);

    assert.isDefined(result.trace);

    const entry1 = await result.trace.read.entries([0n]);
    const entry2 = await result.trace.read.entries([1n]);
    const entry3 = await result.trace.read.entries([2n]);

    assert.deepStrictEqual(
      [entry1, entry2, entry3],
      ["first", "second", "third"],
    );
  });

  describe("passing value", () => {
    it("should be able to call a contract passing a value", async function () {
      const moduleDefinition = buildModule("PassingValue", (m) => {
        const passingValue = m.contract("PassingValue");

        m.call(passingValue, "deposit", [], {
          value: 1_000_000_000n,
        });

        return { passingValue };
      });

      const result = await this.ignition.deploy(moduleDefinition);

      assert.isDefined(result.passingValue);

      const actualInstanceBalance = await getBalanceFor(
        this.connection,
        result.passingValue.address,
      );

      assert.equal(actualInstanceBalance, 1_000_000_000n);
    });

    it("should be able to call a contract passing a value via a parameter", async function () {
      const submoduleDefinition = buildModule("Submodule", (m) => {
        const depositValue = m.getParameter("depositValue", 1000n);

        const passingValue = m.contract("PassingValue");

        m.call(passingValue, "deposit", [], {
          value: depositValue,
        });

        return { passingValue };
      });

      const moduleDefinition = buildModule("Module", (m) => {
        const { passingValue } = m.useModule(submoduleDefinition);

        return { passingValue };
      });

      const result = await this.ignition.deploy(moduleDefinition, {
        parameters: {
          Submodule: {
            depositValue: 1_000_000_000n,
          },
        },
      });

      assert.isDefined(result.passingValue);

      const actualInstanceBalance = await getBalanceFor(
        this.connection,
        result.passingValue.address,
      );

      assert.equal(actualInstanceBalance, 1_000_000_000n);
    });
  });
});
