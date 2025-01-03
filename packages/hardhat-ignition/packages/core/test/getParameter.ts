/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { buildModule } from "../src/build-module";
import { ModuleParameterRuntimeValueImplementation } from "../src/internal/module";
import { SolidityParameterType } from "../src/types/module";

import { assertInstanceOf } from "./helpers";

describe("getParameter", () => {
  describe("Without default value", function () {
    it("should return the correct RuntimeValue", () => {
      const mod = buildModule("MyModule", (m) => {
        const p = m.getParameter("p");

        const contract = m.contract("Contract", [p]);

        return { contract };
      });

      const param = mod.results.contract.constructorArgs[0];
      assertInstanceOf(param, ModuleParameterRuntimeValueImplementation);
      assert.equal(param.name, "p");
      assert.equal(param.defaultValue, undefined);
    });
  });

  describe("With default value", function () {
    it("should accept base values as default", () => {
      const mod = buildModule("MyModule", (m) => {
        const s = m.getParameter("string", "default");
        const n = m.getParameter("number", 1);
        const bi = m.getParameter("bigint", 1n);
        const b = m.getParameter("boolean", true);

        const contract = m.contract("Contract", [s, n, bi, b]);

        return { contract };
      });

      const isS = mod.results.contract.constructorArgs[0];
      const isN = mod.results.contract.constructorArgs[1];
      const isBi = mod.results.contract.constructorArgs[2];
      const isB = mod.results.contract.constructorArgs[3];

      assertInstanceOf(isS, ModuleParameterRuntimeValueImplementation);
      assert.equal(isS.name, "string");
      assert.equal(isS.defaultValue, "default");

      assertInstanceOf(isN, ModuleParameterRuntimeValueImplementation);
      assert.equal(isN.name, "number");
      assert.equal(isN.defaultValue, 1);

      assertInstanceOf(isBi, ModuleParameterRuntimeValueImplementation);
      assert.equal(isBi.name, "bigint");
      assert.equal(isBi.defaultValue, 1n);

      assertInstanceOf(isB, ModuleParameterRuntimeValueImplementation);
      assert.equal(isB.name, "boolean");
      assert.equal(isB.defaultValue, true);
    });

    it("Should accept arrays as deafult", () => {
      const defaultValue: SolidityParameterType = [1, "dos", 3n, false];
      const mod = buildModule("MyModule", (m) => {
        const p = m.getParameter("p", defaultValue);

        const contract = m.contract("Contract", [p]);

        return { contract };
      });

      const param = mod.results.contract.constructorArgs[0];
      assertInstanceOf(param, ModuleParameterRuntimeValueImplementation);
      assert.equal(param.name, "p");
      assert.deepEqual(param.defaultValue, defaultValue);
    });

    it("Should accept objects as deafult", () => {
      const defaultValue: SolidityParameterType = { a: 1, b: "dos", c: 3n };
      const mod = buildModule("MyModule", (m) => {
        const p = m.getParameter("p", defaultValue);

        const contract = m.contract("Contract", [p]);

        return { contract };
      });

      const param = mod.results.contract.constructorArgs[0];
      assertInstanceOf(param, ModuleParameterRuntimeValueImplementation);
      assert.equal(param.name, "p");
      assert.deepEqual(param.defaultValue, defaultValue);
    });

    it("Should accept complex combinations as default", () => {
      const defaultValue: SolidityParameterType = {
        arr: [123, { a: [{ o: true }] }],
      };
      const mod = buildModule("MyModule", (m) => {
        const p = m.getParameter("p", defaultValue);

        const contract = m.contract("Contract", [p]);

        return { contract };
      });

      const param = mod.results.contract.constructorArgs[0];
      assertInstanceOf(param, ModuleParameterRuntimeValueImplementation);
      assert.equal(param.name, "p");
      assert.deepEqual(param.defaultValue, defaultValue);
    });

    it("should accept account runtime values as default", () => {
      const mod = buildModule("MyModule", (m) => {
        const p = m.getParameter("p", m.getAccount(1));

        const contract = m.contract("Contract", [p]);

        return { contract };
      });

      const param = mod.results.contract.constructorArgs[0];
      assertInstanceOf(param, ModuleParameterRuntimeValueImplementation);
      assert.equal(param.name, "p");
      assert.deepEqual(param.defaultValue, {
        accountIndex: 1,
        type: "ACCOUNT",
      });
    });
  });
});
