import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyValidRemapping,
  formatRemapping,
  parseRemappingString,
  selectBestRemapping,
} from "../../../../../../src/internal/builtin-plugins/solidity/build-system/resolver/remappings.js";

describe("Remappings", () => {
  describe("parseRemappingString", () => {
    it("Should parse valid remappings correctly", () => {
      assert.deepEqual(parseRemappingString("a:b=c"), {
        context: "a",
        prefix: "b",
        target: "c",
      });

      assert.deepEqual(parseRemappingString("a:b="), {
        context: "a",
        prefix: "b",
        target: "",
      });

      assert.deepEqual(parseRemappingString("a:/="), {
        context: "a",
        prefix: "/",
        target: "",
      });

      assert.deepEqual(parseRemappingString(":b=c"), {
        context: "",
        prefix: "b",
        target: "c",
      });

      assert.deepEqual(parseRemappingString("b=c"), {
        context: "",
        prefix: "b",
        target: "c",
      });

      assert.deepEqual(parseRemappingString("b="), {
        context: "",
        prefix: "b",
        target: "",
      });
    });

    it("Should return undefined on invalid remappings", () => {
      assert.equal(parseRemappingString("a:=c"), undefined);

      assert.equal(parseRemappingString("a:c"), undefined);

      assert.equal(parseRemappingString("a/c"), undefined);
    });
  });

  describe("selectBestRemapping", () => {
    describe("Without context", () => {
      it("Should select the remapping with the longest matching prefix", () => {
        const bestIndex = selectBestRemapping("from.sol", "directImport.sol", [
          { context: "", prefix: "from", target: "1" },
          { context: "", prefix: "dir", target: "2" },
          { context: "", prefix: "direct", target: "3" },
          { context: "", prefix: "directImp", target: "4" },
        ]);

        assert.equal(bestIndex, 3);
      });

      it("Should keep the last matching one if there are many", () => {
        const bestIndex = selectBestRemapping("from.sol", "directImport.sol", [
          { context: "", prefix: "direct", target: "1" },
          { context: "", prefix: "directImp", target: "2" },
          { context: "", prefix: "directImp", target: "3" },
        ]);

        assert.equal(bestIndex, 2);
      });

      it("Should return undefined if there are no matching remappings", () => {
        const bestIndex = selectBestRemapping("from.sol", "directImport.sol", [
          { context: "", prefix: "a", target: "1" },
          { context: "", prefix: "foo/", target: "2" },
          { context: "", prefix: "/not", target: "3" },
        ]);

        assert.equal(bestIndex, undefined);
      });
    });

    describe("With context", () => {
      it("Should select the remapping with the longest context whose prefix also matches", () => {
        const bestIndex = selectBestRemapping("from.sol", "directImport.sol", [
          { context: "", prefix: "d", target: "1" },
          { context: "f", prefix: "d", target: "2" },
          { context: "fr", prefix: "d", target: "3" },
          { context: "fr", prefix: "not", target: "4" },
          { context: "f", prefix: "d", target: "5" },
        ]);

        assert.deepEqual(bestIndex, 2);
      });

      it("If multiple match the context with equal length, select the remapping with the longest prefix that matches", () => {
        const bestIndex = selectBestRemapping("from.sol", "directImport.sol", [
          { context: "fr", prefix: "d", target: "1" },
          { context: "fr", prefix: "di", target: "2" },
          { context: "fr", prefix: "d", target: "3" },
        ]);

        assert.deepEqual(bestIndex, 1);
      });

      it("Context should have more priority than prefix", () => {
        const bestIndex = selectBestRemapping("from.sol", "directImport.sol", [
          { context: "f", prefix: "d", target: "1" },
          { context: "not", prefix: "directImport.sol", target: "2" },
        ]);

        assert.deepEqual(bestIndex, 0);
      });

      it("If there are multiple candidates pick the lastest one", () => {
        const bestIndex = selectBestRemapping("from.sol", "directImport.sol", [
          { context: "fr", prefix: "di", target: "1" },
          { context: "fr", prefix: "di", target: "2" },
          { context: "fr", prefix: "di", target: "3" },
        ]);

        assert.deepEqual(bestIndex, 2);
      });

      it("If no remapping matches the context, return undefined", () => {
        const bestIndex = selectBestRemapping("from.sol", "directImport.sol", [
          { context: "no", prefix: "directImport.sol", target: "1" },
          { context: "/", prefix: "di", target: "2" },
          { context: "boo", prefix: "di", target: "3" },
        ]);

        assert.deepEqual(bestIndex, undefined);
      });
    });
  });

  describe("Remappings application", () => {
    it("Should apply valid remappings (prefix matches) correctly", () => {
      assert.equal(
        applyValidRemapping("contracts/A.sol", {
          context: "",
          prefix: "contracts/",
          target: "lib/contracts/",
        }),
        "lib/contracts/A.sol",
      );

      assert.equal(
        applyValidRemapping("contracts/A.sol", {
          context: "",
          prefix: "con",
          target: "CON",
        }),
        "CONtracts/A.sol",
      );

      assert.equal(
        applyValidRemapping("contracts/A.sol", {
          context: "it-doesnt-matter",
          prefix: "contracts/",
          target: "",
        }),
        "A.sol",
      );
    });
  });

  describe("formatRemapping", () => {
    it("Should format remappings without context correctly", () => {
      assert.equal(
        formatRemapping({ context: "", prefix: "a", target: "b" }),
        "a=b",
      );

      assert.equal(
        formatRemapping({ context: "", prefix: "a", target: "" }),
        "a=",
      );
    });

    it("Should format remappings with context correctly", () => {
      assert.equal(
        formatRemapping({ context: "c", prefix: "a", target: "b" }),
        "c:a=b",
      );

      assert.equal(
        formatRemapping({ context: "c", prefix: "a", target: "" }),
        "c:a=",
      );
    });
  });
});
