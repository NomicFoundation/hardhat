import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

import { resolvePluginList } from "../../src/internal/plugins/resolve-plugin-list.js";
import { HardhatPlugin } from "../../src/types/plugins.js";

describe("Plugins - resolve plugin list", () => {
  it("should return empty on an empty plugin list", () => {
    assert.deepStrictEqual(resolvePluginList([]), []);
  });

  it("should return empty on an undefined plugin list", () => {
    assert.deepStrictEqual(resolvePluginList(), []);
  });

  it("should return a single plugin", () => {
    const plugin: HardhatPlugin = {
      id: "example-plugin",
    };

    assert.deepStrictEqual(resolvePluginList([plugin]), [plugin]);
  });

  it("should support nested dependencies", () => {
    // A -> B -> C
    const c = { id: "c" };
    const b = { id: "b", dependencies: [c] };
    const a = { id: "a", dependencies: [b] };

    assert.deepStrictEqual(resolvePluginList([a]), [c, b, a]);
  });

  it("should break ties by honouring array order", () => {
    // A / B / C
    const c = { id: "c" };
    const b = { id: "b" };
    const a = { id: "a" };

    assert.deepStrictEqual(resolvePluginList([a, b, c]), [a, b, c]);
  });

  it("should break ties by honouring subdependency array order", () => {
    //   A
    //  / \
    // B   C
    const c = { id: "c" };
    const b = { id: "b" };
    const a = { id: "a", dependencies: [b, c] };

    assert.deepStrictEqual(resolvePluginList([a]), [b, c, a]);
  });

  it("should support shared dependencies", () => {
    // A   B
    //  \ /
    //   C
    const c = { id: "c" };
    const b = { id: "b", dependencies: [c] };
    const a = { id: "a", dependencies: [c] };

    assert.deepStrictEqual(resolvePluginList([a, b]), [c, a, b]);
  });

  it("should support shared subdependencies", () => {
    //   A
    //  / \
    // B   C
    //  \ /
    //   D
    const d = { id: "d" };
    const c = { id: "c", dependencies: [d] };
    const b = { id: "b", dependencies: [d] };
    const a = { id: "a", dependencies: [b, c] };

    assert.deepStrictEqual(resolvePluginList([a]), [d, b, c, a]);
  });

  it("should deal with a complicated dependency graph", () => {
    //   A    B
    //  / \  / \ \
    // C   D    E F
    //  \ /     \/
    //   G      H
    //    \    /
    //      I
    const i = { id: "i" };
    const h = { id: "h", dependencies: [i] };
    const g = { id: "g", dependencies: [i] };
    const f = { id: "f", dependencies: [h] };
    const e = { id: "e", dependencies: [h] };
    const d = { id: "d", dependencies: [g] };
    const c = { id: "c", dependencies: [g] };
    const b = { id: "b", dependencies: [d, e, f] };
    const a = { id: "a", dependencies: [c, d] };

    assert.deepStrictEqual(resolvePluginList([a, b]), [
      i,
      g,
      c,
      d,
      a,
      h,
      e,
      f,
      b,
    ]);
  });

  it("should throw a HardhatError on finding different plugins with the same id", () => {
    const a = { id: "dup" };
    const copy = { id: "dup" };

    assert.throws(
      () => resolvePluginList([a, copy]),
      (err) => {
        assert(HardhatError.isHardhatError(err), "Expected a HardhatError");
        assert(
          /Duplicated plugin id "dup" found. Did you install multiple versions of the same plugin\?/.test(
            err.message,
          ),
        );

        return true;
      },
      "Expected a duplicate to be detected",
    );
  });
});
