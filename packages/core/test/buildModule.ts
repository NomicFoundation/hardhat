/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { buildModule } from "../src/buildModule";

describe("buildModule", () => {
  const values = [
    [42, "number"],
    ["thanks for all the fish", "string"],
    [{}, "object"],
    [[], "object"],
    [() => {}, "function"],
    [undefined, "undefined"],
    [null, "null"],
  ];

  describe("param validation", () => {
    it("should only allow a string to be passed as `moduleName`", () => {
      for (const [value, type] of values) {
        if (type === "string") {
          // @ts-ignore
          assert.doesNotThrow(() => buildModule(value, () => {}));
        } else {
          assert.throws(
            // @ts-ignore
            () => buildModule(value, () => {}),
            /`moduleName` must be a string/
          );
        }
      }
    });

    it("should only allow a function to be passed as `moduleAction`", () => {
      for (const [value, type] of values) {
        if (type === "function") {
          // @ts-ignore
          assert.doesNotThrow(() => buildModule("", value));
        } else {
          assert.throws(
            // @ts-ignore
            () => buildModule("", value),
            /`moduleAction` must be a function/
          );
        }
      }
    });
  });
});
