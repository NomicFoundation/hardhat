import { expect } from "chai";
import { HardhatFoundryError, parseRemappings } from "../src/foundry";

describe("foundry module", function () {
  describe("parseRemappings", function () {
    it("should parse simple remappings", async function () {
      const remappings = parseRemappings("a=b\nb=c\nc=d");

      expect(remappings).to.deep.equal({
        a: "b",
        b: "c",
        c: "d",
      });
    });

    it("should throw if a remapping has a context", async function () {
      expect(() => parseRemappings("a:b=c")).to.throw(
        "Invalid remapping 'a:b=c', remapping contexts are not allowed"
      );
    });

    it("should throw if a remapping doesn't have a target", async function () {
      expect(() => parseRemappings("a")).to.throw(
        "Invalid remapping 'a', remappings without a target are not allowed"
      );
    });

    it("should use the first remapping if more than one has the same prefix", async function () {
      const remappings = parseRemappings("a=b\na=c");

      expect(remappings).to.deep.equal({
        a: "b",
      });
    });

    it("should ignore empty lines", async function () {
      const remappings = parseRemappings("a=b\n\nb=c");

      expect(remappings).to.deep.equal({
        a: "b",
        b: "c",
      });
    });
  });
});
