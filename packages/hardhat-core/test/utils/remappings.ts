import { expect } from "chai";
import { applyRemappings } from "../../src/utils/remappings";

describe("Remappings utils", function () {
  describe("applyRemappings", function () {
    const remappings = {
      foo: "lib/foo",
      foobar: "lib/foo2",
    };

    it("applies a matching remapping", async () => {
      expect(applyRemappings(remappings, "foo/bar.sol")).to.eq(
        "lib/foo/bar.sol"
      );
    });

    it("only applies a matching remapping to prefixes", async () => {
      expect(applyRemappings(remappings, "baz/foo/bar.sol")).to.eq(
        "baz/foo/bar.sol"
      );
    });

    it("applies the longest matching prefix", async () => {
      expect(applyRemappings(remappings, "foobar/bar.sol")).to.eq(
        "lib/foo2/bar.sol"
      );
    });
  });
});
